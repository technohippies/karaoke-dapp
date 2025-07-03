import { Database } from "@tableland/sdk"
import { ethers } from "ethers"
import type { UserTableInfo } from "./user-table-service"

// Base Sepolia Tableland Registry
const REGISTRY_ADDRESS = "0xA85aAE9f0Aec5F5638E5F13840797303Ab29c9f9"
const CHAIN_ID = 84532

// Minimal ABI for what we need
const REGISTRY_ABI = [
  // Events are the most reliable way to find tables
  "event CreateTable(address indexed owner, uint256 indexed tableId, string statement)",
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)",
  
  // Basic ownership check
  "function ownerOf(uint256 tokenId) view returns (address)"
]

export class TablelandRecoveryService {
  private provider: ethers.BrowserProvider
  private contract: ethers.Contract

  constructor(provider: any) {
    this.provider = new ethers.BrowserProvider(provider)
    this.contract = new ethers.Contract(REGISTRY_ADDRESS, REGISTRY_ABI, this.provider)
  }

  /**
   * Recover user tables by searching for CreateTable events
   * This is more reliable than trying to enumerate NFTs
   */
  async recoverUserTables(userAddress: string): Promise<UserTableInfo | null> {
    if (!userAddress || userAddress.trim() === '') {
      console.warn('Invalid userAddress provided to recoverUserTables:', userAddress)
      return null
    }
    
    try {
      console.log('🔍 Attempting to recover tables for:', userAddress)
      
      // Get all CreateTable events for this user
      const filter = this.contract.filters.CreateTable(userAddress)
      const events = await this.contract.queryFilter(filter)
      
      console.log(`Found ${events.length} CreateTable events`)
      
      // Look for our specific table patterns
      let karaokeSessionsTable: string | null = null
      let karaokeLinesTable: string | null = null
      let exerciseSessionsTable: string | null = null
      
      for (const event of events) {
        const tableId = (event as any).args[1].toString()
        const statement = (event as any).args[2]
        
        // Extract table name from CREATE TABLE statement
        const match = statement.match(/CREATE TABLE ([a-zA-Z0-9_]+)/i)
        if (match) {
          const tableName = match[1]
          console.log(`Found table: ${tableName} (ID: ${tableId})`)
          
          // Check if this user still owns the table
          try {
            const currentOwner = await this.contract.ownerOf(tableId)
            if (currentOwner.toLowerCase() !== userAddress.toLowerCase()) {
              console.log(`Table ${tableName} was transferred to another owner`)
              continue
            }
          } catch (error) {
            console.log(`Table ${tableName} might have been burned`)
            continue
          }
          
          // Match our expected table patterns
          if (tableName.includes('karaoke_sessions')) {
            karaokeSessionsTable = tableName
          } else if (tableName.includes('karaoke_lines')) {
            karaokeLinesTable = tableName
          } else if (tableName.includes('exercise_sessions')) {
            exerciseSessionsTable = tableName
          }
        }
      }
      
      // If we found all three tables, return the info
      if (karaokeSessionsTable && karaokeLinesTable && exerciseSessionsTable) {
        const tableInfo: UserTableInfo = {
          userAddress,
          karaokeSessionsTable,
          karaokeLinesTable,
          exerciseSessionsTable,
          chainId: CHAIN_ID,
          createdAt: new Date().toISOString()
        }
        
        console.log('✅ Successfully recovered all tables:', tableInfo)
        return tableInfo
      }
      
      console.log('❌ Could not find all required tables')
      return null
      
    } catch (error) {
      console.error('Failed to recover tables:', error)
      return null
    }
  }

  /**
   * Alternative: Try to find tables by checking known patterns
   * This is less reliable but can work if we know the table naming convention
   */
  async findTablesByPattern(userAddress: string): Promise<string[]> {
    const userPrefix = userAddress.slice(2, 8).toLowerCase()
    const db = new Database()
    
    const possibleTables: string[] = []
    
    // Try common patterns (this is a guess based on how tables might be named)
    const patterns = [
      `karaoke_sessions_${userPrefix}`,
      `karaoke_lines_${userPrefix}`,
      `exercise_sessions_${userPrefix}`
    ]
    
    for (const pattern of patterns) {
      try {
        // Try to query the table - if it exists, we'll get a result
        await db.prepare(`SELECT 1 FROM ${pattern} LIMIT 1`).all()
        possibleTables.push(pattern)
        console.log(`✅ Found table: ${pattern}`)
      } catch (error) {
        // Table doesn't exist or we don't have access
        console.log(`❌ Table not found: ${pattern}`)
      }
    }
    
    return possibleTables
  }
}