#!/usr/bin/env bun
import { Database } from '@tableland/sdk'
import { ethers } from 'ethers'
import HIDTransport from '@ledgerhq/hw-transport-node-hid'
import Eth from '@ledgerhq/hw-app-eth'
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
    
    // Connect to Ledger
    console.log(`\n⚡ Connecting to Ledger...`)
    const transport = await HIDTransport.create()
    const eth = new Eth(transport)
    
    // Get address
    const { address } = await eth.getAddress(path)
    console.log(`✅ Connected to Ledger!`)
    console.log(`👤 Address: ${address}`)
    
    // Check balance
    const balance = await provider.getBalance(address)
    console.log(`💰 Balance: ${ethers.formatEther(balance)} ETH`)
    
    if (balance === 0n) {
      throw new Error('Insufficient balance for deployment')
    }
    
    // Create a custom signer that works with Ledger
    const ledgerSigner = {
      getAddress: async () => address,
      signTransaction: async (tx: any) => {
        console.log(`\n⚡ Please approve the transaction on your Ledger device`)
        
        // Prepare transaction for Ledger
        const unsignedTx = {
          to: tx.to,
          value: tx.value ? ethers.toBeHex(tx.value) : '0x00',
          data: tx.data || '0x',
          chainId: config.chainId,
          nonce: await provider.getTransactionCount(address),
          gasLimit: tx.gasLimit || '0x100000', // Default gas limit
          maxFeePerGas: tx.maxFeePerGas || (await provider.getFeeData()).maxFeePerGas,
          maxPriorityFeePerGas: tx.maxPriorityFeePerGas || (await provider.getFeeData()).maxPriorityFeePerGas,
        }
        
        // Sign with Ledger
        const signature = await eth.signTransaction(path, ethers.Transaction.from(unsignedTx).unsignedSerialized.substring(2))
        
        // Combine transaction with signature
        const signedTx = ethers.Transaction.from({
          ...unsignedTx,
          signature: {
            r: '0x' + signature.r,
            s: '0x' + signature.s,
            v: parseInt(signature.v, 16)
          }
        })
        
        return signedTx.serialized
      },
      signMessage: async (message: string) => {
        const signature = await eth.signPersonalMessage(path, Buffer.from(message).toString('hex'))
        return signature.r + signature.s + signature.v
      },
      provider,
      connect: (provider: any) => ledgerSigner
    }
    
    // Create database instance
    const dbConfig: any = { signer: ledgerSigner }
    
    // For Base mainnet, explicitly set the registry contract
    if (network === 'base-mainnet') {
      dbConfig.baseUrl = config.tablelandHost
      dbConfig.contract = '0x8268F7Aba0E152B3A853e8CB4Ab9795Ec66c2b6B'
    }
    
    const db = new Database(dbConfig)
    
    console.log(`\n📝 Creating table...`)
    
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
    
    // Close transport
    await transport.close()
    
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
  console.error('Usage: bun run deploy-table-ledger-v2.ts <table-name> <network> [derivation-path]')
  console.error('Tables:', Object.keys(TABLELAND_CONFIG.schemas).join(', '))
  console.error('Networks:', Object.keys(TABLELAND_CONFIG.networks).join(', '))
  console.error('Example: bun run deploy-table-ledger-v2.ts songs base-mainnet')
  process.exit(1)
}

const tableName = args[0] as TableName
const network = args[1] as NetworkName
const derivationPath = args[2]

if (!TABLELAND_CONFIG.schemas[tableName]) {
  console.error(`❌ Unknown table: ${tableName}`)
  process.exit(1)
}

if (!TABLELAND_CONFIG.networks[network]) {
  console.error(`❌ Unknown network: ${network}`)
  process.exit(1)
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