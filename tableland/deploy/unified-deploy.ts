#!/usr/bin/env bun
/**
 * Unified Tableland Deployment Script
 * 
 * Features:
 * - Support for all networks (mainnet and testnet)
 * - Private key and Ledger signing support
 * - Batch deployments
 * - Deployment verification
 * - Automated deployment tracking
 * - Dry run mode
 */

import { Database } from '@tableland/sdk'
import { Wallet, ethers } from 'ethers'
import HIDTransport from '@ledgerhq/hw-transport-node-hid'
import Eth from '@ledgerhq/hw-app-eth'
import { TABLELAND_CONFIG, type TableName, type NetworkName } from '../config'
import dotenv from 'dotenv'
import ora from 'ora'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

// Load environment variables
const __dirname = dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: join(__dirname, '../../.env') })
if (!process.env.PRIVATE_KEY) {
  dotenv.config({ path: join(__dirname, '../.env') })
}

// Types
interface DeploymentOptions {
  tableName: TableName
  network: NetworkName
  useLedger?: boolean
  derivationPath?: string
  dryRun?: boolean
  verify?: boolean
  waitTime?: number
}

interface DeploymentResult {
  success: boolean
  tableName?: string
  transactionHash?: string
  error?: string
  deploymentInfo?: any
}

// Custom Ledger Signer for ethers v6
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
    const populatedTx = await this.populateTransaction(tx)
    
    const unsignedTx = {
      to: populatedTx.to,
      value: populatedTx.value || 0n,
      data: populatedTx.data || '0x',
      chainId: populatedTx.chainId,
      nonce: populatedTx.nonce,
      gasLimit: populatedTx.gasLimit,
      maxFeePerGas: populatedTx.maxFeePerGas,
      maxPriorityFeePerGas: populatedTx.maxPriorityFeePerGas,
      type: 2
    }
    
    console.log('\n⚡ Please approve the transaction on your Ledger device')
    
    const ethTx = ethers.Transaction.from(unsignedTx)
    const signature = await this.eth.signTransaction(
      this.path,
      ethTx.unsignedSerialized.substring(2),
      null
    )
    
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

  async signTypedData(
    domain: ethers.TypedDataDomain,
    types: Record<string, ethers.TypedDataField[]>,
    value: Record<string, any>
  ): Promise<string> {
    throw new Error('signTypedData not implemented for Ledger')
  }
}

// Deployment tracking functions
function getDeploymentPath(network: NetworkName): string {
  const isMainnet = network.includes('mainnet')
  return join(__dirname, '../deployments', isMainnet ? 'mainnet' : 'testnet', `${network.replace('-', '_')}.json`)
}

function loadDeployments(network: NetworkName): any {
  const path = getDeploymentPath(network)
  if (existsSync(path)) {
    return JSON.parse(readFileSync(path, 'utf8'))
  }
  return { tables: {}, lastUpdated: null }
}

function saveDeployment(network: NetworkName, tableName: TableName, deploymentInfo: any): void {
  const path = getDeploymentPath(network)
  const dir = dirname(path)
  
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
  
  const deployments = loadDeployments(network)
  if (!deployments.tables) deployments.tables = {}
  
  deployments.tables[tableName] = deploymentInfo
  deployments.lastUpdated = new Date().toISOString()
  
  writeFileSync(path, JSON.stringify(deployments, null, 2))
}

// Main deployment function
async function deployTable(options: DeploymentOptions): Promise<DeploymentResult> {
  const { tableName, network, useLedger = false, derivationPath, dryRun = false, verify = true, waitTime = 30 } = options
  const config = TABLELAND_CONFIG.networks[network]
  const schema = TABLELAND_CONFIG.schemas[tableName]
  
  const spinner = ora({
    text: `Preparing to deploy ${tableName} on ${network}...`,
    spinner: 'dots'
  }).start()
  
  let signer: ethers.Signer
  let transport: any = null
  
  try {
    // Setup provider
    const provider = new ethers.JsonRpcProvider(config.rpcUrl)
    
    // Setup signer
    if (useLedger) {
      const path = derivationPath || "m/44'/60'/0'/0/0"
      spinner.text = 'Connecting to Ledger...'
      
      transport = await HIDTransport.create()
      const eth = new Eth(transport)
      signer = new LedgerSignerV6(eth, path, provider)
      
      const address = await signer.getAddress()
      spinner.succeed(`Connected to Ledger: ${address}`)
    } else {
      if (!process.env.PRIVATE_KEY) {
        throw new Error('PRIVATE_KEY not found in environment variables')
      }
      
      const privateKey = process.env.PRIVATE_KEY.startsWith('0x') 
        ? process.env.PRIVATE_KEY 
        : `0x${process.env.PRIVATE_KEY}`
      signer = new Wallet(privateKey, provider)
    }
    
    // Check balance
    const address = await signer.getAddress()
    const balance = await provider.getBalance(address)
    console.log(`💰 Balance: ${ethers.formatEther(balance)} ETH`)
    
    if (balance === 0n) {
      throw new Error('Insufficient balance for deployment')
    }
    
    // Check for existing deployment
    const existingDeployments = loadDeployments(network)
    if (existingDeployments.tables?.[tableName]) {
      console.log('\n⚠️  Warning: Table already deployed on this network:')
      console.log(`   Table: ${existingDeployments.tables[tableName].tableName}`)
      console.log(`   Deployed: ${existingDeployments.tables[tableName].deployedAt}`)
      console.log(`   Transaction: ${existingDeployments.tables[tableName].transactionHash}`)
      
      if (!dryRun) {
        const readline = await import('readline')
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout
        })
        
        const answer = await new Promise<string>((resolve) => {
          rl.question('\nDo you want to continue? (y/N): ', resolve)
        })
        rl.close()
        
        if (answer.toLowerCase() !== 'y') {
          spinner.info('Deployment cancelled')
          return { success: false, error: 'Deployment cancelled by user' }
        }
      }
    }
    
    if (dryRun) {
      spinner.info('DRY RUN - No actual deployment will occur')
      console.log('\n📋 Deployment Plan:')
      console.log(`   Network: ${network} (Chain ID: ${config.chainId})`)
      console.log(`   Table: ${tableName} (${schema.prefix}_${config.chainId})`)
      console.log(`   Signer: ${address}`)
      console.log(`   Schema Version: ${schema.version}`)
      console.log('\n📊 Table Schema:')
      console.log(schema.schema)
      
      return { success: true }
    }
    
    // Create database instance
    spinner.start('Deploying table...')
    const dbConfig: any = { signer }
    
    // For Base mainnet, explicitly set the registry contract
    if (network === 'base-mainnet') {
      dbConfig.baseUrl = config.tablelandHost
      dbConfig.contract = '0x8268F7Aba0E152B3A853e8CB4Ab9795Ec66c2b6B'
    }
    
    const db = new Database(dbConfig)
    
    // Deploy table
    const { meta } = await db
      .prepare(`CREATE TABLE ${schema.prefix}_${config.chainId} ${schema.schema}`)
      .run()
    
    spinner.succeed('Table deployment transaction sent!')
    console.log(`🔗 Transaction: ${meta.txn?.transactionHash}`)
    
    // Wait for confirmation
    spinner.start('Waiting for transaction confirmation...')
    let deployedTableName: string
    
    try {
      await meta.txn?.wait()
      deployedTableName = meta.txn?.names?.[0] || `${schema.prefix}_${config.chainId}_${meta.txn?.tableId}`
      spinner.succeed('Transaction confirmed!')
    } catch (e) {
      deployedTableName = `${schema.prefix}_${config.chainId}_${meta.txn?.tableId}`
      spinner.warn('Transaction wait timeout (but likely succeeded)')
    }
    
    console.log(`📊 Table Name: ${deployedTableName}`)
    
    // Save deployment info
    const deploymentInfo = {
      network,
      chainId: config.chainId,
      tableName: deployedTableName,
      transactionHash: meta.txn?.transactionHash,
      deployedAt: new Date().toISOString(),
      deployedBy: address,
      schema: schema.schema,
      version: schema.version
    }
    
    saveDeployment(network, tableName, deploymentInfo)
    spinner.succeed('Deployment info saved!')
    
    // Verify deployment
    if (verify) {
      spinner.start(`Waiting ${waitTime} seconds for Tableland to sync...`)
      await new Promise(resolve => setTimeout(resolve, waitTime * 1000))
      
      spinner.text = 'Verifying deployment...'
      
      try {
        const result = await db.prepare(`SELECT * FROM ${deployedTableName} LIMIT 1`).all()
        spinner.succeed(`Deployment verified! Table ${deployedTableName} is accessible`)
      } catch (e) {
        spinner.warn('Could not verify deployment (table may still be syncing)')
      }
    }
    
    return {
      success: true,
      tableName: deployedTableName,
      transactionHash: meta.txn?.transactionHash,
      deploymentInfo
    }
    
  } catch (error: any) {
    spinner.fail(`Deployment failed: ${error.message}`)
    return { success: false, error: error.message }
  } finally {
    if (transport) {
      await transport.close()
    }
  }
}

// Batch deployment function
async function batchDeploy(
  tables: TableName[],
  networks: NetworkName[],
  options: Partial<DeploymentOptions> = {}
): Promise<void> {
  console.log('🚀 Starting batch deployment...\n')
  
  const results: any[] = []
  
  for (const network of networks) {
    for (const tableName of tables) {
      console.log(`\n📦 Deploying ${tableName} on ${network}...`)
      
      const result = await deployTable({
        tableName,
        network,
        ...options
      })
      
      results.push({
        tableName,
        network,
        ...result
      })
      
      if (!result.success) {
        console.error(`❌ Failed to deploy ${tableName} on ${network}: ${result.error}`)
      }
    }
  }
  
  // Summary
  console.log('\n📊 Batch Deployment Summary:')
  console.log('=' * 50)
  
  const successful = results.filter(r => r.success)
  const failed = results.filter(r => !r.success)
  
  console.log(`✅ Successful: ${successful.length}`)
  console.log(`❌ Failed: ${failed.length}`)
  
  if (successful.length > 0) {
    console.log('\nSuccessful deployments:')
    successful.forEach(r => {
      console.log(`  - ${r.tableName} on ${r.network}: ${r.tableName}`)
    })
  }
  
  if (failed.length > 0) {
    console.log('\nFailed deployments:')
    failed.forEach(r => {
      console.log(`  - ${r.tableName} on ${r.network}: ${r.error}`)
    })
  }
}

// CLI Command Parser
interface CliCommand {
  command: string
  description: string
  handler: (args: string[]) => Promise<void>
}

const commands: CliCommand[] = [
  {
    command: 'deploy',
    description: 'Deploy a single table',
    handler: async (args) => {
      if (args.length < 2) {
        console.error('Usage: deploy <table-name> <network> [options]')
        console.error('Options:')
        console.error('  --ledger              Use Ledger for signing')
        console.error('  --path <path>         Ledger derivation path')
        console.error('  --dry-run             Show deployment plan without executing')
        console.error('  --no-verify           Skip deployment verification')
        console.error('  --wait <seconds>      Wait time before verification (default: 30)')
        process.exit(1)
      }
      
      const tableName = args[0] as TableName
      const network = args[1] as NetworkName
      
      // Parse options
      const options: DeploymentOptions = {
        tableName,
        network,
        useLedger: args.includes('--ledger'),
        dryRun: args.includes('--dry-run'),
        verify: !args.includes('--no-verify'),
      }
      
      const pathIndex = args.indexOf('--path')
      if (pathIndex !== -1 && args[pathIndex + 1]) {
        options.derivationPath = args[pathIndex + 1]
      }
      
      const waitIndex = args.indexOf('--wait')
      if (waitIndex !== -1 && args[waitIndex + 1]) {
        options.waitTime = parseInt(args[waitIndex + 1])
      }
      
      const result = await deployTable(options)
      
      if (result.success) {
        console.log('\n✨ Deployment successful!')
        if (result.deploymentInfo) {
          console.log('\n📝 Deployment Details:')
          console.log(JSON.stringify(result.deploymentInfo, null, 2))
        }
      } else {
        console.error('\n❌ Deployment failed!')
        process.exit(1)
      }
    }
  },
  {
    command: 'batch',
    description: 'Deploy multiple tables',
    handler: async (args) => {
      if (args.length < 2) {
        console.error('Usage: batch <tables> <networks> [options]')
        console.error('Examples:')
        console.error('  batch songs,user_history base-mainnet')
        console.error('  batch all base-mainnet,base-sepolia --dry-run')
        process.exit(1)
      }
      
      // Parse tables
      let tables: TableName[]
      if (args[0] === 'all') {
        tables = Object.keys(TABLELAND_CONFIG.schemas) as TableName[]
      } else {
        tables = args[0].split(',') as TableName[]
      }
      
      // Parse networks
      const networks = args[1].split(',') as NetworkName[]
      
      // Parse options
      const options: Partial<DeploymentOptions> = {
        useLedger: args.includes('--ledger'),
        dryRun: args.includes('--dry-run'),
        verify: !args.includes('--no-verify'),
      }
      
      await batchDeploy(tables, networks, options)
    }
  },
  {
    command: 'list',
    description: 'List deployed tables',
    handler: async (args) => {
      const network = args[0] as NetworkName
      
      if (!network) {
        // List all deployments
        console.log('📊 All Deployments:\n')
        
        for (const net of Object.keys(TABLELAND_CONFIG.networks) as NetworkName[]) {
          const deployments = loadDeployments(net)
          
          if (deployments.tables && Object.keys(deployments.tables).length > 0) {
            console.log(`\n${net}:`)
            for (const [table, info] of Object.entries(deployments.tables)) {
              console.log(`  - ${table}: ${(info as any).tableName}`)
            }
          }
        }
      } else {
        // List specific network
        const deployments = loadDeployments(network)
        
        if (!deployments.tables || Object.keys(deployments.tables).length === 0) {
          console.log(`No deployments found for ${network}`)
          return
        }
        
        console.log(`\n📊 Deployments on ${network}:\n`)
        
        for (const [table, info] of Object.entries(deployments.tables)) {
          const deployment = info as any
          console.log(`${table}:`)
          console.log(`  Table Name: ${deployment.tableName}`)
          console.log(`  Deployed: ${deployment.deployedAt}`)
          console.log(`  Transaction: ${deployment.transactionHash}`)
          console.log(`  Deployer: ${deployment.deployedBy}`)
          console.log(`  Version: ${deployment.version || 'unknown'}`)
          console.log()
        }
      }
    }
  },
  {
    command: 'verify',
    description: 'Verify a deployed table',
    handler: async (args) => {
      if (args.length < 2) {
        console.error('Usage: verify <table-name> <network>')
        process.exit(1)
      }
      
      const tableName = args[0] as TableName
      const network = args[1] as NetworkName
      
      const deployments = loadDeployments(network)
      const deployment = deployments.tables?.[tableName]
      
      if (!deployment) {
        console.error(`No deployment found for ${tableName} on ${network}`)
        process.exit(1)
      }
      
      const config = TABLELAND_CONFIG.networks[network]
      const provider = new ethers.JsonRpcProvider(config.rpcUrl)
      
      // Use a read-only database instance
      const db = new Database()
      
      try {
        console.log(`\n🔍 Verifying ${deployment.tableName}...`)
        
        // Try to query the table
        const result = await db.prepare(`SELECT COUNT(*) as count FROM ${deployment.tableName}`).first()
        console.log(`✅ Table is accessible! Row count: ${result?.count || 0}`)
        
        // Check transaction
        if (deployment.transactionHash) {
          const receipt = await provider.getTransactionReceipt(deployment.transactionHash)
          if (receipt) {
            console.log(`✅ Transaction confirmed in block ${receipt.blockNumber}`)
          }
        }
        
      } catch (error: any) {
        console.error(`❌ Verification failed: ${error.message}`)
        process.exit(1)
      }
    }
  }
]

// Main CLI handler
async function main() {
  const args = process.argv.slice(2)
  
  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log('Unified Tableland Deployment Tool\n')
    console.log('Usage: bun run unified-deploy.ts <command> [options]\n')
    console.log('Commands:')
    
    commands.forEach(cmd => {
      console.log(`  ${cmd.command.padEnd(10)} ${cmd.description}`)
    })
    
    console.log('\nExamples:')
    console.log('  bun run unified-deploy.ts deploy songs base-mainnet')
    console.log('  bun run unified-deploy.ts deploy songs base-mainnet --ledger')
    console.log('  bun run unified-deploy.ts batch all base-sepolia --dry-run')
    console.log('  bun run unified-deploy.ts list')
    console.log('  bun run unified-deploy.ts verify songs base-mainnet')
    
    process.exit(0)
  }
  
  const commandName = args[0]
  const command = commands.find(c => c.command === commandName)
  
  if (!command) {
    console.error(`Unknown command: ${commandName}`)
    console.error('Run with --help for usage information')
    process.exit(1)
  }
  
  try {
    await command.handler(args.slice(1))
  } catch (error: any) {
    console.error('Fatal error:', error.message)
    if (error.stack) {
      console.error(error.stack)
    }
    process.exit(1)
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}

// Export for programmatic use
export { deployTable, batchDeploy, DeploymentOptions, DeploymentResult }