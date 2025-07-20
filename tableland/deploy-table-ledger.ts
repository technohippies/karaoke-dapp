#!/usr/bin/env bun
import { Database } from '@tableland/sdk'
import { ethers } from 'ethers'
import { LedgerSigner } from '@ethersproject/hardware-wallets'
import { TABLELAND_CONFIG, type TableName, type NetworkName } from './config.js'
import dotenv from 'dotenv'

dotenv.config({ path: '../.env' })

async function deployTableWithLedger(tableName: TableName, network: NetworkName, derivationPath?: string) {
  const config = TABLELAND_CONFIG.networks[network]
  const schema = TABLELAND_CONFIG.schemas[tableName]
  
  console.log(`🚀 Deploying ${tableName} table on ${network} using Ledger...`)
  console.log(`📍 Chain ID: ${config.chainId}`)
  console.log(`🌐 RPC: ${config.rpcUrl}`)
  
  // Setup provider
  const provider = new ethers.JsonRpcProvider(config.rpcUrl)
  
  try {
    // Default Ethereum derivation path if not provided
    const path = derivationPath || "m/44'/60'/0'/0/0"
    console.log(`🔑 Using derivation path: ${path}`)
    
    // Create Ledger signer
    console.log(`\n⚡ Connecting to Ledger...`)
    
    const ledgerSigner = new LedgerSigner(provider, undefined, path)
    const address = await ledgerSigner.getAddress()
    console.log(`✅ Connected to Ledger!`)
    console.log(`👤 Address: ${address}`)
    
    // Check balance
    const balance = await provider.getBalance(address)
    console.log(`💰 Balance: ${ethers.formatEther(balance)} ETH`)
    
    if (balance === 0n) {
      throw new Error('Insufficient balance for deployment')
    }
    
    // Create database instance with Ledger signer and explicit Base config
    const dbConfig: any = { signer: ledgerSigner }
    
    // For Base mainnet, explicitly set the registry contract
    if (network === 'base-mainnet') {
      dbConfig.baseUrl = config.tablelandHost
      dbConfig.contract = '0x8268F7Aba0E152B3A853e8CB4Ab9795Ec66c2b6B'
    }
    
    const db = new Database(dbConfig)
    
    console.log(`\n📝 Creating table...`)
    console.log(`⚡ Please approve the transaction on your Ledger device`)
    
    // Create table
    const { meta } = await db
      .prepare(`CREATE TABLE ${schema.prefix}_${config.chainId} ${schema.schema}`)
      .run()
    
    console.log(`✅ Transaction sent!`)
    console.log(`📊 Table Name: ${meta.txn?.name}`)
    console.log(`🔗 Transaction: ${meta.txn?.transactionHash}`)
    
    // Wait for confirmation
    console.log(`\n⏳ Waiting for confirmation...`)
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
      deployedBy: address,
      schema: schema.schema
    }
    
    // Save to deployments file
    const fs = await import('fs')
    const pathModule = await import('path')
    const deploymentsDir = pathModule.join(import.meta.dir, 'deployments')
    
    if (!fs.existsSync(deploymentsDir)) {
      fs.mkdirSync(deploymentsDir, { recursive: true })
    }
    
    const deploymentFile = pathModule.join(deploymentsDir, `${network}.json`)
    let deployments = {}
    
    if (fs.existsSync(deploymentFile)) {
      deployments = JSON.parse(fs.readFileSync(deploymentFile, 'utf8'))
    }
    
    deployments[tableName] = deploymentInfo
    fs.writeFileSync(deploymentFile, JSON.stringify(deployments, null, 2))
    
    console.log(`\n📝 Deployment Summary:`)
    console.log(JSON.stringify(deploymentInfo, null, 2))
    
  } catch (error: any) {
    console.error(`\n❌ Deployment failed:`, error.message)
    if (error.message.includes('Ledger')) {
      console.error(`\n💡 Troubleshooting tips:`)
      console.error(`   - Make sure Ledger is connected and unlocked`)
      console.error(`   - Ensure Ethereum app is open on the device`)
      console.error(`   - Enable "Contract data" in Ethereum app settings`)
      console.error(`   - Try a different USB port or cable`)
    }
    process.exit(1)
  }
}

// CLI usage
const args = process.argv.slice(2)
if (args.length < 2) {
  console.error('Usage: bun run deploy-table-ledger.ts <table-name> <network> [derivation-path]')
  console.error('Tables:', Object.keys(TABLELAND_CONFIG.schemas).join(', '))
  console.error('Networks:', Object.keys(TABLELAND_CONFIG.networks).join(', '))
  console.error('Example: bun run deploy-table-ledger.ts songs base-mainnet')
  console.error('Example with custom path: bun run deploy-table-ledger.ts songs base-mainnet "m/44\'/60\'/0\'/0/1"')
  process.exit(1)
}

const tableName = args[0] as TableName
const network = args[1] as NetworkName
const derivationPath = args[2]

if (!TABLELAND_CONFIG.schemas[tableName]) {
  console.error(`❌ Unknown table: ${tableName}`)
  console.error('Available tables:', Object.keys(TABLELAND_CONFIG.schemas).join(', '))
  process.exit(1)
}

if (!TABLELAND_CONFIG.networks[network]) {
  console.error(`❌ Unknown network: ${network}`)
  console.error('Available networks:', Object.keys(TABLELAND_CONFIG.networks).join(', '))
  process.exit(1)
}

// Warn if not mainnet
if (!network.includes('mainnet')) {
  console.warn(`\n⚠️  Warning: You're deploying to ${network} (testnet) with a hardware wallet.`)
  console.warn(`   Consider using the regular deploy-table.ts script for testnets.`)
}

deployTableWithLedger(tableName, network, derivationPath)
  .then(() => {
    console.log('\n✨ Deployment complete!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })