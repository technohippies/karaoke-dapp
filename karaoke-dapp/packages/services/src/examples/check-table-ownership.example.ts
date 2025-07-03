/**
 * Example: How to check Tableland table ownership on-chain
 * 
 * This example demonstrates how to use the TablelandRegistryService
 * to check if a user owns Tableland NFTs and recover table information.
 */

import { userTableService, tablelandRegistryService } from '../index'

async function checkTableOwnership() {
  // Example 1: Check if user owns any Tableland tables
  const userAddress = '0x1234567890abcdef...' // Replace with actual address
  
  // Initialize the services (requires a web3 provider)
  // const provider = window.ethereum // or any web3 provider
  // await userTableService.initialize(provider)
  
  // Get all tables owned by the user
  const ownedTables = await tablelandRegistryService.getOwnedTables(userAddress)
  console.log('Tables owned by user:', ownedTables)
  
  // Example output:
  // [
  //   {
  //     tokenId: 117,
  //     tableName: 'karaoke_sessions_abc123_84532_117',
  //     owner: '0x1234567890abcdef...',
  //     chainId: 84532
  //   },
  //   ...
  // ]
  
  // Example 2: Check if user owns a specific table
  const tableName = 'karaoke_sessions_abc123_84532_117'
  const ownsTable = await tablelandRegistryService.ownsTable(userAddress, tableName)
  console.log(`User owns table ${tableName}:`, ownsTable)
  
  // Example 3: Verify ownership of all user tables
  const hasValidOwnership = await userTableService.verifyTableOwnership(userAddress)
  console.log('User has valid ownership of all tables:', hasValidOwnership)
  
  // Example 4: Get detailed ownership info (for debugging)
  const ownershipInfo = await userTableService.getTableOwnershipInfo(userAddress)
  console.log('Detailed ownership info:', {
    ownedTables: ownershipInfo.ownedTables,
    creationEvents: ownershipInfo.creationEvents,
    currentTableInfo: ownershipInfo.currentTableInfo
  })
  
  // Example 5: Automatic recovery when tables exist but localStorage is out of sync
  // This happens automatically in getUserTables(), but you can also trigger it manually
  const tableInfo = await userTableService.getUserTables(userAddress)
  if (tableInfo) {
    console.log('User tables (with automatic recovery):', tableInfo)
  } else {
    console.log('No tables found for user')
  }
}

// Usage in React component:
/*
import { useEffect, useState } from 'react'
import { useAccount } from 'wagmi'
import { userTableService } from '@karaoke-dapp/services'

function MyComponent() {
  const { address, connector } = useAccount()
  const [tableInfo, setTableInfo] = useState(null)
  const [loading, setLoading] = useState(false)
  
  useEffect(() => {
    async function checkTables() {
      if (!address || !connector) return
      
      setLoading(true)
      try {
        const provider = await connector.getProvider()
        await userTableService.initialize(provider)
        
        // This will automatically check on-chain ownership if localStorage fails
        const info = await userTableService.getUserTables(address)
        setTableInfo(info)
        
        if (!info) {
          console.log('User has no tables, need to create them')
          // Optionally create tables: await userTableService.createUserTables(address)
        }
      } catch (error) {
        console.error('Failed to check tables:', error)
      } finally {
        setLoading(false)
      }
    }
    
    checkTables()
  }, [address, connector])
  
  return (
    <div>
      {loading ? (
        <p>Checking table ownership...</p>
      ) : tableInfo ? (
        <div>
          <p>Session Table: {tableInfo.karaokeSessionsTable}</p>
          <p>Lines Table: {tableInfo.karaokeLinesTable}</p>
          <p>Exercise Table: {tableInfo.exerciseSessionsTable}</p>
        </div>
      ) : (
        <p>No tables found</p>
      )}
    </div>
  )
}
*/

export { checkTableOwnership }