#!/usr/bin/env node
import { Database } from '@tableland/sdk'
import { Wallet, ethers } from 'ethers'
import { TABLELAND_CONFIG, type NetworkName } from '../../config'
import dotenv from 'dotenv'

// Load environment variables - try multiple paths
const result = dotenv.config({ path: require('path').resolve(process.cwd(), '../.env') })
if (result.error) {
  // Try from tableland directory
  dotenv.config({ path: require('path').resolve(process.cwd(), '.env') })
}

interface UpdateOptions {
  songId: number
  network: NetworkName
  tableName?: string
  [key: string]: any  // Allow updating any column
}

async function updateSongData(options: UpdateOptions) {
  console.log('🔄 Updating song data in Tableland...\n')

  // Extract special options
  const { songId, network, tableName: customTableName, ...updateData } = options
  
  // Validate inputs
  if (Object.keys(updateData).length === 0) {
    throw new Error('Must provide at least one field to update')
  }

  // Get network config
  const networkConfig = TABLELAND_CONFIG.networks[network]
  if (!networkConfig) {
    throw new Error(`Unknown network: ${network}`)
  }

  // Setup provider and signer
  if (!process.env.PRIVATE_KEY) {
    throw new Error('PRIVATE_KEY not found in environment variables. Make sure .env file exists and contains PRIVATE_KEY')
  }
  
  const provider = new ethers.JsonRpcProvider(networkConfig.rpcUrl)
  const privateKey = process.env.PRIVATE_KEY.startsWith('0x') 
    ? process.env.PRIVATE_KEY
    : `0x${process.env.PRIVATE_KEY}`
  const wallet = new Wallet(privateKey, provider)
  const db = new Database({ signer: wallet })
  
  console.log(`📍 Network: ${network}`)
  console.log(`👤 Signer: ${wallet.address}`)
  
  // Use provided table name or try to load from deployments
  let tableName = customTableName
  if (!tableName) {
    try {
      const deploymentPath = `../../deployments/${network.includes('mainnet') ? 'mainnet' : 'testnet'}/${network.replace('-', '_')}.json`
      const deployment = require(deploymentPath)
      tableName = deployment.tables?.songs || deployment.tableName
    } catch {
      throw new Error('No table name provided and couldn\'t load from deployments')
    }
  }
  console.log(`📊 Table: ${tableName}`)
  console.log()

  try {
    // First, fetch current song data
    const currentData = await db
      .prepare(`SELECT * FROM ${tableName} WHERE id = ?`)
      .bind(songId)
      .all()

    if (currentData.results.length === 0) {
      throw new Error(`Song with ID ${songId} not found`)
    }

    const song = currentData.results[0]
    console.log(`🎵 Updating: ${song.title} by ${song.artist}`)
    
    // Show what will be updated
    console.log(`   Updating fields: ${Object.keys(updateData).join(', ')}`)
    console.log()

    // Build update query dynamically
    const updates = []
    const values = []
    
    for (const [key, value] of Object.entries(updateData)) {
      updates.push(`${key} = ?`)
      
      // If value is object/array, stringify it
      if (typeof value === 'object' && value !== null) {
        values.push(JSON.stringify(value))
        console.log(`   ${key}: ${JSON.stringify(value)}`)
      } else {
        values.push(value)
        console.log(`   ${key}: ${value}`)
      }
    }
    
    // Add timestamp
    updates.push('updated_at = ?')
    values.push(Math.floor(Date.now() / 1000))
    
    // Add songId for WHERE clause
    values.push(songId)

    // Execute update
    const statement = `UPDATE ${tableName} SET ${updates.join(', ')} WHERE id = ?`
    console.log('\nExecuting update...')
    
    const { meta } = await db
      .prepare(statement)
      .bind(...values)
      .run()

    console.log(`✅ Update transaction: ${meta.txn?.transactionHash}`)
    
    try {
      await meta.txn?.wait()
      console.log('✅ Transaction confirmed')
    } catch (e) {
      console.log('⚠️ Transaction wait timeout (but likely succeeded)')
    }

    // Verify update
    console.log('\nVerifying update...')
    await new Promise(resolve => setTimeout(resolve, 3000))
    
    const updated = await db
      .prepare(`SELECT * FROM ${tableName} WHERE id = ?`)
      .bind(songId)
      .all()
    
    if (updated.results.length > 0) {
      const result = updated.results[0]
      console.log(`✓ Song updated successfully`)
      
      // Show updated fields
      for (const key of Object.keys(updateData)) {
        const value = result[key]
        if (typeof value === 'string' && (value.startsWith('{') || value.startsWith('['))) {
          try {
            const parsed = JSON.parse(value)
            console.log(`   ${key}: ${JSON.stringify(parsed)}`)
          } catch {
            console.log(`   ${key}: ${value}`)
          }
        } else {
          console.log(`   ${key}: ${value}`)
        }
      }
    }

  } catch (error: any) {
    console.error('❌ Update failed:', error.message)
    process.exit(1)
  }
}

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2)
  
  if (args.length < 2) {
    console.log('Usage: bun update-encrypted-content.ts <songId> <updateJson> [network] [tableName]')
    console.log()
    console.log('Available networks:', Object.keys(TABLELAND_CONFIG.networks).join(', '))
    console.log('Default network: optimism-sepolia')
    console.log()
    console.log('Updates any field(s) in the song table. JSON objects will be stringified.')
    console.log()
    console.log('Examples:')
    console.log('  # Update stems (default network)')
    console.log('  bun update-encrypted-content.ts 1 \'{"stems":{"piano":"QmNewCID"}}\'')
    console.log()
    console.log('  # Update on mainnet')
    console.log('  bun update-encrypted-content.ts 2 \'{"translations":{"fr":"QmFrenchCID"}}\' base-mainnet')
    console.log()
    console.log('  # Update multiple fields')
    console.log('  bun update-encrypted-content.ts 1 \'{"stems":{"piano":"CID1"},"duration":195}\' optimism-sepolia')
    console.log()
    console.log('  # Use custom table on specific network')
    console.log('  bun update-encrypted-content.ts 1 \'{"title":"New Title"}\' base-mainnet "custom_table_name"')
    process.exit(1)
  }

  const songId = parseInt(args[0])
  const updateData = JSON.parse(args[1])
  let network: NetworkName = 'optimism-sepolia'
  let tableName: string | undefined

  // Parse optional arguments
  if (args[2]) {
    if (args[2] in TABLELAND_CONFIG.networks) {
      network = args[2] as NetworkName
      tableName = args[3]
    } else {
      // Assume it's a table name on default network
      tableName = args[2]
    }
  }

  updateSongData({
    songId,
    network,
    tableName,
    ...updateData
  })
    .then(() => {
      console.log('\n✨ Update complete!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('Fatal error:', error)
      process.exit(1)
    })
}

export { updateSongData }