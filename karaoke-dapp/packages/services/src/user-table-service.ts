import { Database } from "@tableland/sdk"
import { BrowserProvider } from "ethers"
import type { KaraokeSession } from "./session-storage"
import { TablelandRecoveryService } from "./tableland-recovery"
import { tablelandRegistryService } from "./tableland-registry-service"

export interface UserTableInfo {
  userAddress: string
  karaokeSessionsTable: string
  karaokeLinesTable: string
  exerciseSessionsTable: string
  chainId: number
  createdAt: string
}

export interface KaraokeSessionRow {
  session_id: string
  song_id: number
  song_title: string
  artist_name: string
  total_score: number
  started_at: number
  completed_at: number
}

export interface KaraokeLinesRow {
  song_id: number
  line_index: number
  line_text: string
  difficulty: number
  stability: number
  elapsed_days: number
  scheduled_days: number
  reps: number
  lapses: number
  state: number
  last_review: number | null
  due_date: number
  created_at: number
  updated_at: number
}

export interface ExerciseSessionRow {
  session_id: string
  cards_reviewed: number
  cards_correct: number
  session_date: number // YYYYMMDD format
  started_at: number
  completed_at: number
}

export class UserTableService {
  private db: Database | null = null
  private recoveryService: TablelandRecoveryService | null = null
  private readonly STORAGE_KEY = 'karaoke_user_tables'

  async initialize(provider: any): Promise<void> {
    if (!provider) throw new Error('Provider required')
    
    // Wrap the provider for ethers v6
    const ethersProvider = new BrowserProvider(provider)
    const signer = await ethersProvider.getSigner()
    
    this.db = new Database({ signer })
    
    // Initialize recovery service
    this.recoveryService = new TablelandRecoveryService(provider)
  }

  async getUserTables(userAddress: string): Promise<UserTableInfo | null> {
    if (!userAddress || userAddress.trim() === '') {
      console.warn('Invalid userAddress provided to getUserTables:', userAddress)
      return null
    }
    
    // Check local storage first
    const stored = localStorage.getItem(`${this.STORAGE_KEY}_${userAddress}`)
    if (stored) {
      const tableInfo = JSON.parse(stored)
      
      // Verify tables still exist by attempting a simple query
      if (this.db) {
        try {
          // Try to query the sessions table to ensure it exists
          await this.db
            .prepare(`SELECT COUNT(*) FROM ${tableInfo.karaokeSessionsTable} LIMIT 1`)
            .all()
          
          return tableInfo
        } catch (error) {
          // Tables don't exist anymore, clear localStorage
          console.warn('Tables not accessible, clearing cache...', error)
          localStorage.removeItem(`${this.STORAGE_KEY}_${userAddress}`)
        }
      }
    }
    
    // Try a quick check for tables with common naming patterns
    if (this.db) {
      const userPrefix = userAddress.slice(2, 8).toLowerCase()
      const possibleNames = {
        sessions: `karaoke_sessions_${userPrefix}`,
        lines: `karaoke_lines_${userPrefix}`,
        exercise: `exercise_sessions_${userPrefix}`
      }
      
      try {
        // Check if all three tables exist
        await Promise.all([
          this.db.prepare(`SELECT 1 FROM ${possibleNames.sessions} LIMIT 1`).all(),
          this.db.prepare(`SELECT 1 FROM ${possibleNames.lines} LIMIT 1`).all(),
          this.db.prepare(`SELECT 1 FROM ${possibleNames.exercise} LIMIT 1`).all()
        ])
        
        // If we get here, all tables exist
        const tableInfo: UserTableInfo = {
          userAddress,
          karaokeSessionsTable: possibleNames.sessions,
          karaokeLinesTable: possibleNames.lines,
          exerciseSessionsTable: possibleNames.exercise,
          chainId: 84532,
          createdAt: new Date().toISOString()
        }
        
        // Save to localStorage for next time
        localStorage.setItem(
          `${this.STORAGE_KEY}_${userAddress}`,
          JSON.stringify(tableInfo)
        )
        
        console.log('✅ Found existing tables with standard naming')
        return tableInfo
      } catch (error) {
        // Tables with standard naming don't exist
        console.log('Tables with standard naming not found')
      }
    }
    
    // Last resort: try blockchain recovery for non-standard table names
    if (this.recoveryService) {
      console.log('Attempting blockchain recovery for non-standard table names...')
      const recovered = await this.recoveryService.recoverUserTables(userAddress)
      if (recovered) {
        // Save to localStorage for next time
        localStorage.setItem(
          `${this.STORAGE_KEY}_${userAddress}`,
          JSON.stringify(recovered)
        )
        return recovered
      }
    }
    
    return null
  }

  async createUserTables(userAddress: string): Promise<UserTableInfo> {
    if (!this.db) throw new Error('Database not initialized')
    
    if (!userAddress || userAddress.trim() === '') {
      throw new Error('Invalid userAddress provided to createUserTables')
    }
    
    // Check if tables already exist
    const existing = await this.getUserTables(userAddress)
    if (existing) return existing

    console.log('Creating Tableland tables for user:', userAddress)
    
    try {
      // Create three tables in parallel
      const userPrefix = userAddress.slice(2, 8).toLowerCase()
      
      // 1. Karaoke sessions table
      const { meta: sessionsMeta } = await this.db
        .prepare(`
          CREATE TABLE karaoke_sessions_${userPrefix} (
            id INTEGER PRIMARY KEY,
            session_id TEXT UNIQUE NOT NULL,
            song_id INTEGER NOT NULL,
            song_title TEXT NOT NULL,
            artist_name TEXT NOT NULL,
            total_score INTEGER NOT NULL,
            started_at INTEGER NOT NULL,
            completed_at INTEGER NOT NULL
          )
        `)
        .run()

      // 2. Karaoke lines table (with FSRS)
      const { meta: linesMeta } = await this.db
        .prepare(`
          CREATE TABLE karaoke_lines_${userPrefix} (
            id INTEGER PRIMARY KEY,
            song_id INTEGER NOT NULL,
            line_index INTEGER NOT NULL,
            line_text TEXT NOT NULL,
            difficulty INTEGER DEFAULT 250,
            stability INTEGER DEFAULT 100,
            elapsed_days INTEGER DEFAULT 0,
            scheduled_days INTEGER DEFAULT 1,
            reps INTEGER DEFAULT 0,
            lapses INTEGER DEFAULT 0,
            state INTEGER DEFAULT 0,
            last_review INTEGER,
            due_date INTEGER NOT NULL,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL,
            UNIQUE(song_id, line_index)
          )
        `)
        .run()

      // 3. Exercise sessions table
      const { meta: exerciseMeta } = await this.db
        .prepare(`
          CREATE TABLE exercise_sessions_${userPrefix} (
            id INTEGER PRIMARY KEY,
            session_id TEXT UNIQUE NOT NULL,
            cards_reviewed INTEGER NOT NULL,
            cards_correct INTEGER NOT NULL,
            session_date INTEGER NOT NULL,
            started_at INTEGER NOT NULL,
            completed_at INTEGER NOT NULL
          )
        `)
        .run()

      // Get table names
      const sessionsTable = sessionsMeta.txn?.names?.[0]
      const linesTable = linesMeta.txn?.names?.[0]
      const exerciseTable = exerciseMeta.txn?.names?.[0]
      
      if (sessionsTable && linesTable && exerciseTable) {
        // Save to local storage
        const tableInfo: UserTableInfo = {
          userAddress,
          karaokeSessionsTable: sessionsTable,
          karaokeLinesTable: linesTable,
          exerciseSessionsTable: exerciseTable,
          chainId: 84532, // Base Sepolia
          createdAt: new Date().toISOString()
        }
        
        localStorage.setItem(
          `${this.STORAGE_KEY}_${userAddress}`,
          JSON.stringify(tableInfo)
        )
        
        console.log('✅ User tables created:', tableInfo)
        return tableInfo
      }
      
      throw new Error('Failed to get table names from transaction')
      
    } catch (error) {
      console.error('Failed to create user tables:', error)
      throw error
    }
  }

