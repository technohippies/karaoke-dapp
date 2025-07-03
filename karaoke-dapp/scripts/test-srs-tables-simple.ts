#!/usr/bin/env node
import ora from 'ora'
import dotenv from 'dotenv'

dotenv.config()

const TEST_WALLET_ADDRESS = '0x7d3924A73f1242663fD8BbD1f2559fa6081Ba6D1'
const OWNED_TOKEN_IDS = [127, 129, 130, 131, 132, 133, 135, 136]
const CHAIN_ID = 84532

interface TokenInfo {
  tokenId: number
  tableName: string
  tableType: 'karaoke_sessions' | 'karaoke_lines' | 'exercise_sessions' | 'other'
}

async function testSrsTableRecovery(): Promise<void> {
  console.log('🔍 Testing SRS Table Recovery')
  console.log('============================\n')
  
  const spinner = ora('Analyzing owned tables...').start()
  
  const tokens: TokenInfo[] = []
  
  for (const tokenId of OWNED_TOKEN_IDS) {
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
          tokenId,
          tableName,
          tableType
        })
      }
    } catch (err) {
      console.log(`Warning: Could not get table info for token ${tokenId}`)
    }
  }
  
  spinner.succeed(`Analyzed ${tokens.length} tables`)
  
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
  
  // Test recovery scenarios
  console.log('\n🔄 Recovery Test Results:')
  console.log('=========================')
  
  if (sessionTable && linesTable && exerciseTable) {
    console.log('✅ FULL RECOVERY POSSIBLE')
    console.log('   All 3 SRS tables found - user can restore complete SRS data')
    
    // Generate UserTableInfo for localStorage
    const userTableInfo = {
      userAddress: TEST_WALLET_ADDRESS,
      karaokeSessionsTable: sessionTable.tableName,
      karaokeLinesTable: linesTable.tableName,
      exerciseSessionsTable: exerciseTable.tableName,
      chainId: CHAIN_ID,
      createdAt: new Date().toISOString()
    }
    
    console.log('\n📝 Recovery Data (for localStorage):')
    console.log(JSON.stringify(userTableInfo, null, 2))
    
  } else if (srsTokens.length > 0) {
    console.log(`⚠️  PARTIAL RECOVERY POSSIBLE (${srsTokens.length}/3 tables)`)
    console.log('   Found some SRS tables - system would need to create missing ones')
    
    if (sessionTable) console.log(`   ✅ Has sessions: ${sessionTable.tableName}`)
    if (linesTable) console.log(`   ✅ Has lines: ${linesTable.tableName}`)
    if (exerciseTable) console.log(`   ✅ Has exercises: ${exerciseTable.tableName}`)
    
    console.log('   ❌ Missing tables would be created during initialization')
    
  } else {
    console.log('❌ NO SRS RECOVERY POSSIBLE')
    console.log('   No SRS tables found - user needs full initialization')
    console.log('   UserTableService would create all 3 tables from scratch')
  }
  
  // Test table access if we have SRS tables
  if (srsTokens.length > 0) {
    console.log('\n🧪 Testing Table Access:')
    for (const table of srsTokens) {
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
  }
  
  // Summary for developers
  console.log('\n📋 Developer Summary:')
  console.log('====================')
  console.log(`• User owns ${tokens.length} Tableland tables total`)
  console.log(`• ${srsTokens.length} tables are SRS-related`)
  console.log(`• ${tokens.length - srsTokens.length} tables are for other purposes (songs, etc.)`)
  
  if (srsTokens.length === 3) {
    console.log('• ✅ UserTableService.recoverFromChain() would succeed')
  } else if (srsTokens.length > 0) {
    console.log('• ⚠️  UserTableService.recoverFromChain() would partially succeed')
    console.log('• 🔧 Missing tables would be created during initialization')
  } else {
    console.log('• ❌ UserTableService.recoverFromChain() would fail')
    console.log('• 🔧 Full initialization required via UserTableService.initializeUserTables()')
  }
}

testSrsTableRecovery().catch(console.error)