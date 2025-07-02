import { Database } from "@tableland/sdk"
import { BrowserProvider } from "ethers"
import type { KaraokeSession } from "./session-storage"

export interface UserTableInfo {
  userAddress: string
  tableName: string
  chainId: number
  createdAt: string
}

export interface KaraokeHistoryRow {
  session_id: string
  song_id: number
  song_title: string
  artist_name: string
  total_score: number
  accuracy: number
  credits_used: number
  started_at: number
  completed_at: number
  
  // FSRS fields
  difficulty?: number
  stability?: number
  elapsed_days?: number
  scheduled_days?: number
  reps?: number
  lapses?: number
  state?: number
  last_review?: number | null
}

export class UserTableService {
  private db: Database | null = null
  private readonly STORAGE_KEY = 'karaoke_user_table'

  async initialize(provider: any): Promise<void> {
    if (!provider) throw new Error('Provider required')
    
    // Wrap the provider for ethers v6
    const ethersProvider = new BrowserProvider(provider)
    const signer = await ethersProvider.getSigner()
    
    this.db = new Database({ signer })
  }

  async getUserTableName(userAddress: string): Promise<string | null> {
    // Check local storage first
    const stored = localStorage.getItem(`${this.STORAGE_KEY}_${userAddress}`)
    if (stored) {
      const info: UserTableInfo = JSON.parse(stored)
      return info.tableName
    }
    
    return null
  }

  async createUserTable(userAddress: string): Promise<string> {
    if (!this.db) throw new Error('Database not initialized')
    
    // Check if table already exists
    const existing = await this.getUserTableName(userAddress)
    if (existing) return existing

    console.log('Creating Tableland table for user:', userAddress)
    
    try {
      // Create user-specific karaoke history table
      const { meta: createMeta } = await this.db
        .prepare(`
          CREATE TABLE karaoke_history_${userAddress.slice(2, 8)} (
            id INTEGER PRIMARY KEY,
            session_id TEXT UNIQUE NOT NULL,
            song_id INTEGER NOT NULL,
            song_title TEXT NOT NULL,
            artist_name TEXT NOT NULL,
            total_score INTEGER NOT NULL,
            accuracy INTEGER NOT NULL,
            credits_used INTEGER NOT NULL,
            started_at INTEGER NOT NULL,
            completed_at INTEGER NOT NULL,
            
            difficulty INTEGER DEFAULT 300,
            stability INTEGER DEFAULT 1000,
            elapsed_days INTEGER DEFAULT 0,
            scheduled_days INTEGER DEFAULT 0,
            reps INTEGER DEFAULT 0,
            lapses INTEGER DEFAULT 0,
            state INTEGER DEFAULT 0,
            last_review INTEGER
          )
        `)
        .run()

      // Get table name immediately without waiting for confirmation
      // This avoids the 404 errors during receipt polling
      const tableName = createMeta.txn?.names?.[0]
      
      if (tableName) {
        // Save to local storage
        const tableInfo: UserTableInfo = {
          userAddress,
          tableName,
          chainId: 84532, // Base Sepolia
          createdAt: new Date().toISOString()
        }
        
        localStorage.setItem(
          `${this.STORAGE_KEY}_${userAddress}`,
          JSON.stringify(tableInfo)
        )
        
        console.log('✅ User table created:', tableName)
        return tableName
      }
      
      throw new Error('Failed to get table name from transaction')
      
    } catch (error) {
      console.error('Failed to create user table:', error)
      throw error
    }
  }

  async saveKaraokeSession(userAddress: string, session: KaraokeSession, songId: number = 1): Promise<void> {
    if (!this.db) throw new Error('Database not initialized')
    
    // Ensure user has a table
    let tableName = await this.getUserTableName(userAddress)
    if (!tableName) {
      tableName = await this.createUserTable(userAddress)
    }

    // Calculate accuracy from line results
    const totalAccuracy = session.lines.reduce((sum, line) => sum + line.accuracy, 0) / session.lines.length

    // Prepare the data (converting floats to integers for Tableland)
    const historyRow: KaraokeHistoryRow = {
      session_id: session.sessionId,
      song_id: songId,
      song_title: session.songTitle,
      artist_name: session.artistName,
      total_score: Math.round((session.totalScore || 0) * 100), // Store as integer (e.g., 92.5% -> 9250)
      accuracy: Math.round(totalAccuracy * 100), // Store as integer (e.g., 92.5% -> 9250)
      credits_used: session.creditsUsed,
      started_at: session.startTime,
      completed_at: session.endTime || Date.now()
    }

    try {
      // Insert into Tableland
      await this.db
        .prepare(`
          INSERT INTO ${tableName} (
            session_id, song_id, song_title, artist_name,
            total_score, accuracy, credits_used,
            started_at, completed_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)
        .bind(
          historyRow.session_id,
          historyRow.song_id,
          historyRow.song_title,
          historyRow.artist_name,
          historyRow.total_score,
          historyRow.accuracy,
          historyRow.credits_used,
          historyRow.started_at,
          historyRow.completed_at
        )
        .run()

      // Skip waiting for confirmation to avoid 404 errors
      console.log('✅ Session queued for Tableland')
      
    } catch (error) {
      console.error('Failed to save session to Tableland:', error)
      throw error
    }
  }

  /**
   * Batch save multiple sessions at once for better performance
   */
  async batchSaveKaraokeSessions(userAddress: string, sessions: Array<{ session: KaraokeSession; songId: number }>): Promise<void> {
    if (!this.db) throw new Error('Database not initialized')
    
    // Ensure user has a table
    let tableName = await this.getUserTableName(userAddress)
    if (!tableName) {
      tableName = await this.createUserTable(userAddress)
    }

    const statements = sessions.map(({ session, songId }) => {
      const totalAccuracy = session.lines.reduce((sum, line) => sum + line.accuracy, 0) / session.lines.length
      
      return this.db!.prepare(`
        INSERT INTO ${tableName} (
          session_id, song_id, song_title, artist_name,
          total_score, accuracy, credits_used,
          started_at, completed_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        session.sessionId,
        songId,
        session.songTitle,
        session.artistName,
        Math.round((session.totalScore || 0) * 100),
        Math.round(totalAccuracy * 100),
        session.creditsUsed,
        session.startTime,
        session.endTime || Date.now()
      )
    })

    try {
      // Batch insert all sessions in a single transaction
      await this.db.batch(statements)
      console.log(`✅ Batch saved ${sessions.length} sessions to Tableland`)
    } catch (error) {
      console.error('Failed to batch save sessions:', error)
      throw error
    }
  }

  async verifyTableExists(tableName: string): Promise<boolean> {
    try {
      // Use Tableland REST API to check if table exists
      const response = await fetch(
        `https://testnets.tableland.network/api/v1/tables/84532/${tableName.split('_').pop()}`
      )
      return response.ok
    } catch (error) {
      console.error('Failed to verify table:', error)
      return false
    }
  }

  async getUserHistory(userAddress: string): Promise<KaraokeHistoryRow[]> {
    if (!this.db) throw new Error('Database not initialized')
    
    const tableName = await this.getUserTableName(userAddress)
    if (!tableName) {
      return [] // No table means no history
    }

    try {
      const { results } = await this.db
        .prepare(`
          SELECT * FROM ${tableName}
          ORDER BY completed_at DESC
        `)
        .all<KaraokeHistoryRow>()

      return results
    } catch (error) {
      console.error('Failed to fetch user history:', error)
      return []
    }
  }

  async updateFSRSData(
    userAddress: string, 
    sessionId: string, 
    fsrsData: Partial<KaraokeHistoryRow>
  ): Promise<void> {
    if (!this.db) throw new Error('Database not initialized')
    
    const tableName = await this.getUserTableName(userAddress)
    if (!tableName) throw new Error('User table not found')

    const updateFields = []
    const values = []
    
    // Build dynamic update query
    if (fsrsData.difficulty !== undefined) {
      updateFields.push('difficulty = ?')
      values.push(fsrsData.difficulty)
    }
    if (fsrsData.stability !== undefined) {
      updateFields.push('stability = ?')
      values.push(fsrsData.stability)
    }
    if (fsrsData.elapsed_days !== undefined) {
      updateFields.push('elapsed_days = ?')
      values.push(fsrsData.elapsed_days)
    }
    if (fsrsData.scheduled_days !== undefined) {
      updateFields.push('scheduled_days = ?')
      values.push(fsrsData.scheduled_days)
    }
    if (fsrsData.reps !== undefined) {
      updateFields.push('reps = ?')
      values.push(fsrsData.reps)
    }
    if (fsrsData.lapses !== undefined) {
      updateFields.push('lapses = ?')
      values.push(fsrsData.lapses)
    }
    if (fsrsData.state !== undefined) {
      updateFields.push('state = ?')
      values.push(fsrsData.state)
    }
    if (fsrsData.last_review !== undefined) {
      updateFields.push('last_review = ?')
      values.push(fsrsData.last_review)
    }
    
    if (updateFields.length === 0) return
    
    values.push(sessionId) // For WHERE clause

    try {
      await this.db
        .prepare(`
          UPDATE ${tableName}
          SET ${updateFields.join(', ')}
          WHERE session_id = ?
        `)
        .bind(...values)
        .run()

      // Skip waiting for confirmation to avoid 404 errors
      console.log('✅ FSRS data update queued')
      
    } catch (error) {
      console.error('Failed to update FSRS data:', error)
      throw error
    }
  }
}

// Singleton instance
export const userTableService = new UserTableService()