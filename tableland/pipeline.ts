#!/usr/bin/env node
import { config } from 'dotenv'
import { Wallet, JsonRpcProvider } from 'ethers'
import { TableManager } from './TableManager'
import { readFileSync, existsSync, writeFileSync } from 'fs'
import { join, resolve } from 'path'

// Load environment variables
config({ path: '../.env' })

interface PipelineOptions {
  songId: number
  encryptionResultPath: string
  metadata?: {
    isrc?: string
    iswc?: string
    title?: string
    artist?: string
    duration?: number
    language?: string
    genius_id?: number
    lrclib_id?: number
    genius_slug?: string
    streaming_links?: Record<string, string>
    artwork_hash?: Record<string, any>
  }
}

/**
 * Complete pipeline: Takes encryption results and adds to Tableland
 */
async function processSong(options: PipelineOptions) {
  console.log('🚀 Processing song through complete pipeline...\n')

  // Load encryption results
  const encryptionPath = resolve(options.encryptionResultPath)
  if (!existsSync(encryptionPath)) {
    throw new Error(`Encryption result not found: ${encryptionPath}`)
  }

  const encryptionResult = JSON.parse(readFileSync(encryptionPath, 'utf-8'))
  
  console.log(`📄 Loaded encryption results from: ${encryptionPath}`)
  console.log(`   MIDI CID: ${encryptionResult.midiCid}`)
  console.log(`   Translations CID: ${encryptionResult.translationsCid}`)
  console.log()

  // Prepare song data for Tableland
  const songData = {
    id: options.songId,
    ...options.metadata,
    stems: {
      piano: encryptionResult.midiCid
    },
    translations: encryptionResult.translationsCid ? {
      encrypted: encryptionResult.translationsCid
    } : undefined
  }

  // Create temporary file for add-song
  const tempPath = `/tmp/song-${options.songId}-${Date.now()}.json`
  writeFileSync(tempPath, JSON.stringify(songData, null, 2))
  console.log(`💾 Created temporary song data at: ${tempPath}`)

  // Setup provider and signer
  const provider = new JsonRpcProvider(process.env.BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org')
  const signer = new Wallet(process.env.PRIVATE_KEY!, provider)

  // Initialize TableManager
  const tableManager = new TableManager(signer, 'base-sepolia')

  // Get songs table name
  const songsTable = tableManager.getTableName('songs')
  if (!songsTable) {
    throw new Error('Songs table not deployed. Run deploy-tables.ts first.')
  }

  // Add to Tableland
  console.log('\n📊 Adding to Tableland...')
  // Use the add-song functionality
  const { addSong } = await import('./add-song')
  await addSong(tempPath)

  // Clean up temp file
  const { unlinkSync } = await import('fs')
  unlinkSync(tempPath)

  console.log('\n✅ Pipeline complete!')
  console.log(`   Song ID: ${options.songId}`)
  console.log(`   Tableland table: ${songsTable}`)
}

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2)
  
  if (args.length < 2) {
    console.log('Usage: npx ts-node pipeline.ts <songId> <encryption-result.json> [metadata.json]')
    console.log()
    console.log('Example:')
    console.log('  npx ts-node pipeline.ts 1 ../data/encrypted-v2/song-1.json ../data/songs-metadata.json')
    process.exit(1)
  }

  const songId = parseInt(args[0])
  const encryptionPath = args[1]
  const metadataPath = args[2]

  let metadata = {}
  if (metadataPath && existsSync(metadataPath)) {
    const allMetadata = JSON.parse(readFileSync(metadataPath, 'utf-8'))
    metadata = allMetadata.find((s: any) => s.id === songId) || {}
  }

  processSong({
    songId,
    encryptionResultPath: encryptionPath,
    metadata
  })
    .then(() => {
      process.exit(0)
    })
    .catch((error) => {
      console.error('Fatal error:', error)
      process.exit(1)
    })
}

export { processSong }