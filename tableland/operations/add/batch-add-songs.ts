#!/usr/bin/env node
import { config } from 'dotenv'
import { readFileSync, existsSync, readdirSync } from 'fs'
import { join, resolve } from 'path'
import { addSong } from './add-song'
import { TABLELAND_CONFIG, type NetworkName } from '../../config'

// Load environment variables
config({ path: '../../../.env' })

async function batchAddSongs(directoryPath: string, network: NetworkName = 'optimism-sepolia', tableName?: string) {
  console.log('🎵 Batch adding songs to Tableland...\n')
  console.log(`📍 Network: ${network}`)

  // Validate directory exists
  const fullPath = resolve(directoryPath)
  if (!existsSync(fullPath)) {
    throw new Error(`Directory not found: ${fullPath}`)
  }

  // Find all JSON files in directory
  const jsonFiles = readdirSync(fullPath)
    .filter(file => file.endsWith('.json'))
    .map(file => join(fullPath, file))
    .sort()

  if (jsonFiles.length === 0) {
    console.log('No JSON files found in directory')
    return
  }

  console.log(`Found ${jsonFiles.length} song files to process:`)
  jsonFiles.forEach(file => console.log(`  - ${file}`))
  console.log()

  let successCount = 0
  let failureCount = 0

  for (const songFile of jsonFiles) {
    console.log(`\n${'='.repeat(60)}`)
    console.log(`Processing: ${songFile}`)
    console.log(`${'='.repeat(60)}\n`)

    try {
      await addSong(songFile, network, tableName)
      successCount++
    } catch (error) {
      console.error(`❌ Failed to add song from ${songFile}:`, error)
      failureCount++
    }
  }

  console.log(`\n${'='.repeat(60)}`)
  console.log('📊 Batch processing complete:')
  console.log(`   ✅ Successfully added: ${successCount} songs`)
  console.log(`   ❌ Failed: ${failureCount} songs`)
  console.log(`${'='.repeat(60)}`)
}

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2)
  
  if (args.length === 0) {
    console.log('Usage: bun batch-add-songs.ts <directory-path> [network] [tableName]')
    console.log()
    console.log('Available networks:', Object.keys(TABLELAND_CONFIG.networks).join(', '))
    console.log('Default network: optimism-sepolia')
    console.log()
    console.log('Example:')
    console.log('  bun batch-add-songs.ts ../data/prepared-songs/')
    console.log('  bun batch-add-songs.ts ../data/prepared-songs/ base-mainnet')
    process.exit(1)
  }

  const directoryPath = args[0]
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

  batchAddSongs(directoryPath, network, tableName)
    .then(() => {
      console.log('\n✨ Batch processing complete!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('Fatal error:', error)
      process.exit(1)
    })
}