  async saveKaraokeSession(userAddress: string, session: KaraokeSession, songId: number = 1): Promise<void> {
    if (!this.db) throw new Error('Database not initialized')
    
    // Ensure user has tables
    let tables = await this.getUserTables(userAddress)
    if (!tables) {
      tables = await this.createUserTables(userAddress)
    }

    // Prepare the session data
    const sessionRow: KaraokeSessionRow = {
      session_id: session.sessionId,
      song_id: songId,
      song_title: session.songTitle,
      artist_name: session.artistName,
      total_score: Math.round((session.totalScore || 0) * 100), // Store as integer (e.g., 92.5% -> 9250)
      started_at: session.startTime,
      completed_at: session.endTime || Date.now()
    }

    try {
      // Insert into sessions table
      await this.db
        .prepare(`
          INSERT INTO ${tables.karaokeSessionsTable} (
            session_id, song_id, song_title, artist_name,
            total_score, started_at, completed_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `)
        .bind(
          sessionRow.session_id,
          sessionRow.song_id,
          sessionRow.song_title,
          sessionRow.artist_name,
          sessionRow.total_score,
          sessionRow.started_at,
          sessionRow.completed_at
        )
        .run()

      console.log('✅ Session saved to Tableland')
      
      // Now update FSRS for each line
      const now = Date.now()
      for (const line of session.lines) {
        await this.updateLineCard(userAddress, songId, line.lineIndex, line.expectedText, line.accuracy >= 0.7, now)
      }
      
    } catch (error) {
      console.error('Failed to save session to Tableland:', error)
      throw error
    }
  }

  async updateLineCard(
    userAddress: string,
    songId: number,
    lineIndex: number,
    lineText: string,
    wasCorrect: boolean,
    reviewTime: number
  ): Promise<void> {
    if (!this.db) throw new Error('Database not initialized')
    
    const tables = await this.getUserTables(userAddress)
    if (!tables) throw new Error('User tables not found')

    try {
      // Check if line exists
      const { results } = await this.db
        .prepare(`
          SELECT * FROM ${tables.karaokeLinesTable}
          WHERE song_id = ? AND line_index = ?
        `)
        .bind(songId, lineIndex)
        .all<KaraokeLinesRow>()

      if (results.length === 0) {
        // Create new line card
        const now = Date.now()
        await this.db
          .prepare(`
            INSERT INTO ${tables.karaokeLinesTable} (
              song_id, line_index, line_text,
              difficulty, stability, elapsed_days, scheduled_days,
              reps, lapses, state, last_review, due_date,
              created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `)
          .bind(
            songId, lineIndex, lineText,
            250, 100, 0, 1, // FSRS defaults
            1, wasCorrect ? 0 : 1, wasCorrect ? 1 : 0, reviewTime,
            now + 86400000, // Due tomorrow
            now, now
          )
          .run()
      } else {
        // Update existing line card
        const existing = results[0]
        const newReps = existing.reps + 1
        const newLapses = existing.lapses + (wasCorrect ? 0 : 1)
        
        // Simple FSRS-like update (you'd want real FSRS logic here)
        const newStability = wasCorrect 
          ? Math.min(existing.stability * 2, 36500) // Max ~100 days
          : Math.max(existing.stability / 2, 100) // Min 1 day
        
        const newDueDate = reviewTime + (newStability * 10) // stability in 0.01 days
        
        await this.db
          .prepare(`
            UPDATE ${tables.karaokeLinesTable}
            SET reps = ?, lapses = ?, stability = ?, 
                last_review = ?, due_date = ?, updated_at = ?,
                state = ?
            WHERE song_id = ? AND line_index = ?
          `)
          .bind(
            newReps, newLapses, newStability,
            reviewTime, newDueDate, Date.now(),
            wasCorrect ? 2 : 3, // 2=review, 3=relearning
            songId, lineIndex
          )
          .run()
      }
      
    } catch (error) {
      console.error('Failed to update line card:', error)
      throw error
    }
  }

  async saveExerciseSession(
    userAddress: string,
    sessionId: string,
    cardsReviewed: number,
    cardsCorrect: number
  ): Promise<void> {
    if (!this.db) throw new Error('Database not initialized')
    
    let tables = await this.getUserTables(userAddress)
    if (!tables) {
      tables = await this.createUserTables(userAddress)
    }

    const now = Date.now()
    const sessionDate = parseInt(new Date(now).toISOString().slice(0, 10).replace(/-/g, ''))

    try {
      await this.db
        .prepare(`
          INSERT INTO ${tables.exerciseSessionsTable} (
            session_id, cards_reviewed, cards_correct,
            session_date, started_at, completed_at
          ) VALUES (?, ?, ?, ?, ?, ?)
        `)
        .bind(
          sessionId,
          cardsReviewed,
          cardsCorrect,
          sessionDate,
          now,
          now
        )
        .run()

      console.log('✅ Exercise session saved to Tableland')
    } catch (error) {
      console.error('Failed to save exercise session:', error)
      throw error
    }
  }

  async getDueCards(userAddress: string, limit: number = 20): Promise<KaraokeLinesRow[]> {
    if (!this.db) throw new Error('Database not initialized')
    
    const tables = await this.getUserTables(userAddress)
    if (!tables) return []

    try {
      const now = Date.now()
      const { results } = await this.db
        .prepare(`
          SELECT * FROM ${tables.karaokeLinesTable}
          WHERE due_date <= ?
          ORDER BY due_date ASC
          LIMIT ?
        `)
        .bind(now, limit)
        .all<KaraokeLinesRow>()

      return results
    } catch (error) {
      console.error('Failed to fetch due cards:', error)
      return []
    }
  }

  async getExerciseStreak(userAddress: string): Promise<number> {
    if (!this.db) throw new Error('Database not initialized')
    
    const tables = await this.getUserTables(userAddress)
    if (!tables) return 0

    try {
      // Get all exercise sessions ordered by date
      const { results } = await this.db
        .prepare(`
          SELECT DISTINCT session_date FROM ${tables.exerciseSessionsTable}
          ORDER BY session_date DESC
        `)
        .all<{ session_date: number }>()

      if (results.length === 0) return 0

      // Check for consecutive days
      let streak = 1
      const today = parseInt(new Date().toISOString().slice(0, 10).replace(/-/g, ''))
      
      // Must have exercised today or yesterday to have a streak
      if (results[0].session_date < today - 1) return 0

      for (let i = 1; i < results.length; i++) {
        const diff = results[i - 1].session_date - results[i].session_date
        if (diff === 1) {
          streak++
        } else {
          break
        }
      }

      return streak
    } catch (error) {
      console.error('Failed to calculate streak:', error)
      return 0
    }
  }

  /**
   * Check if a user owns their tables on-chain
   * Useful for verifying ownership before operations
   */
  async verifyTableOwnership(userAddress: string): Promise<boolean> {
    const tableInfo = await this.getUserTables(userAddress)
    if (!tableInfo) return false
    
    try {
      // Check ownership of all three tables
      const ownsKaraokeSessions = await tablelandRegistryService.ownsTable(
        userAddress, 
        tableInfo.karaokeSessionsTable
      )
      const ownsKaraokeLines = await tablelandRegistryService.ownsTable(
        userAddress,
        tableInfo.karaokeLinesTable  
      )
      const ownsExerciseSessions = await tablelandRegistryService.ownsTable(
        userAddress,
        tableInfo.exerciseSessionsTable
      )
      
      return ownsKaraokeSessions && ownsKaraokeLines && ownsExerciseSessions
    } catch (error) {
      console.error('Failed to verify table ownership:', error)
      return false
    }
  }

  /**
   * Get on-chain table ownership info for debugging
   */
  async getTableOwnershipInfo(userAddress: string): Promise<{
    ownedTables: any[]
    creationEvents: any[]
    currentTableInfo: UserTableInfo | null
  }> {
    const [ownedTables, creationEvents, currentTableInfo] = await Promise.all([
      tablelandRegistryService.getOwnedTables(userAddress),
      tablelandRegistryService.getTableCreationEvents(userAddress),
      this.getUserTables(userAddress)
    ])
    
    return {
      ownedTables,
      creationEvents,
      currentTableInfo
    }
  }

  /**
   * Batch save multiple sessions at once for better performance
   */
  async batchSaveKaraokeSessions(userAddress: string, sessions: Array<{ session: KaraokeSession; songId: number }>): Promise<void> {
    if (!this.db) throw new Error('Database not initialized')
    
    // Ensure user has tables
    let tables = await this.getUserTables(userAddress)
    if (!tables) {
      tables = await this.createUserTables(userAddress)
    }

    // Use single atomic transaction for both sessions and line cards (1 signature!)
    await this.batchSaveSessionsAndLines(sessions, tables)
  }

  /**
   * Save sessions and update line cards in a single transaction (1 signature)
   * Uses Tableland's multi-table transaction capability with separate strings per table
   */
  private async batchSaveSessionsAndLines(
    sessions: Array<{ session: KaraokeSession; songId: number }>,
    tables: UserTableInfo
  ): Promise<void> {
    if (!this.db) throw new Error('Database not initialized')

    const now = Date.now()
    const lineUpdates: Array<{ songId: number; lineIndex: number; lineText: string; wasCorrect: boolean; reviewTime: number }> = []
    
    // Collect all line updates
    for (const { session, songId } of sessions) {
      for (const line of session.lines) {
        lineUpdates.push({
          songId,
          lineIndex: line.lineIndex,
          lineText: line.expectedText,
          wasCorrect: line.accuracy >= 0.7,
          reviewTime: now
        })
      }
    }

    // Check which lines already exist first
    let existingLinesMap = new Map<string, { reps: number; lapses: number; stability: number }>()
    
    if (lineUpdates.length > 0) {
      const whereConditions = lineUpdates.map(update => 
        `(song_id = ${update.songId} AND line_index = ${update.lineIndex})`
      ).join(' OR ')
      
      const { results: existingLines } = await this.db
        .prepare(`
          SELECT song_id, line_index, reps, lapses, stability FROM ${tables.karaokeLinesTable}
          WHERE ${whereConditions}
        `)
        .all<{ song_id: number; line_index: number; reps: number; lapses: number; stability: number }>()

      existingLines.forEach(line => {
        existingLinesMap.set(`${line.song_id}-${line.line_index}`, {
          reps: line.reps,
          lapses: line.lapses,
          stability: line.stability
        })
      })
    }

    // Execute all operations in a single batch with prepared statements
    await this.executeMultiTableTransaction(sessions, lineUpdates, tables, existingLinesMap)
    
    console.log(`✅ Single atomic transaction: saved ${sessions.length} sessions and processed ${lineUpdates.length} line cards`)
  }

  /**
   * Execute multiple prepared statements across different tables in a single atomic transaction
   */
  private async executeMultiTableTransaction(
    sessions: Array<{ session: KaraokeSession; songId: number }>,
    lineUpdates: Array<{ songId: number; lineIndex: number; lineText: string; wasCorrect: boolean; reviewTime: number }>,
    tables: UserTableInfo,
    existingLinesMap: Map<string, { reps: number; lapses: number; stability: number }>
  ): Promise<void> {
    if (!this.db) throw new Error('Database not initialized')
    
    const now = Date.now()
    const allStatements = []

    // Add session INSERT statements
    for (const { session, songId } of sessions) {
      allStatements.push(
        this.db.prepare(`
          INSERT INTO ${tables.karaokeSessionsTable} (
            session_id, song_id, song_title, artist_name,
            total_score, started_at, completed_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `).bind(
          session.sessionId,
          songId,
          session.songTitle,
          session.artistName,
          Math.round((session.totalScore || 0) * 100),
          session.startTime,
          session.endTime || Date.now()
        )
      )
    }

    // Add line INSERT/UPDATE statements
    for (const update of lineUpdates) {
      const key = `${update.songId}-${update.lineIndex}`
      const existing = existingLinesMap.get(key)

      if (!existing) {
        // New line card - INSERT
        allStatements.push(
          this.db.prepare(`
            INSERT INTO ${tables.karaokeLinesTable} (
              song_id, line_index, line_text,
              difficulty, stability, elapsed_days, scheduled_days,
              reps, lapses, state, last_review, due_date,
              created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).bind(
            update.songId, update.lineIndex, update.lineText,
            250, 100, 0, 1,
            1, update.wasCorrect ? 0 : 1, update.wasCorrect ? 1 : 0, update.reviewTime,
            now + 86400000, now, now
          )
        )
      } else {
        // Existing line card - UPDATE
        const newReps = existing.reps + 1
        const newLapses = existing.lapses + (update.wasCorrect ? 0 : 1)
        const newStability = update.wasCorrect 
          ? Math.min(existing.stability * 2, 36500)
          : Math.max(existing.stability / 2, 100)
        const newDueDate = update.reviewTime + (newStability * 10)
        
        allStatements.push(
          this.db.prepare(`
            UPDATE ${tables.karaokeLinesTable}
            SET reps = ?, lapses = ?, stability = ?, 
                last_review = ?, due_date = ?, updated_at = ?,
                state = ?
            WHERE song_id = ? AND line_index = ?
          `).bind(
            newReps, newLapses, newStability,
            update.reviewTime, newDueDate, Date.now(),
            update.wasCorrect ? 2 : 3,
            update.songId, update.lineIndex
          )
        )
      }
    }

    // Execute all statements in a single batch (multiple tables, mixed INSERT/UPDATE)
    const results = await this.db.batch(allStatements)
    
    // Wait for the transaction to be mined
    if (results[0]?.meta?.txn) {
      await results[0].meta.txn.wait()
    }
  }

}

// Singleton instance
export const userTableService = new UserTableService()