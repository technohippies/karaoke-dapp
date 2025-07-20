#!/usr/bin/env bun
import { Database } from '@tableland/sdk'
import { Wallet, ethers } from 'ethers'
import { TABLELAND_CONFIG, type TableName, type NetworkName } from './config.js'
import dotenv from 'dotenv'

dotenv.config({ path: '../.env' })

async function deployTable(tableName: TableName, network: NetworkName) {
  const config = TABLELAND_CONFIG.networks[network]
  const schema = TABLELAND_CONFIG.schemas[tableName]
  
  console.log(`🚀 Deploying ${tableName} table on ${network}...`)
  console.log(`📍 Chain ID: ${config.chainId}`)
  console.log(`🌐 RPC: ${config.rpcUrl}`)
  
  // Setup provider and signer
  const provider = new ethers.JsonRpcProvider(config.rpcUrl)
  const wallet = new Wallet(process.env.PRIVATE_KEY!, provider)
  
  // Create database config
  const dbConfig: any = { signer: wallet }
  
  // For Base mainnet, explicitly set the registry contract
  if (network === 'base-mainnet') {
    dbConfig.baseUrl = config.tablelandHost
    dbConfig.contract = '0x8268F7Aba0E152B3A853e8CB4Ab9795Ec66c2b6B'
  }
  
  const db = new Database(dbConfig)
  
  console.log(`👤 Signer: ${wallet.address}`)
  
  try {
    // Create table
    const { meta } = await db
      .prepare(`CREATE TABLE ${schema.prefix}_${config.chainId} ${schema.schema}`)
      .run()
    
    console.log(`✅ Table created!`)
    console.log(`📊 Table Name: ${meta.txn?.name}`)
    console.log(`🔗 Transaction: ${meta.txn?.transactionHash}`)
    
    // Wait for confirmation
    try {
      await meta.txn?.wait()
      console.log(`✅ Transaction confirmed!`)
    } catch (e) {
      console.log(`⚠️ Transaction wait timeout (but likely succeeded)`)
    }
    
    // Save deployment info
    const deploymentInfo = {
      network,
      chainId: config.chainId,
      tableName: meta.txn?.name,
      transactionHash: meta.txn?.transactionHash,
      deployedAt: new Date().toISOString(),
      schema: schema.schema
    }
    
    console.log(`\n📝 Deployment Summary:`)
    console.log(JSON.stringify(deploymentInfo, null, 2))
    
  } catch (error: any) {
    console.error(`❌ Deployment failed:`, error.message)
    process.exit(1)
  }
}

// CLI usage
const args = process.argv.slice(2)
if (args.length < 2) {
  console.error('Usage: bun run deploy-table.ts <table-name> <network>')
  console.error('Tables:', Object.keys(TABLELAND_CONFIG.schemas).join(', '))
  console.error('Networks:', Object.keys(TABLELAND_CONFIG.networks).join(', '))
  process.exit(1)
}

const tableName = args[0] as TableName
const network = args[1] as NetworkName

if (!TABLELAND_CONFIG.schemas[tableName]) {
  console.error(`❌ Unknown table: ${tableName}`)
  process.exit(1)
}

if (!TABLELAND_CONFIG.networks[network]) {
  console.error(`❌ Unknown network: ${network}`)
  process.exit(1)
}

deployTable(tableName, network)
  .then(() => {
    console.log('✨ Deployment complete!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })