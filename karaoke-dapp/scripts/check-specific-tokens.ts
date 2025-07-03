#!/usr/bin/env node
import { ethers } from 'ethers'
import ora from 'ora'
import dotenv from 'dotenv'
dotenv.config()

const TEST_WALLET_ADDRESS = '0x7d3924A73f1242663fD8BbD1f2559fa6081Ba6D1'
const OWNED_TOKEN_IDS = [127, 129, 130, 131, 132, 133, 135, 136]
const CHAIN_ID = 84532
const RPC_URL = 'https://base-sepolia-rpc.publicnode.com'
const REGISTRY_ADDRESS = "0xA85aAE9f0Aec5F5638E5F13840797303Ab29c9f9"

async function getTableNameFromRegistry(tokenId: number): Promise<string | null> {
  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL)
    const registry = new ethers.Contract(
      REGISTRY_ADDRESS,
      [
        'function tables(uint256 tokenId) view returns (address, uint48, string, uint8, int16)'
      ],
      provider
    )
    
    const tableData = await registry.tables(tokenId)
    const prefix = tableData[2] // The prefix is the third element
    const tableName = `${prefix}_${CHAIN_ID}_${tokenId}`
    
    return tableName
  } catch (error) {
    console.error(`Error getting table name for token ${tokenId}:`, error)
    return null
  }
}

async function checkSpecificTokens() {
  console.log('🔍 Checking Specific Token Tables')
  console.log('=================================\n')
  
  const spinner = ora('Getting table names from registry...').start()
  
  const foundTables = []
  
  for (const tokenId of OWNED_TOKEN_IDS) {
    console.log(`\nChecking token ${tokenId}:`)
    
    // First, get the actual table name from the registry
    const tableName = await getTableNameFromRegistry(tokenId)
    
    if (!tableName) {
      console.log(`  ❌ Could not get table name from registry`)
      continue
    }
    
    console.log(`  📝 Registry name: ${tableName}`)
    
    try {
      // Test if the table exists and get its schema
      const schemaResponse = await fetch(
        `https://testnets.tableland.network/api/v1/tables/${CHAIN_ID}/${tokenId}`
      )
      
      if (schemaResponse.ok) {
        const schemaData = await schemaResponse.json()
        console.log(`  ✅ Table exists`)
        console.log(`     Schema: ${JSON.stringify(schemaData.schema?.columns?.map((c: any) => c.name) || [])}`)
        
        // Get row count
        const countResponse = await fetch(
          `https://testnets.tableland.network/api/v1/query?` +
          new URLSearchParams({
            statement: `SELECT COUNT(*) as count FROM ${tableName}`,
            unwrap: 'true'
          })
        )
        
        if (countResponse.ok) {
          const countData = await countResponse.json()
          console.log(`     Rows: ${countData[0]?.count || 0}`)
        }
        
        foundTables.push({ tokenId, tableName })
      } else {
        console.log(`  ❌ Table not accessible via API`)
      }
    } catch (err) {
      console.log(`  ❌ Error checking table: ${err}`)
    }
  }
  
  spinner.succeed('Token check complete')
  
  // Analyze results
  console.log('\n📊 Summary:')
  console.log(`Found ${foundTables.length} out of ${OWNED_TOKEN_IDS.length} tables`)
  
  // Check for SRS table set
  const sessionTable = foundTables.find(t => t.tableName.includes('karaoke_sessions'))
  const linesTable = foundTables.find(t => t.tableName.includes('karaoke_lines'))
  const exerciseTable = foundTables.find(t => t.tableName.includes('exercise_sessions'))
  
  if (sessionTable && linesTable && exerciseTable) {
    console.log('\n✅ Complete SRS table set found!')
    console.log(`Sessions: ${sessionTable.tableName}`)
    console.log(`Lines: ${linesTable.tableName}`)
    console.log(`Exercises: ${exerciseTable.tableName}`)
    
    // Generate the UserTableInfo object
    console.log('\n📝 UserTableInfo for localStorage:')
    console.log(JSON.stringify({
      userAddress: TEST_WALLET_ADDRESS,
      karaokeSessionsTable: sessionTable.tableName,
      karaokeLinesTable: linesTable.tableName,
      exerciseSessionsTable: exerciseTable.tableName,
      chainId: CHAIN_ID,
      createdAt: new Date().toISOString()
    }, null, 2))
  } else {
    console.log('\n⚠️  Incomplete SRS table set')
    if (!sessionTable) console.log('Missing: karaoke_sessions table')
    if (!linesTable) console.log('Missing: karaoke_lines table')
    if (!exerciseTable) console.log('Missing: exercise_sessions table')
  }
}

checkSpecificTokens().catch(console.error)