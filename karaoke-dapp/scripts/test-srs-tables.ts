#!/usr/bin/env node
import { ethers } from 'ethers'
import ora from 'ora'
import dotenv from 'dotenv'

dotenv.config()

const TEST_WALLET_ADDRESS = '0x7d3924A73f1242663fD8BbD1f2559fa6081Ba6D1'
const RPC_URL = 'https://base-sepolia-rpc.publicnode.com'
const REGISTRY_ADDRESS = "0xA85aAE9f0Aec5F5638E5F13840797303Ab29c9f9"
const CHAIN_ID = 84532

interface TokenInfo {
  tokenId: number
  tableName: string
  tableType: 'karaoke_sessions' | 'karaoke_lines' | 'exercise_sessions' | 'other'
}

async function getSrsTablesFromChain(): Promise<TokenInfo[]> {
  console.log('🔍 Testing SRS Table Recovery from Chain')
  console.log('========================================\n')
  
  const provider = new ethers.JsonRpcProvider(RPC_URL)
  const spinner = ora('Connecting to blockchain...').start()
  
  try {
    // Get all tokens owned by the wallet
    const registry = new ethers.Contract(
      REGISTRY_ADDRESS,
      [
        'function balanceOf(address owner) view returns (uint256)',
        'function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)',
        'function tokenURI(uint256 tokenId) view returns (string)',
        'function tables(uint256 tokenId) view returns (address, uint48, string, uint8, int16)'
      ],
      provider
    )

    const balance = await registry.balanceOf(TEST_WALLET_ADDRESS)
    spinner.text = `Found ${balance.toString()} owned tokens`
    
    const tokens: TokenInfo[] = []
    
    for (let i = 0; i < balance; i++) {
      const tokenId = await registry.tokenOfOwnerByIndex(TEST_WALLET_ADDRESS, i)
      
      try {
        // Get table info from Tableland API
        const tableResponse = await fetch(
          `https://testnets.tableland.network/api/v1/tables/${CHAIN_ID}/${tokenId}`
        )
        
        if (tableResponse.ok) {
          const tableData = await tableResponse.json()
          const tableName = tableData.name
          
          // Determine table type
          let tableType: TokenInfo['tableType'] = 'other'
          if (tableName.includes('karaoke_sessions')) tableType = 'karaoke_sessions'
          else if (tableName.includes('karaoke_lines')) tableType = 'karaoke_lines' 
          else if (tableName.includes('exercise_sessions')) tableType = 'exercise_sessions'
          
          tokens.push({
            tokenId: Number(tokenId),
            tableName,
            tableType
          })
        }
      } catch (err) {
        console.log(`Warning: Could not get table info for token ${tokenId}`)
      }
    }
    
    spinner.succeed(`Found ${tokens.length} tables`)
    
    // Display results
    console.log('\n📊 Owned Tables:')
    tokens.forEach(token => {
      const icon = token.tableType === 'other' ? '📄' : '🎤'
      console.log(`  ${icon} Token ${token.tokenId}: ${token.tableName} (${token.tableType})`)
    })
    
    // Check for complete SRS set
    const srsTokens = tokens.filter(t => t.tableType !== 'other')
    const sessionTable = srsTokens.find(t => t.tableType === 'karaoke_sessions')
    const linesTable = srsTokens.find(t => t.tableType === 'karaoke_lines')
    const exerciseTable = srsTokens.find(t => t.tableType === 'exercise_sessions')
    
    console.log('\n🎯 SRS Table Analysis:')
    console.log(`  Sessions table: ${sessionTable ? '✅ ' + sessionTable.tableName : '❌ Missing'}`)
    console.log(`  Lines table: ${linesTable ? '✅ ' + linesTable.tableName : '❌ Missing'}`)
    console.log(`  Exercise table: ${exerciseTable ? '✅ ' + exerciseTable.tableName : '❌ Missing'}`)
    
    if (sessionTable && linesTable && exerciseTable) {
      console.log('\n✅ Complete SRS table set found!')
      
      // Generate UserTableInfo for localStorage
      const userTableInfo = {
        userAddress: TEST_WALLET_ADDRESS,
        karaokeSessionsTable: sessionTable.tableName,
        karaokeLinesTable: linesTable.tableName,
        exerciseSessionsTable: exerciseTable.tableName,
        chainId: CHAIN_ID,
        createdAt: new Date().toISOString()
      }
      
      console.log('\n📝 Recovery Data:')
      console.log(JSON.stringify(userTableInfo, null, 2))
      
      // Test table access
      console.log('\n🧪 Testing Table Access:')
      for (const table of [sessionTable, linesTable, exerciseTable]) {
        try {
          const response = await fetch(
            `https://testnets.tableland.network/api/v1/query?` +
            new URLSearchParams({
              statement: `SELECT COUNT(*) as count FROM ${table.tableName}`,
              unwrap: 'true'
            })
          )
          
          if (response.ok) {
            const data = await response.json()
            console.log(`  ✅ ${table.tableName}: ${data[0]?.count || 0} rows`)
          } else {
            console.log(`  ❌ ${table.tableName}: Access failed`)
          }
        } catch (err) {
          console.log(`  ❌ ${table.tableName}: Error - ${err}`)
        }
      }
    } else {
      console.log('\n❌ Incomplete SRS table set - recovery not possible')
      console.log('   User would need to initialize SRS tables first')
    }
    
    return tokens
    
  } catch (error) {
    spinner.fail('Error connecting to blockchain')
    console.error('Error:', error)
    return []
  }
}

// Test the table recovery mechanism
async function testRecoveryMechanism() {
  console.log('\n🔄 Testing Recovery Mechanism')
  console.log('==============================\n')
  
  const tokens = await getSrsTablesFromChain()
  
  // Simulate what the UserTableService would do
  const srsTokens = tokens.filter(t => 
    t.tableType === 'karaoke_sessions' || 
    t.tableType === 'karaoke_lines' || 
    t.tableType === 'exercise_sessions'
  )
  
  if (srsTokens.length === 3) {
    console.log('✅ Recovery would succeed - all 3 SRS tables found')
  } else if (srsTokens.length > 0) {
    console.log(`⚠️  Partial recovery - found ${srsTokens.length}/3 SRS tables`)
    console.log('   System would need to create missing tables')
  } else {
    console.log('❌ No SRS tables found - full initialization required')
  }
}

async function main() {
  await testRecoveryMechanism()
}

main().catch(console.error)