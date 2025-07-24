#!/usr/bin/env bun
import { Database } from '@tableland/sdk'
import { Wallet, ethers } from 'ethers'
import HIDTransport from '@ledgerhq/hw-transport-node-hid'
import Eth from '@ledgerhq/hw-app-eth'
import { TABLELAND_CONFIG, type TableName, type NetworkName } from '../config'
import dotenv from 'dotenv'

// Try multiple paths for .env
const result = dotenv.config({ path: require('path').resolve(process.cwd(), '../.env') })
if (result.error) {
  dotenv.config({ path: require('path').resolve(process.cwd(), '.env') })
}

// Custom Ledger Signer that extends ethers AbstractSigner
class LedgerSignerV6 extends ethers.AbstractSigner {
  private eth: Eth
  private path: string
  private _address: string | null = null

  constructor(eth: Eth, path: string, provider?: ethers.Provider) {
    super(provider)
    this.eth = eth
    this.path = path
  }

  async getAddress(): Promise<string> {
    if (!this._address) {
      const { address } = await this.eth.getAddress(this.path)
      this._address = address
    }
    return this._address
  }

  async signTransaction(tx: ethers.TransactionRequest): Promise<string> {
    const address = await this.getAddress()
    
    // Populate transaction
    const populatedTx = await this.populateTransaction(tx)
    
    // Create transaction for signing
    const unsignedTx = {
      to: populatedTx.to,
      value: populatedTx.value || 0n,
      data: populatedTx.data || '0x',
      chainId: populatedTx.chainId,
      nonce: populatedTx.nonce,
      gasLimit: populatedTx.gasLimit,
      maxFeePerGas: populatedTx.maxFeePerGas,
      maxPriorityFeePerGas: populatedTx.maxPriorityFeePerGas,
      type: 2 // EIP-1559
    }
    
    console.log(`\n⚡ Please approve the transaction on your Ledger device`)
    
    // Create ethers Transaction object
    const ethTx = ethers.Transaction.from(unsignedTx)
    
    // Sign with Ledger
    const signature = await this.eth.signTransaction(
      this.path,
      ethTx.unsignedSerialized.substring(2),
      null
    )
    
    // Add signature to transaction
    ethTx.signature = {
      r: '0x' + signature.r,
      s: '0x' + signature.s,
      v: parseInt(signature.v, 16)
    }
    
    return ethTx.serialized
  }

  async signMessage(message: string | Uint8Array): Promise<string> {
    const messageHex = typeof message === 'string' 
      ? Buffer.from(message).toString('hex')
      : Buffer.from(message).toString('hex')
    
    const signature = await this.eth.signPersonalMessage(this.path, messageHex)
    return '0x' + signature.r + signature.s + signature.v
  }

  connect(provider: ethers.Provider): LedgerSignerV6 {
    return new LedgerSignerV6(this.eth, this.path, provider)
  }

  // Implement missing abstract method
  async signTypedData(
    domain: ethers.TypedDataDomain,
    types: Record<string, ethers.TypedDataField[]>,
    value: Record<string, any>
  ): Promise<string> {
    throw new Error('signTypedData not implemented for Ledger')
  }
}

async function deployTable(tableName: TableName, network: NetworkName, useLedger: boolean = false, derivationPath?: string) {
  const config = TABLELAND_CONFIG.networks[network]
  const schema = TABLELAND_CONFIG.schemas[tableName]
  
  console.log(`🚀 Deploying ${tableName} table on ${network}${useLedger ? ' using Ledger' : ''}...`)
  console.log(`📍 Chain ID: ${config.chainId}`)
  console.log(`🌐 RPC: ${config.rpcUrl}`)
  
  // Setup provider
  const provider = new ethers.JsonRpcProvider(config.rpcUrl)
  
  let signer: ethers.Signer
  let transport: any = null
  
  try {
    if (useLedger) {
      // Default Ethereum derivation path if not provided
      const path = derivationPath || "m/44'/60'/0'/0/0"
      console.log(`🔑 Using derivation path: ${path}`)
      
      // Connect to Ledger
      console.log(`\n⚡ Connecting to Ledger...`)
      transport = await HIDTransport.create()
      const eth = new Eth(transport)
      
      // Create Ledger signer
      signer = new LedgerSignerV6(eth, path, provider)
      
      // Get address
      const address = await signer.getAddress()
      console.log(`✅ Connected to Ledger!`)
      console.log(`👤 Address: ${address}`)
      
      // Check balance
      const balance = await provider.getBalance(address)
      console.log(`💰 Balance: ${ethers.formatEther(balance)} ETH`)
      
      if (balance === 0n) {
        throw new Error('Insufficient balance for deployment')
      }
    } else {
      // Use private key signer
      if (!process.env.PRIVATE_KEY) {
        throw new Error('PRIVATE_KEY not found in environment variables. Make sure .env file exists and contains PRIVATE_KEY')
      }
      
      const privateKey = process.env.PRIVATE_KEY.startsWith('0x') 
        ? process.env.PRIVATE_KEY 
        : `0x${process.env.PRIVATE_KEY}`
      signer = new Wallet(privateKey, provider)
      console.log(`👤 Signer: ${await signer.getAddress()}`)
    }
    
    // Create database config
    const dbConfig: any = { signer }
    
    // For Base mainnet, explicitly set the registry contract
    if (network === 'base-mainnet') {
      dbConfig.baseUrl = config.tablelandHost
      dbConfig.contract = '0x8268F7Aba0E152B3A853e8CB4Ab9795Ec66c2b6B'
    }
    
    const db = new Database(dbConfig)
    
    if (useLedger) {
      console.log(`\n📝 Creating table...`)
    }
    
    try {
      // Create table
      const { meta } = await db
        .prepare(`CREATE TABLE ${schema.prefix}_${config.chainId} ${schema.schema}`)
        .run()
      
      console.log(`✅ ${useLedger ? 'Transaction sent!' : 'Table created!'}`)
      console.log(`📊 Table Name: ${meta.txn?.name}`)
      console.log(`🔗 Transaction: ${meta.txn?.transactionHash}`)
      
      // Wait for confirmation
      if (useLedger) {
        console.log(`\n⏳ Waiting for confirmation...`)
      }
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
        deployedBy: await signer.getAddress(),
        schema: schema.schema
      }
      
      // Save to deployments file
      const fs = await import('fs')
      const pathModule = await import('path')
      const isMainnet = network.includes('mainnet')
      const deploymentsDir = pathModule.join(import.meta.dir, '../deployments', isMainnet ? 'mainnet' : 'testnet')
      
      if (!fs.existsSync(deploymentsDir)) {
        fs.mkdirSync(deploymentsDir, { recursive: true })
      }
      
      const deploymentFile = pathModule.join(deploymentsDir, `${network.replace('-', '_')}.json`)
      let deployments: any = {}
      
      if (fs.existsSync(deploymentFile)) {
        deployments = JSON.parse(fs.readFileSync(deploymentFile, 'utf8'))
      }
      
      // Save table info
      if (!deployments.tables) deployments.tables = {}
      deployments.tables[tableName] = deploymentInfo
      deployments.lastUpdated = new Date().toISOString()
      
      fs.writeFileSync(deploymentFile, JSON.stringify(deployments, null, 2))
      console.log(`\n💾 Saved deployment to: ${deploymentFile}`)
      
      console.log(`\n📝 Deployment Summary:`)
      console.log(JSON.stringify(deploymentInfo, null, 2))
      
    } catch (error: any) {
      console.error(`\n❌ Deployment failed:`, error.message)
      if (useLedger && error.stack) {
        console.error(`Stack trace:`, error.stack)
      }
      if (useLedger && (error.message.includes('Ledger') || error.message.includes('Transport'))) {
        console.error(`\n💡 Troubleshooting tips:`)
        console.error(`   - Make sure Ledger is connected and unlocked`)
        console.error(`   - Ensure Ethereum app is open on the device`)
        console.error(`   - Enable "Contract data" in Ethereum app settings`)
        console.error(`   - Try a different USB port or cable`)
      }
      process.exit(1)
    }
  } finally {
    // Close transport
    if (transport) {
      await transport.close()
    }
  }
}

// CLI usage
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

if (args.length < 2) {
  console.error('Usage: bun run deploy-table.ts <table-name> <network> [--ledger] [--path <derivation-path>]')
  console.error('Tables:', Object.keys(TABLELAND_CONFIG.schemas).join(', '))
  console.error('Networks:', Object.keys(TABLELAND_CONFIG.networks).join(', '))
  console.error('\nExamples:')
  console.error('  bun run deploy-table.ts songs base-mainnet')
  console.error('  bun run deploy-table.ts songs base-mainnet --ledger')
  console.error('  bun run deploy-table.ts songs base-mainnet --ledger --path "m/44\'/60\'/0\'/0/1"')
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

if (!useLedger && !process.env.PRIVATE_KEY) {
  console.error('❌ PRIVATE_KEY not found in environment variables. Make sure .env file exists and contains PRIVATE_KEY')
  process.exit(1)
}

deployTable(tableName, network, useLedger, derivationPath)
  .then(() => {
    console.log('\n✨ Deployment complete!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })