#!/usr/bin/env node
import { ethers } from 'ethers'
import ora from 'ora'
import dotenv from 'dotenv'

dotenv.config()

const TEST_WALLET_ADDRESS = '0x7d3924A73f1242663fD8BbD1f2559fa6081Ba6D1'
const RPC_URL = 'https://base-sepolia-rpc.publicnode.com'
const REGISTRY_ADDRESS = "0xA85aAE9f0Aec5F5638E5F13840797303Ab29c9f9"
const CHAIN_ID = 84532

async function findUserTables() {
  console.log('🔍 Finding Tableland Tables for User')
  console.log('====================================\n')
  console.log(`Wallet: ${TEST_WALLET_ADDRESS}`)
  console.log(`Chain: Base Sepolia (${CHAIN_ID})\n`)

  const provider = new ethers.JsonRpcProvider(RPC_URL)
  
  const REGISTRY_ABI = [
    "function ownerOf(uint256 tokenId) view returns (address)",
    "function balanceOf(address owner) view returns (uint256)",
    "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)"
  ]
  
  const contract = new ethers.Contract(REGISTRY_ADDRESS, REGISTRY_ABI, provider)
  
  // First, get the balance
  const balanceSpinner = ora('Checking NFT balance...').start()
  try {
    const balance = await contract.balanceOf(TEST_WALLET_ADDRESS)
    balanceSpinner.succeed(`Wallet owns ${balance} Tableland NFTs`)
  } catch (error: any) {
    balanceSpinner.fail(`Failed to get balance: ${error.message}`)
    return
  }

  // Find owned tokens by checking recent blocks
  const tokenSpinner = ora('Finding owned token IDs...').start()
  try {
    const currentBlock = await provider.getBlockNumber()
    const blocksToCheck = 10000 // Check last ~10k blocks
    const fromBlock = Math.max(0, currentBlock - blocksToCheck)
    
    // Get Transfer events TO this address
    const transfersIn = await contract.queryFilter(
      contract.filters.Transfer(null, TEST_WALLET_ADDRESS),
      fromBlock,
      currentBlock
    )
    
    // Get Transfer events FROM this address
    const transfersOut = await contract.queryFilter(
      contract.filters.Transfer(TEST_WALLET_ADDRESS, null),
      fromBlock,
      currentBlock
    )
    
    // Track token ownership
    const ownedTokens = new Set<string>()
    
    // Process events chronologically
    const allEvents = [...transfersIn, ...transfersOut].sort((a, b) => {
      if (a.blockNumber !== b.blockNumber) return a.blockNumber - b.blockNumber
      return (a.index || 0) - (b.index || 0)
    })
    
    for (const event of allEvents) {
      const tokenId = event.args[2].toString()
      const from = event.args[0]
      const to = event.args[1]
      
      if (to.toLowerCase() === TEST_WALLET_ADDRESS.toLowerCase()) {
        ownedTokens.add(tokenId)
      } else if (from.toLowerCase() === TEST_WALLET_ADDRESS.toLowerCase()) {
        ownedTokens.delete(tokenId)
      }
    }
    
    tokenSpinner.succeed(`Found ${ownedTokens.size} owned tokens from recent events`)
    
    // Verify ownership and get table names
    console.log('\nVerifying token ownership and table names:')
    const verifiedTables = []
    
    for (const tokenId of ownedTokens) {
      try {
        const owner = await contract.ownerOf(tokenId)
        if (owner.toLowerCase() === TEST_WALLET_ADDRESS.toLowerCase()) {
          // Construct table name - we need to find the prefix
          // Try common prefixes
          const prefixes = [
            'karaoke_sessions',
            'karaoke_lines',
            'exercise_sessions',
            'songs_v5',
            'table'
          ]
          
          for (const prefix of prefixes) {
            const tableName = `${prefix}_${CHAIN_ID}_${tokenId}`
            
            // Test if table exists
            try {
              const response = await fetch(
                `https://testnets.tableland.network/api/v1/query?` +
                new URLSearchParams({
                  statement: `SELECT 1 FROM ${tableName} LIMIT 1`,
                  unwrap: 'true'
                })
              )
              
              if (response.ok) {
                verifiedTables.push({ tokenId, tableName })
                console.log(`  ✅ Token ${tokenId}: ${tableName}`)
                break // Found the right prefix
              }
            } catch (err) {
              // Continue trying other prefixes
            }
          }
        }
      } catch (err) {
        console.log(`  ❌ Token ${tokenId}: No longer owned or error`)
      }
    }
    
    // Check for SRS table patterns
    console.log('\n📊 Analysis:')
    const srsTablePatterns = {
      sessions: verifiedTables.find(t => t.tableName.includes('karaoke_sessions')),
      lines: verifiedTables.find(t => t.tableName.includes('karaoke_lines')),
      exercises: verifiedTables.find(t => t.tableName.includes('exercise_sessions'))
    }
    
    if (srsTablePatterns.sessions && srsTablePatterns.lines && srsTablePatterns.exercises) {
      console.log('✅ Found complete SRS table set:')
      console.log(`  - Sessions: ${srsTablePatterns.sessions.tableName}`)
      console.log(`  - Lines: ${srsTablePatterns.lines.tableName}`)
      console.log(`  - Exercises: ${srsTablePatterns.exercises.tableName}`)
      
      // Test queries on these tables
      console.log('\n🔍 Testing table queries:')
      for (const [type, table] of Object.entries(srsTablePatterns)) {
        if (!table) continue
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
            console.log(`  - ${type}: ${data[0]?.count || 0} rows`)
          }
        } catch (err) {
          console.log(`  - ${type}: Query failed`)
        }
      }
    } else {
      console.log('⚠️  Incomplete SRS table set found:')
      console.log(`  - Sessions: ${srsTablePatterns.sessions ? '✅' : '❌'}`)
      console.log(`  - Lines: ${srsTablePatterns.lines ? '✅' : '❌'}`)
      console.log(`  - Exercises: ${srsTablePatterns.exercises ? '✅' : '❌'}`)
    }
    
    // If we couldn't find tables via events, try a broader search
    if (verifiedTables.length === 0) {
      console.log('\n🔄 Attempting broader token ID search...')
      
      // Try common token ID ranges
      const testRanges = [
        { start: 1, end: 50 },
        { start: 100, end: 150 },
        { start: 200, end: 250 },
        { start: 300, end: 350 }
      ]
      
      for (const range of testRanges) {
        for (let tokenId = range.start; tokenId <= range.end; tokenId++) {
          try {
            const owner = await contract.ownerOf(tokenId)
            if (owner.toLowerCase() === TEST_WALLET_ADDRESS.toLowerCase()) {
              console.log(`  Found token ${tokenId} owned by wallet`)
              
              // Try to determine table name
              for (const prefix of ['karaoke_sessions', 'karaoke_lines', 'exercise_sessions']) {
                const tableName = `${prefix}_${CHAIN_ID}_${tokenId}`
                const response = await fetch(
                  `https://testnets.tableland.network/api/v1/query?` +
                  new URLSearchParams({
                    statement: `SELECT 1 FROM ${tableName} LIMIT 1`,
                    unwrap: 'true'
                  })
                )
                
                if (response.ok) {
                  console.log(`    → Table: ${tableName}`)
                  break
                }
              }
            }
          } catch (err) {
            // Token doesn't exist, continue
          }
        }
      }
    }
    
  } catch (error: any) {
    tokenSpinner.fail(`Failed to find tokens: ${error.message}`)
  }
}

// Run the finder
findUserTables().catch(console.error)