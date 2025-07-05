import { Database, Registry } from "@tableland/sdk"
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
   * Recover user tables using Tableland SDK Registry
   */
  async recoverUserTables(userAddress: string): Promise<UserTableInfo | null> {
    if (!userAddress || userAddress.trim() === '') {
      console.warn('Invalid userAddress provided to recoverUserTables:', userAddress)
      return null
    }
    
    try {
      console.log('🔍 Attempting to recover tables using Tableland Registry for:', userAddress)
      
      // Use the Tableland SDK Registry to list tables
      const signer = await this.provider.getSigner()
      const registry = new Registry({ signer })
      
      try {
        // List all tables owned by the user
        const tables = await registry.listTables(userAddress)
        console.log(`Found ${tables.length} tables owned by user`)
        
        if (tables.length > 0) {
          // Filter for Base Sepolia tables only
          const baseSepoliaTables = tables.filter(t => t.chainId === CHAIN_ID)
          if (baseSepoliaTables.length > 0) {
            return await this.identifyUserTables(baseSepoliaTables, userAddress)
          }
        }
      } catch (error) {
        console.log('Registry.listTables failed:', error)
      }
      
      console.log('❌ Could not recover tables from Registry')
      return null
      
    } catch (error) {
      console.error('Failed to recover tables:', error)
      return null
    }
  }

  /**
   * Identify user tables from a list of table IDs
   */
  private async identifyUserTables(
    tables: Array<{ tableId: string; chainId: number }>,
    userAddress: string
  ): Promise<UserTableInfo | null> {
    const db = new Database()
    let karaokeSessionsTable: string | null = null
    let karaokeLinesTable: string | null = null
    let exerciseSessionsTable: string | null = null
    
    // We need to identify tables based on their structure
    // Since we know the user prefix, we can build the expected table names
    const userPrefix = userAddress.slice(2, 8).toLowerCase()
    
    for (const { tableId, chainId } of tables) {
      if (chainId !== CHAIN_ID) continue
      
      try {
        // Tableland table names follow the pattern: {prefix}_{chainId}_{tableId}
        // We'll check each possible prefix
        const possiblePrefixes = [
          `karaoke_sessions_${userPrefix}`,
          `karaoke_lines_${userPrefix}`,
          `exercise_sessions_${userPrefix}`
        ]
        
        for (const prefix of possiblePrefixes) {
          const tableName = `${prefix}_${chainId}_${tableId}`
          
          try {
            // Try to query the table - if it succeeds, it exists
            await db.prepare(`SELECT 1 FROM ${tableName} LIMIT 1`).all()
            
            // Table exists! Identify which type it is
            if (prefix.startsWith('karaoke_sessions')) {
              karaokeSessionsTable = tableName
              console.log(`✅ Identified karaoke_sessions table: ${tableName}`)
            } else if (prefix.startsWith('karaoke_lines')) {
              karaokeLinesTable = tableName
              console.log(`✅ Identified karaoke_lines table: ${tableName}`)
            } else if (prefix.startsWith('exercise_sessions')) {
              exerciseSessionsTable = tableName
              console.log(`✅ Identified exercise_sessions table: ${tableName}`)
            }
            
            break // Found the right prefix for this tableId
          } catch {
            // This prefix doesn't match, try the next one
          }
        }
      } catch (error) {
        console.log(`Failed to identify table with ID ${tableId}:`, error)
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
      
      console.log('✅ Successfully identified all tables:', tableInfo)
      return tableInfo
    }
    
    console.log('❌ Could not find all required tables')
    return null
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