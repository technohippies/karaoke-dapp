#!/usr/bin/env node
import { config } from 'dotenv'
import { Wallet, JsonRpcProvider } from 'ethers'
import { TableManager } from '../../core/TableManager'

// Load environment variables
config({ path: '../.env' })

async function deployTables() {
  console.log('🚀 Deploying Tableland tables...\n')

  // Validate environment
  if (!process.env.PRIVATE_KEY) {
    throw new Error('Missing PRIVATE_KEY in .env')
  }

  // Setup provider and signer
  const provider = new JsonRpcProvider(process.env.BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org')
  const signer = new Wallet(process.env.PRIVATE_KEY, provider)
  
  console.log(`📍 Network: Base Sepolia`)
  console.log(`👤 Deployer: ${signer.address}`)
  console.log()

  // Initialize TableManager
  const tableManager = new TableManager(signer, 'base-sepolia')

  try {
    // Deploy songs table
    console.log('📊 Deploying songs table...')
    const songsTable = await tableManager.createTable('songs')
    console.log(`✅ Songs table: ${songsTable}`)
    console.log()

    // Deploy user history table  
    console.log('📊 Deploying user history table...')
    const historyTable = await tableManager.createTable('user_history')
    console.log(`✅ User history table: ${historyTable}`)
    console.log()

    // Display all deployments
    console.log('📋 All deployments:')
    const deployments = tableManager.getDeployments()
    console.log(JSON.stringify(deployments, null, 2))

  } catch (error) {
    console.error('❌ Deployment failed:', error)
    process.exit(1)
  }
}

// Run deployment
deployTables()
  .then(() => {
    console.log('\n✨ Table deployment complete!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })