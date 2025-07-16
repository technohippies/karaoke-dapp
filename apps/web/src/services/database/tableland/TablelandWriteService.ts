import { Database, Registry } from '@tableland/sdk'
import { ethers } from 'ethers'

interface UserTableInfo {
  karaokeSessionsTable: string
  karaokeLinesTable: string
  exerciseSessionsTable: string
}

interface KaraokeSession {
  user_address: string
  song_id: number
  session_hash: string
  overall_score: number
  started_at: number
  completed_at: number
}


export class TablelandWriteService {
  private db: Database | null = null
  private registry: Registry | null = null
  private STORAGE_KEY = 'karaoke_tables'
  private CHAIN_ID = 11155420 // Optimism Sepolia

  async initialize(signer: ethers.Signer, forceReinit = false) {
    if (!this.db || !this.registry || forceReinit) {
      try {
        // Configure for Optimism Sepolia
        this.db = new Database({ 
          signer,
          baseUrl: 'https://testnets.tableland.network/api/v1'
        })
        this.registry = new Registry({ signer })
        console.log('✅ Tableland Database and Registry initialized')
      } catch (error) {
        console.error('❌ Failed to create Database/Registry instance:', error)
        throw error
      }
    }
  }

  /**
   * Get user's table names from localStorage or create if needed
   */
  async getUserTables(userAddress: string): Promise<UserTableInfo | null> {
    // Check local storage first
    const storageKey = `${this.STORAGE_KEY}_${userAddress}`
    const stored = localStorage.getItem(storageKey)
    
    if (stored) {
      console.log('📂 Found cached table info in localStorage:', storageKey)
      const tableInfo = JSON.parse(stored)
      
      // Verify tables still exist by attempting a simple query
      if (this.db) {
        try {
          console.log('🔍 Verifying table exists:', tableInfo.karaokeSessionsTable)
          await this.db
            .prepare(`SELECT COUNT(*) FROM ${tableInfo.karaokeSessionsTable} LIMIT 1`)
            .all()
          
          console.log('✅ Tables verified and accessible')
          return tableInfo // Tables exist!
        } catch (error) {
          // Tables don't exist anymore, clear localStorage
          console.warn('❌ Tables not accessible, clearing cache...', error)
          localStorage.removeItem(storageKey)
        }
      }
    } else {
      console.log('📂 No cached table info found for:', userAddress)
    }

    // If not in storage or verification failed, try to find existing tables
    return await this.findExistingTables(userAddress)
  }

  /**
   * Try to find existing tables using pattern matching
   */
  private async findExistingTables(userAddress: string): Promise<UserTableInfo | null> {
    if (!this.db) return null

    // User prefix for table names (first 6 chars of address)
    // const userPrefix = userAddress.slice(2, 8).toLowerCase()
    
    // We can't query for tables directly, but we can try common patterns
    // This is a simplified approach - in production you'd use the Registry API
    console.log('Attempting to find existing tables for user:', userAddress)
    
    // For now, return null to trigger table creation
    // In a full implementation, you'd use the Registry API here
    return null
  }

