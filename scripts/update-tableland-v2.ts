#!/usr/bin/env npx tsx
/**
 * Update Tableland with V2 encrypted song data
 * 
 * Usage: npx tsx src/scripts/update-tableland-v2.ts
 */

import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { Database } from '@tableland/sdk'
import { Wallet } from 'ethers'
import dotenv from 'dotenv'

dotenv.config()

const __dirname = dirname(fileURLToPath(import.meta.url))
const PREPARED_SONGS = join(__dirname, '..', 'data', 'encrypted', 'prepared-songs.json')
const SONGS_CONFIG = join(__dirname, '..', 'data', 'metadata.json')

// Configure your table name here
const TABLE_NAME = process.env.SONGS_TABLE_NAME || 'karaoke_songs_11155420_11155420_181'

async function updateTableland() {
  if (!process.env.PRIVATE_KEY) {
    throw new Error('Missing PRIVATE_KEY in .env')
  }

  // Initialize database
  const wallet = new Wallet(process.env.PRIVATE_KEY)
  const db = new Database({ signer: wallet })

  // Load prepared songs
  const preparedSongs = JSON.parse(readFileSync(PREPARED_SONGS, 'utf-8'))
  const songsConfig = JSON.parse(readFileSync(SONGS_CONFIG, 'utf-8'))

  console.log(`📊 Updating Tableland table: ${TABLE_NAME}`)

  for (const prepared of preparedSongs) {
    const config = songsConfig.find((s: any) => s.id === prepared.songId)
    if (!config) continue

    // Prepare stems JSON with encrypted MIDI CID
    const stems = {
      piano: prepared.encryptedMidi.cid
    }

    // All translations are encrypted together in one file
    const translations = {
      zh: prepared.encryptedLyrics.cid,
      ug: prepared.encryptedLyrics.cid,
      bo: prepared.encryptedLyrics.cid
    }

    const sql = `
      INSERT OR REPLACE INTO ${TABLE_NAME} (
        id, isrc, iswc, title, artist, duration,
        stems, language, genius_id, lrclib_id,
        genius_slug, streaming_links, translations
      ) VALUES (
        ${config.id},
        '${config.isrc}',
        '${config.iswc || ''}',
        '${config.title.replace(/'/g, "''")}',
        '${config.artist.replace(/'/g, "''")}',
        ${config.duration},
        '${JSON.stringify(stems)}',
        '${config.language}',
        ${config.genius_id},
        ${config.lrclib_id},
        '${config.genius_slug}',
        '${JSON.stringify(config.streaming_links)}',
        '${JSON.stringify(translations)}'
      )
    `

    try {
      const { meta } = await db.prepare(sql).run()
      console.log(`✓ Updated song ${config.id}: ${config.title} (tx: ${meta.txn?.transactionHash})`)
    } catch (error) {
      console.error(`❌ Failed to update song ${config.id}:`, error)
    }
  }

  console.log('\n✅ Tableland update complete!')
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  updateTableland().catch(console.error)
}