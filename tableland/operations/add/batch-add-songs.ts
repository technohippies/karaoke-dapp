#!/usr/bin/env bun
import { config } from 'dotenv'
import { readFileSync, existsSync, readdirSync } from 'fs'
import { join, resolve } from 'path'
import { addSong } from './add-song'
import { TABLELAND_CONFIG, type NetworkName } from '../../config'

// Load environment variables - try multiple paths
const result = config({ path: resolve(process.cwd(), '../.env') })
if (result.error) {
  // Try from tableland directory
  config({ path: resolve(process.cwd(), '.env') })
}

async function batchAddSongs(directoryPath: string, network: NetworkName = 'optimism-sepolia', tableName?: string, useLedger: boolean = false, derivationPath?: string) {
  console.log(`🎵 Batch adding songs to Tableland${useLedger ? ' with Ledger' : ''}...\n`)
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

  if (useLedger) {
    console.log('⚠️  IMPORTANT: Each song will require a separate Ledger approval!')
    console.log('Make sure your Ledger is connected and Ethereum app is open.\n')
  }

  let successCount = 0
  let failureCount = 0

  for (const songFile of jsonFiles) {
    console.log(`\n${'='.repeat(60)}`)
    console.log(`Processing: ${songFile}`)
    console.log(`${'='.repeat(60)}\n`)

    try {
      await addSong(songFile, network, tableName, useLedger, derivationPath)
      successCount++
    } catch (error) {
      console.error(`❌ Failed to add song from ${songFile}:`, error)
      failureCount++
      
      // Ask if user wants to continue after failure (only if using Ledger)
      if (useLedger) {
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
  }

  console.log(`\n${'='.repeat(60)}`)
  console.log('📊 Batch processing complete:')
  console.log(`   ✅ Successfully added: ${successCount} songs`)
  console.log(`   ❌ Failed: ${failureCount} songs`)
  console.log(`${'='.repeat(60)}`)
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
    console.log('Usage: bun batch-add-songs.ts <directory-path> [network] [tableName] [--ledger] [--path <derivation-path>]')
    console.log()
    console.log('Available networks:', Object.keys(TABLELAND_CONFIG.networks).join(', '))
    console.log('Default network: optimism-sepolia')
    console.log()
    console.log('Examples:')
    console.log('  bun batch-add-songs.ts ../data/prepared-songs/')
    console.log('  bun batch-add-songs.ts ../data/prepared-songs/ base-mainnet')
    console.log('  bun batch-add-songs.ts ../data/prepared-songs/ base-mainnet karaoke_songs_8453_123')
    console.log('  bun batch-add-songs.ts ../data/prepared-songs/ base-mainnet --ledger')
    console.log('  bun batch-add-songs.ts ../data/prepared-songs/ --ledger  # uses default network with ledger')
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
  
  if (!useLedger && !process.env.PRIVATE_KEY) {
    console.error('❌ PRIVATE_KEY not found in environment variables. Make sure .env file exists and contains PRIVATE_KEY')
    process.exit(1)
  }

  batchAddSongs(directoryPath, network, tableName, useLedger, derivationPath)
    .then(() => {
      console.log('\n✨ Batch processing complete!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('Fatal error:', error)
      process.exit(1)
    })
}