  /**
   * Create tables for a new user
   */
  async createUserTables(userAddress: string): Promise<UserTableInfo> {
    if (!this.db) {
      throw new Error('Database not initialized')
    }

    const userPrefix = userAddress.slice(2, 8).toLowerCase()
    console.log('Creating tables for user:', userAddress, 'with prefix:', userPrefix)

    // Create karaoke sessions table
    const sessionsPrefix = `karaoke_sessions_${userPrefix}`
    const { meta: sessionsMeta } = await this.db
      .prepare(`CREATE TABLE ${sessionsPrefix} (
        id INTEGER PRIMARY KEY,
        user_address TEXT NOT NULL,
        song_id INTEGER NOT NULL,
        session_hash TEXT UNIQUE NOT NULL,
        overall_score INTEGER NOT NULL,
        started_at INTEGER NOT NULL,
        completed_at INTEGER NOT NULL
      )`)
      .run()
    
    await sessionsMeta.txn?.wait()
    const karaokeSessionsTable = sessionsMeta.txn?.names?.[0]
    if (!karaokeSessionsTable) throw new Error('Failed to create sessions table')

    // Create karaoke lines table
    const linesPrefix = `karaoke_lines_${userPrefix}`
    const { meta: linesMeta } = await this.db
      .prepare(`CREATE TABLE ${linesPrefix} (
        id INTEGER PRIMARY KEY,
        session_hash TEXT NOT NULL,
        line_index INTEGER NOT NULL,
        expected_text TEXT NOT NULL,
        transcribed_text TEXT,
        score INTEGER NOT NULL,
        needs_practice INTEGER NOT NULL
      )`)
      .run()
    
    await linesMeta.txn?.wait()
    const karaokeLinesTable = linesMeta.txn?.names?.[0]
    if (!karaokeLinesTable) throw new Error('Failed to create lines table')

    // Create exercise sessions table
    const exercisePrefix = `exercise_sessions_${userPrefix}`
    const { meta: exerciseMeta } = await this.db
      .prepare(`CREATE TABLE ${exercisePrefix} (
        id INTEGER PRIMARY KEY,
        user_address TEXT NOT NULL,
        session_hash TEXT NOT NULL,
        line_text TEXT NOT NULL,
        user_input TEXT,
        score INTEGER,
        completed_at INTEGER NOT NULL
      )`)
      .run()
    
    await exerciseMeta.txn?.wait()
    const exerciseSessionsTable = exerciseMeta.txn?.names?.[0]
    if (!exerciseSessionsTable) throw new Error('Failed to create exercise table')

    const tableInfo: UserTableInfo = {
      karaokeSessionsTable,
      karaokeLinesTable,
      exerciseSessionsTable
    }

    // Cache in localStorage
    localStorage.setItem(`${this.STORAGE_KEY}_${userAddress}`, JSON.stringify(tableInfo))

    console.log('Created tables:', tableInfo)
    return tableInfo
  }

  /**
   * Save karaoke session results
   */
  async saveKaraokeSession(
    userAddress: string,
    songId: number,
    score: number,
    scoringDetails: any,
    _transcript: string,
    startedAt: number
  ): Promise<string> {
    if (!this.db) {
      throw new Error('Database not initialized')
    }

    // Get or create user tables
    let tables = await this.getUserTables(userAddress)
    if (!tables) {
      console.log('No existing tables found, creating new ones...')
      tables = await this.createUserTables(userAddress)
    }

    // Generate session hash
    const sessionHash = `${userAddress}_${songId}_${Date.now()}`
    const completedAt = Date.now()

    // Prepare batch statements
    const statements = []
    
    // Add session insert
    statements.push(
      this.db
        .prepare(`INSERT INTO ${tables.karaokeSessionsTable} 
          (user_address, song_id, session_hash, overall_score, started_at, completed_at) 
          VALUES (?, ?, ?, ?, ?, ?)`)
        .bind(userAddress, songId, sessionHash, score, startedAt, completedAt)
    )

    // Add line data inserts if available
    if (scoringDetails?.lines && Array.isArray(scoringDetails.lines)) {
      for (const line of scoringDetails.lines) {
        statements.push(
          this.db
            .prepare(`INSERT INTO ${tables.karaokeLinesTable}
              (session_hash, line_index, expected_text, transcribed_text, score, needs_practice)
              VALUES (?, ?, ?, ?, ?, ?)`)
            .bind(
              sessionHash,
              line.lineIndex,
              line.expectedText || '',
              line.transcribedText || '',
              line.score,
              line.needsPractice ? 1 : 0
            )
        )
      }
    }

    // Execute all statements in a single batch (single transaction/signature)
    console.log(`📦 Batching ${statements.length} statements into single transaction`)
    const results = await this.db.batch(statements)
    
    // Since it's a batch of mutating queries, we get a single result with the transaction
    if (results && results[0] && results[0].meta?.txn) {
      await results[0].meta.txn.wait()
    }

    console.log('✅ Saved karaoke session:', sessionHash)
    return sessionHash
  }

  /**
   * Get user's karaoke history
   */
  async getUserHistory(userAddress: string): Promise<KaraokeSession[]> {
    if (!this.db) {
      throw new Error('Database not initialized')
    }

    const tables = await this.getUserTables(userAddress)
    if (!tables) {
      return []
    }

    const { results } = await this.db
      .prepare(`SELECT * FROM ${tables.karaokeSessionsTable} 
        WHERE user_address = ? 
        ORDER BY completed_at DESC`)
      .bind(userAddress)
      .all()

    return results as KaraokeSession[]
  }
}

// Export singleton instance
export const tablelandWriteService = new TablelandWriteService()