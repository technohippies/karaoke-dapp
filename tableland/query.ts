#!/usr/bin/env bun
import { Database } from '@tableland/sdk'
import { Wallet, ethers } from 'ethers'
import dotenv from 'dotenv'

dotenv.config({ path: '../.env' })

async function queryTable(query: string, tableName?: string) {
  const provider = new ethers.JsonRpcProvider('https://sepolia.optimism.io')
  const wallet = new Wallet(process.env.PRIVATE_KEY!, provider)
  const db = new Database({ signer: wallet })
  
  const table = tableName || 'karaoke_songs_11155420_11155420_181'
  
  // Replace {table} placeholder with actual table name
  const finalQuery = query.replace(/{table}/g, table)
  
  console.log(`🔍 Query: ${finalQuery}`)
  console.log(`📊 Table: ${table}\n`)
  
  try {
    const result = await db.prepare(finalQuery).all()
    
    if (result.results.length === 0) {
      console.log('No results found.')
      return
    }
    
    console.log(`Found ${result.results.length} result(s):\n`)
    
    // Pretty print results
    result.results.forEach((row: any, index: number) => {
      console.log(`${index + 1}. ${JSON.stringify(row, null, 2)}`)
      console.log()
    })
    
  } catch (error: any) {
    console.error('❌ Query failed:', error.message)
    process.exit(1)
  }
}

// CLI usage
const args = process.argv.slice(2)

if (args.length < 1) {
  console.log('Usage: bun query.ts "<SQL_QUERY>" [tableName]')
  console.log()
  console.log('Use {table} as placeholder for table name in query.')
  console.log()
  console.log('Examples:')
  console.log('  # Get all songs')
  console.log('  bun query.ts "SELECT * FROM {table}"')
  console.log()
  console.log('  # Get specific song')
  console.log('  bun query.ts "SELECT * FROM {table} WHERE id = 1"')
  console.log()
  console.log('  # Get titles and artists')
  console.log('  bun query.ts "SELECT id, title, artist FROM {table}"')
  console.log()
  console.log('  # Use custom table')
  console.log('  bun query.ts "SELECT * FROM {table}" "custom_table_name"')
  process.exit(1)
}

const query = args[0]
const tableName = args[1]

queryTable(query, tableName)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })