import { Database } from "@tableland/sdk"
import { BrowserProvider } from "ethers"
import type { KaraokeSession } from "./session-storage"

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
  private readonly STORAGE_KEY = 'karaoke_user_tables'

  async initialize(provider: any): Promise<void> {
    if (!provider) throw new Error('Provider required')
    
    // Wrap the provider for ethers v6
    const ethersProvider = new BrowserProvider(provider)
    const signer = await ethersProvider.getSigner()
    
    this.db = new Database({ signer })
  }

  async getUserTables(userAddress: string): Promise<UserTableInfo | null> {
    // Check local storage first
    const stored = localStorage.getItem(`${this.STORAGE_KEY}_${userAddress}`)
    if (stored) {
      return JSON.parse(stored)
    }
    
    return null
  }

  async createUserTables(userAddress: string): Promise<UserTableInfo> {
    if (!this.db) throw new Error('Database not initialized')
    
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
        await this.updateLineCard(userAddress, songId, line.lineIndex, line.text, line.accuracy >= 0.7, now)
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
   * Batch save multiple sessions at once for better performance
   */
  async batchSaveKaraokeSessions(userAddress: string, sessions: Array<{ session: KaraokeSession; songId: number }>): Promise<void> {
    if (!this.db) throw new Error('Database not initialized')
    
    // Ensure user has tables
    let tables = await this.getUserTables(userAddress)
    if (!tables) {
      tables = await this.createUserTables(userAddress)
    }

    const statements = sessions.map(({ session, songId }) => {
      return this.db!.prepare(`
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
    })

    try {
      // Batch insert all sessions in a single transaction
      await this.db.batch(statements)
      console.log(`✅ Batch saved ${sessions.length} sessions to Tableland`)
      
      // Update line cards for all sessions
      const now = Date.now()
      for (const { session, songId } of sessions) {
        for (const line of session.lines) {
          await this.updateLineCard(userAddress, songId, line.lineIndex, line.text, line.accuracy >= 0.7, now)
        }
      }
    } catch (error) {
      console.error('Failed to batch save sessions:', error)
      throw error
    }
  }
}

// Singleton instance
export const userTableService = new UserTableService()