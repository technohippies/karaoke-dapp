#!/usr/bin/env bun
import { Database } from '@tableland/sdk'
import { ethers } from 'ethers'
import HIDTransport from '@ledgerhq/hw-transport-node-hid'
import Eth from '@ledgerhq/hw-app-eth'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'
import dotenv from 'dotenv'

// Load environment based on NODE_ENV
const envFile = process.env.NODE_ENV === 'production' ? '../.env.production' : '../.env.local'
dotenv.config({ path: resolve(__dirname, envFile) })

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

async function addSongWithLedger(songDataPath: string) {
  console.log('🎵 Adding song to Tableland with Ledger...\n')

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

  // Setup provider based on environment
  const isProduction = process.env.NODE_ENV === 'production'
  const rpcUrl = isProduction 
    ? process.env.BASE_MAINNET_RPC_URL || 'https://mainnet.base.org'
    : 'https://sepolia.base.org'
  
  const provider = new ethers.JsonRpcProvider(rpcUrl)
  console.log(`📍 Network: ${isProduction ? 'Base Mainnet' : 'Base Sepolia'}`)

  let transport: HIDTransport | null = null
  
  try {
    // Connect to Ledger
    console.log('🔐 Connecting to Ledger...')
    transport = await HIDTransport.create()
    const eth = new Eth(transport)
    
    // Create Ledger signer
    const ledgerSigner = new LedgerSigner(eth, "m/44'/60'/0'/0/0", provider)
    const address = await ledgerSigner.getAddress()
    console.log(`✅ Connected to Ledger!`)
    console.log(`👤 Address: ${address}`)
    
    // Check balance
    const balance = await provider.getBalance(address)
    console.log(`💰 Balance: ${ethers.formatEther(balance)} ETH`)
    
    if (balance === 0n) {
      throw new Error('Insufficient balance for transaction')
    }
    
    // Create database instance
    const db = new Database({ signer: ledgerSigner })
    
    // Get table name from environment
    const tableName = process.env.SONGS_TABLE_NAME
    if (!tableName) {
      throw new Error('SONGS_TABLE_NAME not set in environment')
    }
    
    console.log(`📊 Using table: ${tableName}`)
    console.log()

    const now = Math.floor(Date.now() / 1000)
    
    console.log('Inserting song...')
    const { meta } = await db.prepare(`
      INSERT INTO ${tableName} (
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
    if (error.message.includes('Ledger')) {
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
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2)
  
  if (args.length === 0) {
    console.log('Usage: NODE_ENV=production bun run add-song-ledger.ts <path-to-song-data.json>')
    console.log()
    console.log('For development:')
    console.log('  bun run add-song-ledger.ts song.json')
    console.log()
    console.log('For production:')
    console.log('  NODE_ENV=production bun run add-song-ledger.ts song.json')
    process.exit(1)
  }

  addSongWithLedger(args[0])
    .then(() => {
      console.log('\n✨ Done!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('Fatal error:', error)
      process.exit(1)
    })
}

export { addSongWithLedger }