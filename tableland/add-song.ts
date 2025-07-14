#!/usr/bin/env node
import { Database } from '@tableland/sdk'
import { Wallet, ethers } from 'ethers'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../.env') })

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

async function addSong(songDataPath: string) {
  console.log('🎵 Adding song to Tableland...\n')

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

  // Setup provider and signer - matching your working example
  const provider = new ethers.JsonRpcProvider('https://sepolia.base.org')
  const wallet = new Wallet(process.env.PRIVATE_KEY!, provider)
  const db = new Database({ signer: wallet }) // No baseUrl specified
  
  console.log(`📍 Network: Base Sepolia`)
  console.log(`👤 Signer: ${wallet.address}`)
  console.log()

  // Table name
  const tableName = 'karaoke_songs_84532_160'
  console.log(`📊 Using table: ${tableName}`)
  console.log()

  try {
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
    process.exit(1)
  }
}

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2)
  
  if (args.length === 0) {
    console.log('Usage: bun add-song.ts <path-to-song-data.json>')
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

  addSong(args[0])
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