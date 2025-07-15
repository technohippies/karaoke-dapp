#!/usr/bin/env npx tsx
/**
 * Song Preparation Pipeline for SimpleKaraokeV2
 * 
 * Usage: 
 *   npx tsx src/scripts/prepare-song.ts [songId]
 *   npx tsx src/scripts/prepare-song.ts --all
 * 
 * Flow:
 * 1. Read MIDI file from /midi/songs/
 * 2. Fetch lyrics from lrclib.net
 * 3. Encrypt both with Lit Protocol
 * 4. Upload to IPFS (Pinata)
 * 5. Save CIDs for contract deployment
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { LitNodeClient } from '@lit-protocol/lit-node-client'
import { LitNetwork } from '@lit-protocol/constants'
import { encryptString, encryptFile } from '@lit-protocol/encryption'
import axios from 'axios'
// Remove pinata SDK import - using fetch instead
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: join(dirname(fileURLToPath(import.meta.url)), '..', '.env') })

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = join(__dirname, '..')
const RAW_DATA_DIR = join(PROJECT_ROOT, 'data', 'raw')
const ENCRYPTED_DIR = join(PROJECT_ROOT, 'data', 'encrypted')
const OUTPUT_DIR = join(PROJECT_ROOT, 'data', 'encrypted')
const SONGS_CONFIG = join(PROJECT_ROOT, 'data', 'metadata.json')

// Contract address - MUST match the deployed contract used in the web app
const CONTRACT_ADDRESS = process.env.KARAOKE_CONTRACT
if (!CONTRACT_ADDRESS) {
  throw new Error('KARAOKE_CONTRACT environment variable is required')
}
const CHAIN_ID = 84532 // Base Sepolia

interface Song {
  id: number
  title: string
  artist: string
  isrc: string
  lrclib_id: number
  midiPath: string
  translationsPath: string
  [key: string]: any
}

interface EncryptedSong {
  songId: number
  title: string
  artist: string
  encryptedMidi: {
    cid: string
    encryptedData: any
    accessControlConditions: any
  }
  encryptedLyrics: {
    cid: string
    encryptedData: any
    accessControlConditions: any
  }
  metadata: any
}

// Initialize services
const pinataJWT = process.env.PINATA_JWT!

async function fetchLyrics(lrclibId: number): Promise<string> {
  try {
    const response = await axios.get(`https://lrclib.net/api/get/${lrclibId}`)
    return response.data.syncedLyrics || response.data.plainLyrics || ''
  } catch (error) {
    console.error(`Failed to fetch lyrics for ID ${lrclibId}:`, error)
    return ''
  }
}

async function encryptWithLit(
  litClient: LitNodeClient,
  content: string | Uint8Array,
  songId: number
): Promise<any> {
  // Access control: user must have unlocked this specific song
  // Using evmContractConditions for custom contract method
  const evmContractConditions = [
    {
      contractAddress: CONTRACT_ADDRESS,
      functionName: 'hasUnlockedSong',
      functionParams: [':userAddress', songId.toString()],
      functionAbi: {
        type: 'function',
        name: 'hasUnlockedSong',
        inputs: [
          { name: '', type: 'address', internalType: 'address' },
          { name: '', type: 'uint256', internalType: 'uint256' }
        ],
        outputs: [
          { name: '', type: 'bool', internalType: 'bool' }
        ],
        stateMutability: 'view'
      },
      chain: 'baseSepolia',
      returnValueTest: {
        key: '',  // Empty key for direct boolean return
        comparator: '=',
        value: 'true'
      }
    }
  ]

  let ciphertext: string
  let dataToEncryptHash: string

  if (typeof content === 'string') {
    // Use encryptString for string content
    const result = await encryptString(
      {
        evmContractConditions,
        dataToEncrypt: content,
      },
      litClient
    )
    ciphertext = result.ciphertext
    dataToEncryptHash = result.dataToEncryptHash
  } else {
    // Use encryptFile for binary content (MIDI)
    const file = new File([content], 'data.bin', { type: 'application/octet-stream' })
    const result = await encryptFile(
      {
        evmContractConditions,
        file,
      },
      litClient
    )
    ciphertext = result.ciphertext
    dataToEncryptHash = result.dataToEncryptHash
  }

  return {
    ciphertext,
    dataToEncryptHash,
    evmContractConditions
  }
}

async function uploadToIPFS(data: any, metadata: any): Promise<string> {
  const response = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${pinataJWT}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      pinataContent: data,
      pinataMetadata: metadata
    })
  })
  
  if (!response.ok) {
    throw new Error(`Pinata upload failed: ${response.statusText}`)
  }
  
  const result = await response.json()
  return result.IpfsHash
}

async function prepareSong(songId: number): Promise<EncryptedSong> {
  // Load songs config
  const songs: Song[] = JSON.parse(readFileSync(SONGS_CONFIG, 'utf-8'))
  const song = songs.find(s => s.id === songId)
  
  if (!song) {
    throw new Error(`Song with ID ${songId} not found in config`)
  }

  console.log(`\n🎵 Preparing: ${song.title} by ${song.artist}`)

  // 1. Read MIDI file
  const midiPath = join(RAW_DATA_DIR, song.midiPath)
  if (!existsSync(midiPath)) {
    throw new Error(`MIDI file not found: ${midiPath}`)
  }
  const midiData = readFileSync(midiPath)
  console.log(`✓ Loaded MIDI file (${midiData.length} bytes)`)

  // 2. Load translations
  const translations: Record<string, any> = {}
  const translationsDir = join(RAW_DATA_DIR, song.translationsPath)
  
  // Read all translation files
  const translationFiles = ['zh', 'ug', 'bo']
  for (const lang of translationFiles) {
    const translationPath = join(translationsDir, `translation-${lang}.json`)
    if (existsSync(translationPath)) {
      const translationData = JSON.parse(readFileSync(translationPath, 'utf-8'))
      translations[lang] = translationData
      console.log(`✓ Loaded ${lang} translation`)
    }
  }

  // Also fetch original lyrics from lrclib
  console.log(`📝 Fetching original lyrics from lrclib.net...`)
  const originalLyrics = await fetchLyrics(song.lrclib_id)
  if (originalLyrics) {
    translations['en'] = { syncedLyrics: originalLyrics }
    console.log(`✓ Fetched original lyrics (${originalLyrics.length} chars)`)
  }

  // 3. Initialize Lit Protocol
  console.log(`🔐 Initializing Lit Protocol...`)
  const litClient = new LitNodeClient({
    litNetwork: 'datil-dev' as any,
    debug: false
  })
  await litClient.connect()
  console.log(`✓ Connected to Lit Network`)

  // 4. Encrypt content
  console.log(`🔒 Encrypting MIDI...`)
  const encryptedMidi = await encryptWithLit(litClient, midiData, songId)
  
  console.log(`🔒 Encrypting translations...`)
  const encryptedTranslations = await encryptWithLit(litClient, JSON.stringify(translations), songId)

  await litClient.disconnect()

  // 5. Upload to IPFS
  console.log(`📤 Uploading encrypted MIDI to IPFS...`)
  const midiCid = await uploadToIPFS(encryptedMidi, {
    name: `${song.isrc}-midi-encrypted`,
    songId: songId
  })
  console.log(`✓ MIDI CID: ${midiCid}`)

  console.log(`📤 Uploading encrypted translations to IPFS...`)
  const translationsCid = await uploadToIPFS(encryptedTranslations, {
    name: `${song.isrc}-translations-encrypted`,
    songId: songId
  })
  console.log(`✓ Translations CID: ${translationsCid}`)

  // 6. Prepare result
  const result: EncryptedSong = {
    songId: songId,
    title: song.title,
    artist: song.artist,
    encryptedMidi: {
      cid: midiCid,
      ...encryptedMidi
    },
    encryptedLyrics: {
      cid: translationsCid,
      ...encryptedTranslations
    },
    metadata: {
      isrc: song.isrc,
      duration: song.duration,
      preparedAt: new Date().toISOString(),
      contractAddress: CONTRACT_ADDRESS,
      chainId: CHAIN_ID
    }
  }

  return result
}

async function main() {
  const args = process.argv.slice(2)
  
  if (!process.env.PINATA_JWT) {
    console.error('❌ Missing PINATA_JWT in .env')
    process.exit(1)
  }

  console.log(`📝 Using contract address: ${CONTRACT_ADDRESS}`)

  // Ensure output directory exists
  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true })
  }

  try {
    if (args[0] === '--all') {
      // Process all songs
      const songs: Song[] = JSON.parse(readFileSync(SONGS_CONFIG, 'utf-8'))
      const results: EncryptedSong[] = []
      
      for (const song of songs) {
        try {
          const result = await prepareSong(song.id)
          results.push(result)
          
          // Save individual result
          const outputPath = join(OUTPUT_DIR, `song-${song.id}.json`)
          writeFileSync(outputPath, JSON.stringify(result, null, 2))
          console.log(`✓ Saved to ${outputPath}`)
        } catch (error) {
          console.error(`❌ Failed to prepare song ${song.id}:`, error)
        }
      }
      
      // Save summary
      const summaryPath = join(OUTPUT_DIR, 'prepared-songs.json')
      writeFileSync(summaryPath, JSON.stringify(results, null, 2))
      console.log(`\n✅ Prepared ${results.length} songs`)
      console.log(`📁 Summary saved to ${summaryPath}`)
      
    } else if (args[0]) {
      // Process single song
      const songId = parseInt(args[0])
      const result = await prepareSong(songId)
      
      const outputPath = join(OUTPUT_DIR, `song-${songId}.json`)
      writeFileSync(outputPath, JSON.stringify(result, null, 2))
      
      console.log(`\n✅ Song prepared successfully!`)
      console.log(`📁 Saved to ${outputPath}`)
      console.log(`\n🔗 To deploy to contract:`)
      console.log(`   setSongMetadata(${songId}, "${result.encryptedMidi.cid}", "${result.encryptedLyrics.cid}")`)
      
    } else {
      console.log('Usage:')
      console.log('  Prepare single song: npx tsx src/scripts/prepare-song.ts [songId]')
      console.log('  Prepare all songs:   npx tsx src/scripts/prepare-song.ts --all')
    }
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}