#!/usr/bin/env bun
import { Database } from '@tableland/sdk'
import { Wallet, ethers } from 'ethers'
import HIDTransport from '@ledgerhq/hw-transport-node-hid'
import Eth from '@ledgerhq/hw-app-eth'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'
import { TABLELAND_CONFIG, type NetworkName } from '../../config'
import dotenv from 'dotenv'

// Load environment variables - try multiple paths
const result = dotenv.config({ path: resolve(process.cwd(), '../.env') })
if (result.error) {
  // Try from tableland directory
  dotenv.config({ path: resolve(process.cwd(), '.env') })
}

interface SongData {
  id: number
  isrc: string
  iswc?: string
  title: string
  artist: string
  duration: number
  language?: string
  genius_id?: number
  lrclib_id?: number
  genius_slug?: string
  streaming_links?: Record<string, string>
  stems?: Record<string, string>
  artwork_hash?: Record<string, any>
  translations?: Record<string, string>
}

// Custom Ledger Signer for ethers v6
class LedgerSigner extends ethers.AbstractSigner {
  private eth: Eth
  private path: string
  private _address: string | null = null

  constructor(eth: Eth, path: string, provider?: ethers.Provider) {
    super(provider)
    this.eth = eth
    this.path = path
  }

  async getAddress(): Promise<string> {
    if (!this._address) {
      const { address } = await this.eth.getAddress(this.path)
      this._address = address
    }
    return this._address
  }

  async signTransaction(tx: ethers.TransactionRequest): Promise<string> {
    const populatedTx = await this.populateTransaction(tx)
    
    const unsignedTx = {
      to: populatedTx.to,
      value: populatedTx.value || 0n,
      data: populatedTx.data || '0x',
      chainId: populatedTx.chainId,
      nonce: populatedTx.nonce,
      gasLimit: populatedTx.gasLimit,
      maxFeePerGas: populatedTx.maxFeePerGas,
      maxPriorityFeePerGas: populatedTx.maxPriorityFeePerGas,
      type: 2
    }
    
    console.log('⚡ Please approve the transaction on your Ledger device')
    
    const ethTx = ethers.Transaction.from(unsignedTx)
    const signature = await this.eth.signTransaction(
      this.path,
      ethTx.unsignedSerialized.substring(2),
      null
    )
    
    ethTx.signature = {
      r: '0x' + signature.r,
      s: '0x' + signature.s,
      v: parseInt(signature.v, 16)
    }
    
    return ethTx.serialized
  }

  async signMessage(message: string | Uint8Array): Promise<string> {
    const messageHex = typeof message === 'string' 
      ? Buffer.from(message).toString('hex')
      : Buffer.from(message).toString('hex')
    
    const signature = await this.eth.signPersonalMessage(this.path, messageHex)
    return '0x' + signature.r + signature.s + signature.v
  }

  connect(provider: ethers.Provider): LedgerSigner {
    return new LedgerSigner(this.eth, this.path, provider)
  }
}

async function addSong(songDataPath: string, network: NetworkName = 'optimism-sepolia', tableName?: string, useLedger: boolean = false, derivationPath?: string) {
  console.log(`🎵 Adding song to Tableland${useLedger ? ' with Ledger' : ''}...\n`)

  // Get network config
  const networkConfig = TABLELAND_CONFIG.networks[network]
  if (!networkConfig) {
    throw new Error(`Unknown network: ${network}`)
  }

  // Validate file exists
  const fullPath = resolve(songDataPath)
  if (!existsSync(fullPath)) {
    throw new Error(`Song data file not found: ${fullPath}`)
  }

  // Load song data
  const songData: SongData = JSON.parse(readFileSync(fullPath, 'utf-8'))
  
  console.log(`📄 Loaded song data from: ${fullPath}`)
  console.log(`🎵 Song: ${songData.title} by ${songData.artist} (ID: ${songData.id})`)
  console.log()

  // Setup provider
  const provider = new ethers.JsonRpcProvider(networkConfig.rpcUrl)
  
  let signer: ethers.Signer
  let transport: HIDTransport | null = null
  
  try {
    if (useLedger) {
      // Default Ethereum derivation path if not provided
      const path = derivationPath || "m/44'/60'/0'/0/0"
      console.log(`🔑 Using derivation path: ${path}`)
      
      // Connect to Ledger
      console.log('🔐 Connecting to Ledger...')
      transport = await HIDTransport.create()
      const eth = new Eth(transport)
      
      // Create Ledger signer
      signer = new LedgerSigner(eth, path, provider)
      const address = await signer.getAddress()
      console.log(`✅ Connected to Ledger!`)
      console.log(`👤 Address: ${address}`)
      
      // Check balance
      const balance = await provider.getBalance(address)
      console.log(`💰 Balance: ${ethers.formatEther(balance)} ETH`)
      
      if (balance === 0n) {
        throw new Error('Insufficient balance for transaction')
      }
    } else {
      // Setup private key signer
      if (!process.env.PRIVATE_KEY) {
        throw new Error('PRIVATE_KEY not found in environment variables. Make sure .env file exists and contains PRIVATE_KEY')
      }
      
      const privateKey = process.env.PRIVATE_KEY.startsWith('0x') 
        ? process.env.PRIVATE_KEY
        : `0x${process.env.PRIVATE_KEY}`
      signer = new Wallet(privateKey, provider)
      console.log(`👤 Signer: ${await signer.getAddress()}`)
    }
    
    const db = new Database({ signer })
    
    console.log(`📍 Network: ${network}`)
    console.log()

    // Get table name from parameter or try to load from deployments
    let table = tableName
    if (!table) {
      // Try to get from environment variable first (for compatibility with old ledger script)
      table = process.env.SONGS_TABLE_NAME
      
      if (!table) {
        try {
          const fs = require('fs')
          const path = require('path')
          const deploymentPath = path.resolve(__dirname, `../../deployments/${network.includes('mainnet') ? 'mainnet' : 'testnet'}/${network.replace('-', '_')}.json`)
          const deploymentData = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'))
          table = deploymentData.tables?.songs?.tableName || deploymentData.tableName
          
          if (!table) {
            throw new Error('No songs table found in deployment file')
          }
        } catch (e) {
          throw new Error(`No table name provided and couldn't load from deployments: ${e}`)
        }
      }
    }
    console.log(`📊 Using table: ${table}`)
    console.log()

    const now = Math.floor(Date.now() / 1000)
    
    console.log('Inserting song...')
    const { meta } = await db.prepare(`
      INSERT INTO ${table} (
        id, isrc, iswc, title, artist, duration, stems, language,
        genius_id, lrclib_id, genius_slug, streaming_links, artwork_hash, 
        translations, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      songData.id,
      songData.isrc,
      songData.iswc || null,
      songData.title,
      songData.artist,
      songData.duration,
      songData.stems ? JSON.stringify(songData.stems) : null,
      songData.language || 'en',
      songData.genius_id || null,
      songData.lrclib_id || null,
      songData.genius_slug || null,
      songData.streaming_links ? JSON.stringify(songData.streaming_links) : null,
      songData.artwork_hash ? JSON.stringify(songData.artwork_hash) : null,
      songData.translations ? JSON.stringify(songData.translations) : null,
      now
    ).run()
    
    console.log(`✅ Song added successfully!`)
    console.log(`   Transaction: ${meta.txn?.transactionHash}`)
    
    // Wait for confirmation
    try {
      await meta.txn?.wait()
      console.log(`   ✓ Transaction confirmed`)
    } catch (e) {
      console.log(`   ⚠️ Transaction wait timeout (but likely succeeded)`)
    }

  } catch (error: any) {
    console.error('❌ Failed to add song:', error.message)
    if (useLedger && error.message.includes('Ledger')) {
      console.error('\n💡 Troubleshooting tips:')
      console.error('   - Make sure Ledger is connected and unlocked')
      console.error('   - Ensure Ethereum app is open on the device')
      console.error('   - Enable "Contract data" in Ethereum app settings')
    }
    process.exit(1)
  } finally {
    if (transport) {
      await transport.close()
    }
  }
}

// CLI usage
if (import.meta.url === `file://${process.argv[1]}` || require.main === module) {
  const args = process.argv.slice(2)
  
  // Parse flags
  const ledgerIndex = args.indexOf('--ledger')
  const useLedger = ledgerIndex !== -1
  if (useLedger) {
    args.splice(ledgerIndex, 1)
  }
  
  // Parse derivation path if provided
  const pathIndex = args.indexOf('--path')
  let derivationPath: string | undefined
  if (pathIndex !== -1 && args[pathIndex + 1]) {
    derivationPath = args[pathIndex + 1]
    args.splice(pathIndex, 2)
  }
  
  if (args.length === 0) {
    console.log('Usage: bun add-song.ts <path-to-song-data.json> [network] [tableName] [--ledger] [--path <derivation-path>]')
    console.log()
    console.log('Available networks:', Object.keys(TABLELAND_CONFIG.networks).join(', '))
    console.log('Default network: optimism-sepolia')
    console.log()
    console.log('Examples:')
    console.log('  bun add-song.ts song.json')
    console.log('  bun add-song.ts song.json base-mainnet')
    console.log('  bun add-song.ts song.json base-mainnet karaoke_songs_8453_123')
    console.log('  bun add-song.ts song.json base-mainnet --ledger')
    console.log('  bun add-song.ts song.json --ledger  # uses default network with ledger')
    console.log()
    console.log('Example song data format:')
    console.log(JSON.stringify({
      id: 1,
      isrc: "USXXXXXX",
      title: "Song Title",
      artist: "Artist Name",
      duration: 180,
      stems: {
        piano: "bafkreixxxxxx"
      },
      streaming_links: {
        spotify: "track_id",
        youtube: "video_id"
      }
    }, null, 2))
    process.exit(1)
  }

  const songDataPath = args[0]
  let network: NetworkName = 'optimism-sepolia'
  let tableName: string | undefined

  // Parse optional arguments
  if (args[1]) {
    if (args[1] in TABLELAND_CONFIG.networks) {
      network = args[1] as NetworkName
      tableName = args[2]
    } else {
      // Assume it's a table name on default network
      tableName = args[1]
    }
  }
  
  if (!useLedger && !process.env.PRIVATE_KEY) {
    console.error('❌ PRIVATE_KEY not found in environment variables. Make sure .env file exists and contains PRIVATE_KEY')
    process.exit(1)
  }

  addSong(songDataPath, network, tableName, useLedger, derivationPath)
    .then(() => {
      console.log('\n✨ Done!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('Fatal error:', error)
      process.exit(1)
    })
}

export { addSong }