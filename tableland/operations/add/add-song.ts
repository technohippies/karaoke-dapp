#!/usr/bin/env node
import { Database } from '@tableland/sdk'
import { Wallet, ethers } from 'ethers'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'
import { TABLELAND_CONFIG, type NetworkName } from '../../config'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../../../.env') })

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

async function addSong(songDataPath: string, network: NetworkName = 'optimism-sepolia', tableName?: string) {
  console.log('🎵 Adding song to Tableland...\n')

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

  // Setup provider and signer
  const provider = new ethers.JsonRpcProvider(networkConfig.rpcUrl)
  const wallet = new Wallet(process.env.PRIVATE_KEY!, provider)
  const db = new Database({ signer: wallet })
  
  console.log(`📍 Network: ${network}`)
  console.log(`👤 Signer: ${wallet.address}`)
  console.log()

  // Get table name from parameter or try to load from deployments
  let table = tableName
  if (!table) {
    try {
      const deploymentPath = `../../deployments/${network.includes('mainnet') ? 'mainnet' : 'testnet'}/${network.replace('-', '_')}.json`
      const deployment = require(deploymentPath)
      table = deployment.tables?.songs || deployment.tableName
    } catch {
      throw new Error('No table name provided and couldn\'t load from deployments')
    }
  }
  console.log(`📊 Using table: ${table}`)
  console.log()

  try {
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
    process.exit(1)
  }
}

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2)
  
  if (args.length === 0) {
    console.log('Usage: bun add-song.ts <path-to-song-data.json> [network] [tableName]')
    console.log()
    console.log('Available networks:', Object.keys(TABLELAND_CONFIG.networks).join(', '))
    console.log('Default network: optimism-sepolia')
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

  addSong(songDataPath, network, tableName)
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