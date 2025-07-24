#!/usr/bin/env bun
import { Database } from '@tableland/sdk'
import { Wallet, ethers } from 'ethers'
import { TABLELAND_CONFIG, type NetworkName } from '../../config'
import dotenv from 'dotenv'

dotenv.config({ path: '../../../.env' })

async function queryTable(query: string, network: NetworkName = 'optimism-sepolia', tableName?: string) {
  const networkConfig = TABLELAND_CONFIG.networks[network]
  if (!networkConfig) {
    console.error(`❌ Unknown network: ${network}`)
    console.log('Available networks:', Object.keys(TABLELAND_CONFIG.networks).join(', '))
    process.exit(1)
  }

  const provider = new ethers.JsonRpcProvider(networkConfig.rpcUrl)
  const wallet = new Wallet(process.env.PRIVATE_KEY!, provider)
  const db = new Database({ signer: wallet })
  
  // If no table name provided, try to load from deployments
  let table = tableName
  if (!table) {
    try {
      const deploymentPath = `../../deployments/${network === 'base-mainnet' ? 'mainnet' : 'testnet'}/${network.replace('-', '_')}.json`
      const deployment = require(deploymentPath)
      table = deployment.tables?.songs || deployment.tableName
    } catch {
      console.error(`❌ No table name provided and couldn't load from deployments`)
      process.exit(1)
    }
  }
  
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
  console.log('Usage: bun query.ts "<SQL_QUERY>" [network] [tableName]')
  console.log()
  console.log('Available networks:', Object.keys(TABLELAND_CONFIG.networks).join(', '))
  console.log('Default network: optimism-sepolia')
  console.log()
  console.log('Use {table} as placeholder for table name in query.')
  console.log()
  console.log('Examples:')
  console.log('  # Get all songs (default network)')
  console.log('  bun query.ts "SELECT * FROM {table}"')
  console.log()
  console.log('  # Get songs from mainnet')
  console.log('  bun query.ts "SELECT * FROM {table}" base-mainnet')
  console.log()
  console.log('  # Get specific song')
  console.log('  bun query.ts "SELECT * FROM {table} WHERE id = 1" optimism-sepolia')
  console.log()
  console.log('  # Use custom table on specific network')
  console.log('  bun query.ts "SELECT * FROM {table}" base-mainnet "custom_table_name"')
  process.exit(1)
}

const query = args[0]
let network: NetworkName = 'optimism-sepolia'
let tableName: string | undefined

// Parse arguments
if (args[1]) {
  // Check if second arg is a valid network
  if (args[1] in TABLELAND_CONFIG.networks) {
    network = args[1] as NetworkName
    tableName = args[2]
  } else {
    // Assume it's a table name on default network
    tableName = args[1]
  }
}

console.log(`🌐 Network: ${network}`)

queryTable(query, network, tableName)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })