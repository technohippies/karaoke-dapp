import { Database } from '@tableland/sdk'
import { Wallet, JsonRpcProvider } from 'ethers'
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'
import { TABLELAND_CONFIG, TableName, NetworkName } from '../config'

interface DeploymentInfo {
  tableName: string
  prefix: string
  version: string
  chainId: number
  createdAt: string
  deployer: string
  transactionHash?: string
}

interface Deployments {
  [key: string]: DeploymentInfo
}

export class TableManager {
  private db: Database
  private network: NetworkName
  private deploymentsPath: string
  private deployments: Deployments = {}
  private signer: Wallet

  constructor(signer: Wallet, network: NetworkName = 'base-sepolia') {
    this.db = new Database({ signer })
    this.signer = signer
    this.network = network
    this.deploymentsPath = join(__dirname, 'deployments', `${network}.json`)
    this.loadDeployments()
  }

  private loadDeployments() {
    if (existsSync(this.deploymentsPath)) {
      const data = readFileSync(this.deploymentsPath, 'utf-8')
      this.deployments = JSON.parse(data)
    }
  }

  private saveDeployments() {
    const dir = join(__dirname, 'deployments')
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
    }
    writeFileSync(this.deploymentsPath, JSON.stringify(this.deployments, null, 2))
  }

  /**
   * Create a new table or get existing table name
   */
  async createTable(tableName: TableName): Promise<string> {
    const config = TABLELAND_CONFIG.schemas[tableName]
    const deploymentKey = `${tableName}_${config.version}`

    // Check if table already exists
    if (this.deployments[deploymentKey]) {
      console.log(`✓ Table ${tableName} already exists: ${this.deployments[deploymentKey].tableName}`)
      return this.deployments[deploymentKey].tableName
    }

    // Create new table
    console.log(`📊 Creating ${tableName} table...`)
    const { meta } = await this.db
      .prepare(`CREATE TABLE ${config.prefix} ${config.schema}`)
      .run()

    await meta.txn?.wait()
    
    const fullTableName = meta.txn?.names?.[0]
    if (!fullTableName) {
      throw new Error('Failed to get table name from transaction')
    }

    // Save deployment info
    this.deployments[deploymentKey] = {
      tableName: fullTableName,
      prefix: config.prefix,
      version: config.version,
      chainId: TABLELAND_CONFIG.networks[this.network].chainId,
      createdAt: new Date().toISOString(),
      deployer: this.signer.address,
      transactionHash: meta.txn!.transactionHash
    }
    this.saveDeployments()

    console.log(`✅ Created table: ${fullTableName}`)
    console.log(`   Transaction: ${meta.txn!.transactionHash}`)
    
    return fullTableName
  }

  /**
   * Get deployed table name
   */
  getTableName(tableName: TableName): string | null {
    const config = TABLELAND_CONFIG.schemas[tableName]
    const deploymentKey = `${tableName}_${config.version}`
    return this.deployments[deploymentKey]?.tableName || null
  }

  /**
   * Get all deployments
   */
  getDeployments(): Deployments {
    return this.deployments
  }

  /**
   * Execute a prepared statement
   */
  async execute(statement: string, params: any[] = []) {
    const prepared = this.db.prepare(statement)
    if (params.length > 0) {
      prepared.bind(...params)
    }
    const result = await prepared.run()
    
    // Wait with longer timeout
    if (result.meta.txn) {
      console.log(`⏳ Waiting for transaction: ${result.meta.txn.transactionHash}`)
      try {
        await result.meta.txn.wait(2) // Wait for 2 confirmations
      } catch (e) {
        console.log('⚠️ Transaction wait timeout, but it may still succeed')
      }
    }
    
    return result
  }

  /**
   * Query data
   */
  async query(statement: string, params: any[] = []) {
    const prepared = this.db.prepare(statement)
    if (params.length > 0) {
      prepared.bind(...params)
    }
    return await prepared.all()
  }
}