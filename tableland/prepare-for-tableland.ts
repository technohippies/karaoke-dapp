#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join, resolve } from 'path'

const DATA_DIR = resolve('../data')
const METADATA_FILE = join(DATA_DIR, 'metadata.json')
const ENCRYPTED_DIR = join(DATA_DIR, 'encrypted')
const OUTPUT_DIR = join(DATA_DIR, 'tableland-ready')

// Example CIDs - in production these would come from the actual data
const SAMPLE_STEMS = {
  1: { piano: 'bafkreigeqagpjdguf62urlljficfgc4thu3djxicjze34wyuyhins56d4i' },
  2: { piano: 'bafkreih52fqtmu2cny7arnw3uwljilpixii6iqefqr4d7k7sm3zksfl5ii' }
}

const SAMPLE_ARTWORK = {
  1: {
    id: '04eaa177af6d7ce3e549241bf1cc0b16',
    ext: 'png',
    sizes: {t: '300x300x1', f: '1000x1000x1'}
  },
  2: {
    id: 'ca44cb452ad50cf3e47a1c3ad30ebb15',
    ext: 'jpg',
    sizes: {t: '300x300x1', f: '600x600x1'}
  }
}

const SAMPLE_TRANSLATIONS = {
  1: {
    zh: 'bafkreiadpdwpuxmazk36aixyj57cds5vwo6vyjjyajwstobfky3w66hs4y',
    ug: 'bafkreie5664aiz2ybg3br6ebpjgolgysahkpk6trqo3g3rtawe7dw7vsmu',
    bo: 'bafkreiaz7z5f6e23esp6yuf6ytw6426nmtneue4wkjybq2zrsdyuzokjim'
  },
  2: {
    zh: 'bafkreihcts6upz7uobtwgb5ec5ego2hkkxj5qiwlt4nixfaezyzst7speq',
    ug: 'bafkreiamii3xsvobyblc2nyk4rlujg72odd656rjra265w6hyieocbmkta',
    bo: 'bafkreignt447xiip64yvv4dx3qn2fnjqrwlyxpm62iqb4hqr62xlran3ue'
  }
}

function prepareForTableland() {
  console.log('🔄 Preparing data for Tableland...\n')

  // Load metadata
  if (!existsSync(METADATA_FILE)) {
    throw new Error(`Metadata file not found: ${METADATA_FILE}`)
  }
  const metadata = JSON.parse(readFileSync(METADATA_FILE, 'utf-8'))

  // Create output directory
  const fs = require('fs')
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true })
  }

  // Process each song
  for (const song of metadata) {
    console.log(`Processing: ${song.title} by ${song.artist}`)

    // Check for encrypted data
    const encryptedFile = join(ENCRYPTED_DIR, `song-${song.id}.json`)
    let encryptedData = null
    
    if (existsSync(encryptedFile)) {
      encryptedData = JSON.parse(readFileSync(encryptedFile, 'utf-8'))
      console.log(`  ✓ Found encrypted data`)
    }

    // Prepare Tableland-ready data
    const tablelandData = {
      id: song.id,
      isrc: song.isrc,
      iswc: song.iswc || null,
      title: song.title,
      artist: song.artist,
      duration: song.duration,
      language: song.language || 'en',
      genius_id: song.genius_id || null,
      lrclib_id: song.lrclib_id || null,
      genius_slug: song.genius_slug || null,
      streaming_links: song.streaming_links || {},
      
      // Use sample data for now - in production this would come from encrypted data
      stems: SAMPLE_STEMS[song.id] || {},
      artwork_hash: SAMPLE_ARTWORK[song.id] || null,
      translations: SAMPLE_TRANSLATIONS[song.id] || {}
    }

    // If we have encrypted data, extract the CIDs
    if (encryptedData) {
      if (encryptedData.encryptedMidi?.cid) {
        console.log(`  ✓ MIDI CID: ${encryptedData.encryptedMidi.cid}`)
        // In production, you'd map this to the correct stem format
      }
      if (encryptedData.encryptedTranslations?.cid) {
        console.log(`  ✓ Translations CID: ${encryptedData.encryptedTranslations.cid}`)
        // In production, you'd use this for the translations field
      }
    }

    // Save prepared data
    const outputFile = join(OUTPUT_DIR, `song-${song.id}.json`)
    writeFileSync(outputFile, JSON.stringify(tablelandData, null, 2))
    console.log(`  ✓ Saved to: ${outputFile}`)
    console.log()
  }

  console.log(`✅ Prepared ${metadata.length} songs for Tableland`)
  console.log(`📁 Output directory: ${OUTPUT_DIR}`)
}

// Run if called directly
if (require.main === module) {
  try {
    prepareForTableland()
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}