#!/usr/bin/env node
import { Database } from '@tableland/sdk'
import { Wallet, ethers } from 'ethers'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '../.env' })

interface UpdateOptions {
  songId: number
  tableName?: string
  [key: string]: any  // Allow updating any column
}

async function updateSongData(options: UpdateOptions) {
  console.log('🔄 Updating song data in Tableland...\n')

  // Extract special options
  const { songId, tableName: customTableName, ...updateData } = options
  
  // Validate inputs
  if (Object.keys(updateData).length === 0) {
    throw new Error('Must provide at least one field to update')
  }

  // Setup provider and signer
  const provider = new ethers.JsonRpcProvider('https://sepolia.optimism.io')
  const wallet = new Wallet(process.env.PRIVATE_KEY!, provider)
  const db = new Database({ signer: wallet })
  
  console.log(`📍 Network: Optimism Sepolia`)
  console.log(`👤 Signer: ${wallet.address}`)
  
  // Use provided table name or default
  const tableName = customTableName || 'karaoke_songs_11155420_11155420_181'
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
    console.log('Usage: bun update-encrypted-content.ts <songId> <updateJson> [tableName]')
    console.log()
    console.log('Updates any field(s) in the song table. JSON objects will be stringified.')
    console.log()
    console.log('Examples:')
    console.log('  # Update stems')
    console.log('  bun update-encrypted-content.ts 1 \'{"stems":{"piano":"QmNewCID"}}\'')
    console.log()
    console.log('  # Update translations')
    console.log('  bun update-encrypted-content.ts 2 \'{"translations":{"fr":"QmFrenchCID"}}\'')
    console.log()
    console.log('  # Update multiple fields')
    console.log('  bun update-encrypted-content.ts 1 \'{"stems":{"piano":"CID1"},"duration":195}\'')
    console.log()
    console.log('  # Update artwork')
    console.log('  bun update-encrypted-content.ts 1 \'{"artwork_hash":{"id":"abc123","ext":"png"}}\'')
    console.log()
    console.log('  # Update any field')
    console.log('  bun update-encrypted-content.ts 1 \'{"genius_id":12345,"language":"fr"}\'')
    console.log()
    console.log('  # Use custom table')
    console.log('  bun update-encrypted-content.ts 1 \'{"title":"New Title"}\' "custom_table_name"')
    process.exit(1)
  }

  const songId = parseInt(args[0])
  const updateData = JSON.parse(args[1])
  const tableName = args[2]

  updateSongData({
    songId,
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