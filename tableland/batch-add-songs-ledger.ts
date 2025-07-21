#!/usr/bin/env bun
import { readdirSync, existsSync } from 'fs'
import { join, resolve } from 'path'
import { addSongWithLedger } from './add-song-ledger'

async function batchAddSongsWithLedger(directoryPath: string) {
  console.log('🎵 Batch adding songs to Tableland with Ledger...\n')
  
  const isProduction = process.env.NODE_ENV === 'production'
  console.log(`Environment: ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'}`)
  console.log(`Network: ${isProduction ? 'Base Mainnet' : 'Base Sepolia'}\n`)

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

  console.log('⚠️  IMPORTANT: Each song will require a separate Ledger approval!')
  console.log('Make sure your Ledger is connected and Ethereum app is open.\n')

  let successCount = 0
  let failureCount = 0

  for (const songFile of jsonFiles) {
    console.log(`\n${'='.repeat(60)}`)
    console.log(`Processing: ${songFile}`)
    console.log(`${'='.repeat(60)}\n`)

    try {
      await addSongWithLedger(songFile)
      successCount++
    } catch (error) {
      console.error(`❌ Failed to add song from ${songFile}:`, error)
      failureCount++
      
      // Ask if user wants to continue after failure
      console.log('\nContinue with remaining songs? (y/n)')
      const response = await new Promise<string>((resolve) => {
        process.stdin.once('data', (data) => {
          resolve(data.toString().trim().toLowerCase())
        })
      })
      
      if (response !== 'y') {
        console.log('Batch processing cancelled by user')
        break
      }
    }
  }

  console.log(`\n${'='.repeat(60)}`)
  console.log('📊 Batch processing complete:')
  console.log(`   ✅ Successfully added: ${successCount} songs`)
  console.log(`   ❌ Failed: ${failureCount} songs`)
  console.log(`${'='.repeat(60)}`)
}

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2)
  
  if (args.length === 0) {
    console.log('Usage: NODE_ENV=production bun run batch-add-songs-ledger.ts <directory-path>')
    console.log()
    console.log('For development:')
    console.log('  bun run batch-add-songs-ledger.ts ../data/tableland-ready/')
    console.log()
    console.log('For production:')
    console.log('  NODE_ENV=production bun run batch-add-songs-ledger.ts ../data/tableland-ready/')
    process.exit(1)
  }

  batchAddSongsWithLedger(args[0])
    .then(() => {
      console.log('\n✨ Batch processing complete!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('Fatal error:', error)
      process.exit(1)
    })
}