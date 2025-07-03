import { ethers, Contract } from "ethers"
import type { UserTableInfo } from "./user-table-service"

// Base Sepolia Registry Contract
const REGISTRY_ADDRESS = "0xA85aAE9f0Aec5F5638E5F13840797303Ab29c9f9"
const CHAIN_ID = 84532

// Minimal ABI for the Tableland Registry contract (ERC721 + Tableland specific)
const REGISTRY_ABI = [
  // ERC721 standard functions
  "function balanceOf(address owner) view returns (uint256)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function tokenURI(uint256 tokenId) view returns (string)",
  
  // Tableland specific - table name retrieval
  "function tables(uint256 tokenId) view returns (string)",
  
  // Events
  "event CreateTable(address indexed owner, uint256 indexed tableId, string statement)",
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)"
]

export interface TableNFT {
  tokenId: number
  tableName: string
  owner: string
  chainId: number
}

export class TablelandRegistryService {
  private contract: Contract | null = null
  private provider: ethers.Provider | null = null

  /**
   * Initialize the service with a provider
   */
  async initialize(provider: any): Promise<void> {
    if (!provider) throw new Error('Provider required')
    
    // Wrap the provider for ethers v6
    this.provider = new ethers.BrowserProvider(provider)
    this.contract = new Contract(REGISTRY_ADDRESS, REGISTRY_ABI, this.provider)
  }

  /**
   * Get all tables owned by a specific address
   */
  async getOwnedTables(address: string): Promise<TableNFT[]> {
    if (!this.contract) throw new Error('Service not initialized')
    
    try {
      // Get tables from Transfer events
      // First, get all transfers TO this address
      const transferToFilter = this.contract.filters.Transfer(null, address)
      const transferToEvents = await this.contract.queryFilter(transferToFilter)
      
      // Then, get all transfers FROM this address
      const transferFromFilter = this.contract.filters.Transfer(address, null)
      const transferFromEvents = await this.contract.queryFilter(transferFromFilter)
      
      // Build a set of token IDs currently owned
      const ownedTokenIds = new Set<number>()
      
      // Process all events chronologically
      const allEvents = [...transferToEvents, ...transferFromEvents].sort((a, b) => {
        if (a.blockNumber !== b.blockNumber) {
          return a.blockNumber - b.blockNumber
        }
        return a.index - b.index
      })
      
      for (const event of allEvents) {
        const tokenId = Number((event as any).args[2]) // tokenId is the 3rd argument
        const from = (event as any).args[0]
        const to = (event as any).args[1]
        
        if (to.toLowerCase() === address.toLowerCase()) {
          ownedTokenIds.add(tokenId)
        } else if (from.toLowerCase() === address.toLowerCase()) {
          ownedTokenIds.delete(tokenId)
        }
      }
      
      // Now verify ownership and get table names for owned tokens
      const tables: TableNFT[] = []
      
      for (const tokenId of ownedTokenIds) {
        try {
          // Double-check current ownership
          const currentOwner = await this.contract.ownerOf(tokenId)
          if (currentOwner.toLowerCase() === address.toLowerCase()) {
            const tableName = await this.getTableName(tokenId)
            tables.push({
              tokenId,
              tableName,
              owner: address,
              chainId: CHAIN_ID
            })
          }
        } catch (err) {
          // Token might have been burned or doesn't exist
          console.warn(`Token ${tokenId} no longer exists or accessible`, err)
        }
      }
      
      return tables
    } catch (error) {
      console.error('Failed to get owned tables:', error)
      return []
    }
  }

  /**
   * Get the table name for a specific token ID
   */
  async getTableName(tokenId: number): Promise<string> {
    if (!this.contract) throw new Error('Service not initialized')
    
    try {
      // Try the 'tables' method first (more direct)
      try {
        const tableName = await this.contract.tables(tokenId)
        if (tableName) return tableName
      } catch {
        // Fallback to parsing from tokenURI if tables() doesn't exist
      }
      
      // Fallback: construct table name from chain ID and token ID
      // Tableland table names follow the pattern: prefix_chainId_tokenId
      // We don't know the prefix, but we can make an educated guess
      return `table_${CHAIN_ID}_${tokenId}`
    } catch (error) {
      console.error('Failed to get table name:', error)
      return `unknown_${CHAIN_ID}_${tokenId}`
    }
  }

  /**
   * Check if an address owns a specific table
   */
  async ownsTable(address: string, tableName: string): Promise<boolean> {
    if (!this.contract) throw new Error('Service not initialized')
    
    try {
      // Extract token ID from table name (e.g., "karaoke_sessions_123456_84532_117")
      const parts = tableName.split('_')
      const tokenId = parts[parts.length - 1]
      
      if (!tokenId || isNaN(Number(tokenId))) {
        console.warn('Invalid table name format:', tableName)
        return false
      }
      
      const owner = await this.contract.ownerOf(tokenId)
      return owner.toLowerCase() === address.toLowerCase()
    } catch (error) {
      console.error('Failed to check table ownership:', error)
      return false
    }
  }

  /**
   * Recover user tables from on-chain data
   * This is useful when localStorage has data but tables don't exist in queries
   */
  async recoverUserTables(address: string, existingInfo: UserTableInfo | null): Promise<UserTableInfo | null> {
    const ownedTables = await this.getOwnedTables(address)
    
    if (ownedTables.length === 0) {
      console.log('No tables found on-chain for address:', address)
      return null
    }
    
    // Try to match tables based on naming patterns
    let karaokeSessionsTable: string | null = null
    let karaokeLinesTable: string | null = null
    let exerciseSessionsTable: string | null = null
    
    for (const table of ownedTables) {
      const name = table.tableName.toLowerCase()
      
      // Match based on common patterns in table names
      if (name.includes('karaoke_sessions') || name.includes('sessions')) {
        karaokeSessionsTable = table.tableName
      } else if (name.includes('karaoke_lines') || name.includes('lines')) {
        karaokeLinesTable = table.tableName
      } else if (name.includes('exercise_sessions') || name.includes('exercise')) {
        exerciseSessionsTable = table.tableName
      }
    }
    
    // If we have existing info, try to match more precisely
    if (existingInfo) {
      // Check if the existing table names are in our owned tables
      const ownedTableNames = ownedTables.map(t => t.tableName)
      
      if (ownedTableNames.includes(existingInfo.karaokeSessionsTable)) {
        karaokeSessionsTable = existingInfo.karaokeSessionsTable
      }
      if (ownedTableNames.includes(existingInfo.karaokeLinesTable)) {
        karaokeLinesTable = existingInfo.karaokeLinesTable
      }
      if (ownedTableNames.includes(existingInfo.exerciseSessionsTable)) {
        exerciseSessionsTable = existingInfo.exerciseSessionsTable
      }
    }
    
    // If we found all three tables, return the info
    if (karaokeSessionsTable && karaokeLinesTable && exerciseSessionsTable) {
      return {
        userAddress: address,
        karaokeSessionsTable,
        karaokeLinesTable,
        exerciseSessionsTable,
        chainId: CHAIN_ID,
        createdAt: existingInfo?.createdAt || new Date().toISOString()
      }
    }
    
    // Log what we found for debugging
    console.log('Found tables on-chain:', ownedTables)
    console.log('Matched tables:', {
      karaokeSessionsTable,
      karaokeLinesTable,
      exerciseSessionsTable
    })
    
    return null
  }

  /**
   * Get all table creation events for an address (useful for debugging)
   */
  async getTableCreationEvents(address: string): Promise<any[]> {
    if (!this.contract || !this.provider) throw new Error('Service not initialized')
    
    try {
      // Get events from the last 10000 blocks (adjust as needed)
      const currentBlock = await this.provider.getBlockNumber()
      const fromBlock = Math.max(0, currentBlock - 10000)
      
      const filter = this.contract.filters.CreateTable(address)
      const events = await this.contract.queryFilter(filter, fromBlock, currentBlock)
      
      return events.map(event => ({
        owner: (event as any).args?.[0],
        tableId: (event as any).args?.[1]?.toString(),
        statement: (event as any).args?.[2],
        blockNumber: event.blockNumber,
        transactionHash: event.transactionHash
      }))
    } catch (error) {
      console.error('Failed to get table creation events:', error)
      return []
    }
  }
}

// Singleton instance
export const tablelandRegistryService = new TablelandRegistryService()