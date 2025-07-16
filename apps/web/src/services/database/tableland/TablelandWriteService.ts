import { Database, Registry } from '@tableland/sdk'
import { ethers } from 'ethers'
import { fsrs, generatorParameters, Rating, createEmptyCard, type Card } from 'ts-fsrs'
import type { 
  UserTableInfo, 
  KaraokeSessionData, 
  SRSCardState,
  ExerciseSessionData,
  DueCard
} from '../../../types/srs.types'
import {
  SRS_CORRECT_THRESHOLD,
  toStoredDifficulty,
  toStoredStability,
  fromStoredDifficulty,
  fromStoredStability
} from '../../../types/srs.types'

export class TablelandWriteService {
  private db: Database | null = null
  private registry: Registry | null = null
  private fsrs = fsrs(generatorParameters({ enable_fuzz: false }))
  private STORAGE_KEY = 'karaoke_srs_tables_v1' // Versioned for SRS schema
  private CHAIN_ID = 11155420 // Optimism Sepolia
  private TABLE_VERSION = 'srs_v1' // Version suffix for table names

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
   * Check if user has old non-SRS tables
   */
  hasOldTables(userAddress: string): boolean {
    const oldKeys = [
      `karaoke_tables_${userAddress}`,
      `karaoke_user_tables_${userAddress}`
    ]
    return oldKeys.some(key => localStorage.getItem(key) !== null)
  }

  /**
   * Get user's table names from localStorage or create if needed
   */
  async getUserTables(userAddress: string): Promise<UserTableInfo | null> {
    // Check if user has old tables - warn them
    if (this.hasOldTables(userAddress)) {
      console.warn('⚠️ Found old table format. New SRS tables will be created.')
    }
    
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
   * Try to find existing tables using Registry
   */
  private async findExistingTables(userAddress: string): Promise<UserTableInfo | null> {
    if (!this.registry) return null

    try {
      console.log('🔍 Searching for existing tables on-chain for:', userAddress)
      const tables = await this.registry.listTables(userAddress)
      
      if (tables.length === 0) {
        console.log('❌ No tables found on-chain')
        return null
      }
      
      console.log(`📊 Found ${tables.length} tables on-chain, need to identify ours`)
      // In production, you'd parse table names to find your specific tables
      // For now, return null to trigger creation
      return null
    } catch (error) {
      console.error('Error listing tables:', error)
      return null
    }
  }

  /**
   * Create all SRS tables for a new user
   */
  async createUserTables(userAddress: string): Promise<UserTableInfo> {
    if (!this.db) {
      throw new Error('Database not initialized')
    }

    const userPrefix = userAddress.slice(2, 8).toLowerCase()
    console.log('Creating SRS tables for user:', userAddress, 'with prefix:', userPrefix)

    // Execute all CREATE TABLE statements in a single transaction using exec()
    const createTablesSQL = `
      CREATE TABLE karaoke_sessions_${userPrefix}_${this.TABLE_VERSION} (
        id INTEGER PRIMARY KEY,
        session_id TEXT UNIQUE NOT NULL,
        song_id INTEGER NOT NULL,
        song_title TEXT NOT NULL,
        artist_name TEXT NOT NULL,
        total_score INTEGER NOT NULL,
        started_at INTEGER NOT NULL,
        completed_at INTEGER NOT NULL
      );
      
      CREATE TABLE karaoke_lines_${userPrefix}_${this.TABLE_VERSION} (
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
      );
      
      CREATE TABLE exercise_sessions_${userPrefix}_${this.TABLE_VERSION} (
        id INTEGER PRIMARY KEY,
        session_id TEXT UNIQUE NOT NULL,
        cards_reviewed INTEGER NOT NULL,
        cards_correct INTEGER NOT NULL,
        session_date INTEGER NOT NULL,
        started_at INTEGER NOT NULL,
        completed_at INTEGER NOT NULL
      );
    `

    console.log('📦 Creating all 3 tables in single transaction...')
    const result = await this.db.exec(createTablesSQL)
    
    if (result.txn) {
      await result.txn.wait()
      
      // Extract table names from result
      const tableNames = result.txn.names
      if (!tableNames || tableNames.length !== 3) {
        throw new Error('Failed to create all tables')
      }

      const tableInfo: UserTableInfo = {
        karaokeSessionsTable: tableNames[0],
        karaokeLinesTable: tableNames[1],
        exerciseSessionsTable: tableNames[2]
      }

      // Cache in localStorage
      localStorage.setItem(`${this.STORAGE_KEY}_${userAddress}`, JSON.stringify(tableInfo))

      console.log('✅ Created SRS tables:', tableInfo)
      return tableInfo
    } else {
      throw new Error('Failed to create tables - no transaction returned')
    }
  }

  /**
   * Save karaoke session with full SRS implementation
   */
  async saveKaraokeSession(sessionData: KaraokeSessionData): Promise<string> {
    if (!this.db) {
      throw new Error('Database not initialized')
    }

    // Get or create user tables
    let tables = await this.getUserTables(sessionData.userAddress)
    if (!tables) {
      console.log('No existing tables found, creating new ones...')
      tables = await this.createUserTables(sessionData.userAddress)
    }

    const statements = []
    const now = Date.now()

    // 1. Insert session record
    statements.push(
      this.db
        .prepare(`INSERT INTO ${tables.karaokeSessionsTable} 
          (session_id, song_id, song_title, artist_name, total_score, started_at, completed_at) 
          VALUES (?, ?, ?, ?, ?, ?, ?)`)
        .bind(
          sessionData.sessionId,
          sessionData.songId,
          sessionData.songTitle,
          sessionData.artistName,
          Math.round(sessionData.totalScore), // Store as integer percentage
          sessionData.startedAt,
          sessionData.completedAt || now
        )
    )

    // 2. UPSERT each line with FSRS calculations
    for (const line of sessionData.lines) {
      const isCorrect = line.score >= 70 // 70% threshold
      const rating = isCorrect ? Rating.Good : Rating.Again
      
      // For new cards (will be used on INSERT)
      const newCard = createEmptyCard()
      const scheduling = this.fsrs.repeat(newCard, new Date())
      const { card } = scheduling[rating]

      statements.push(
        this.db.prepare(`
          INSERT INTO ${tables.karaokeLinesTable} (
            song_id, line_index, line_text,
            difficulty, stability, elapsed_days, scheduled_days,
            reps, lapses, state, last_review, due_date,
            created_at, updated_at
          ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
          ON CONFLICT(song_id, line_index) DO UPDATE SET
            difficulty = CASE 
              WHEN reps = 0 THEN excluded.difficulty 
              ELSE difficulty 
            END,
            stability = CASE
              WHEN excluded.lapses > 0 THEN MAX(stability / 2, 100)
              ELSE MIN(stability * 2, 36500)
            END,
            elapsed_days = (excluded.last_review - last_review) / 86400000,
            scheduled_days = CASE
              WHEN excluded.lapses > 0 THEN 1
              ELSE MIN(scheduled_days * 2, 365)
            END,
            reps = reps + 1,
            lapses = lapses + excluded.lapses,
            state = CASE
              WHEN excluded.lapses > 0 THEN 3
              WHEN reps = 0 THEN 1
              ELSE 2
            END,
            last_review = excluded.last_review,
            due_date = excluded.last_review + (
              CASE
                WHEN excluded.lapses > 0 THEN MAX(stability / 2, 100)
                ELSE MIN(stability * 2, 36500)
              END * 864000
            ),
            updated_at = excluded.updated_at
        `).bind(
          sessionData.songId,
          line.lineIndex,
          line.expectedText,
          toStoredDifficulty(card.difficulty),
          toStoredStability(card.stability),
          0, // elapsed_days (will be calculated on update)
          card.scheduled_days,
          1, // reps (will be incremented on conflict)
          isCorrect ? 0 : 1, // lapses
          card.state,
          now, // last_review
          card.due.getTime(),
          now, // created_at
          now  // updated_at
        )
      )
    }

    // Execute all statements in a single batch
    console.log(`📦 Batching ${statements.length} SRS operations into single transaction`)
    const results = await this.db.batch(statements)
    
    if (results?.[0]?.meta?.txn) {
      await results[0].meta.txn.wait()
    }

    console.log('✅ Saved karaoke session with SRS updates:', sessionData.sessionId)
    return sessionData.sessionId
  }

  /**
   * Save exercise session results
   */
  async saveExerciseSession(exerciseData: ExerciseSessionData): Promise<string> {
    if (!this.db) {
      throw new Error('Database not initialized')
    }

    const tables = await this.getUserTables(exerciseData.userAddress)
    if (!tables) {
      throw new Error('User tables not found')
    }

    const now = Date.now()
    const sessionDate = parseInt(new Date(now).toISOString().slice(0, 10).replace(/-/g, ''))

    const { meta } = await this.db
      .prepare(`INSERT INTO ${tables.exerciseSessionsTable} 
        (session_id, cards_reviewed, cards_correct, session_date, started_at, completed_at) 
        VALUES (?, ?, ?, ?, ?, ?)`)
      .bind(
        exerciseData.sessionId,
        exerciseData.cardsReviewed,
        exerciseData.cardsCorrect,
        sessionDate,
        exerciseData.startedAt,
        exerciseData.completedAt || now
      )
      .run()

    await meta.txn?.wait()
    
    console.log('✅ Saved exercise session:', exerciseData.sessionId)
    return exerciseData.sessionId
  }

  /**
   * Get due cards for review
   */
  async getDueCards(userAddress: string, limit: number = 20): Promise<DueCard[]> {
    if (!this.db) {
      throw new Error('Database not initialized')
    }

    const tables = await this.getUserTables(userAddress)
    if (!tables) {
      return []
    }

    const now = Date.now()
    const { results } = await this.db
      .prepare(`SELECT * FROM ${tables.karaokeLinesTable} 
        WHERE due_date <= ? 
        ORDER BY due_date ASC 
        LIMIT ?`)
      .bind(now, limit)
      .all()

    return results as DueCard[]
  }

  /**
   * Update card after review (for exercise mode)
   */
  async updateCardReview(
    userAddress: string,
    songId: number,
    lineIndex: number,
    wasCorrect: boolean
  ): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized')
    }

    const tables = await this.getUserTables(userAddress)
    if (!tables) {
      throw new Error('User tables not found')
    }

    // Fetch current card state
    const { results } = await this.db
      .prepare(`SELECT * FROM ${tables.karaokeLinesTable} 
        WHERE song_id = ? AND line_index = ?`)
      .bind(songId, lineIndex)
      .all()

    if (results.length === 0) {
      throw new Error('Card not found')
    }

    const existing = results[0]
    const now = Date.now()

    // Reconstruct FSRS card
    const card: Card = {
      due: new Date(existing.due_date),
      stability: fromStoredStability(existing.stability),
      difficulty: fromStoredDifficulty(existing.difficulty),
      elapsed_days: existing.elapsed_days,
      scheduled_days: existing.scheduled_days,
      reps: existing.reps,
      lapses: existing.lapses,
      state: existing.state,
      last_review: existing.last_review ? new Date(existing.last_review) : undefined
    }

    // Apply FSRS algorithm
    const rating = wasCorrect ? Rating.Good : Rating.Again
    const scheduling = this.fsrs.repeat(card, new Date())
    const newCard = scheduling[rating].card

    // Update the card
    const { meta } = await this.db
      .prepare(`UPDATE ${tables.karaokeLinesTable} SET
        difficulty = ?,
        stability = ?,
        elapsed_days = ?,
        scheduled_days = ?,
        reps = ?,
        lapses = ?,
        state = ?,
        last_review = ?,
        due_date = ?,
        updated_at = ?
        WHERE song_id = ? AND line_index = ?`)
      .bind(
        toStoredDifficulty(newCard.difficulty),
        toStoredStability(newCard.stability),
        newCard.elapsed_days,
        newCard.scheduled_days,
        newCard.reps,
        newCard.lapses,
        newCard.state,
        now,
        newCard.due.getTime(),
        now,
        songId,
        lineIndex
      )
      .run()

    await meta.txn?.wait()
    console.log('✅ Updated card review:', { songId, lineIndex, wasCorrect })
  }

  /**
   * Get user's karaoke history
   */
  async getUserHistory(userAddress: string): Promise<any[]> {
    if (!this.db) {
      throw new Error('Database not initialized')
    }

    const tables = await this.getUserTables(userAddress)
    if (!tables) {
      return []
    }

    const { results } = await this.db
      .prepare(`SELECT * FROM ${tables.karaokeSessionsTable} 
        ORDER BY completed_at DESC 
        LIMIT 20`)
      .all()

    return results
  }

  /**
   * Get user's learning statistics
   */
  async getUserStats(userAddress: string): Promise<{
    totalSessions: number
    totalCards: number
    cardsToReview: number
    averageScore: number
  }> {
    if (!this.db) {
      throw new Error('Database not initialized')
    }

    const tables = await this.getUserTables(userAddress)
    if (!tables) {
      return {
        totalSessions: 0,
        totalCards: 0,
        cardsToReview: 0,
        averageScore: 0
      }
    }

    const now = Date.now()

    // Get session stats
    const { results: sessionStats } = await this.db
      .prepare(`SELECT COUNT(*) as count, AVG(total_score) as avg_score 
        FROM ${tables.karaokeSessionsTable}`)
      .all()

    // Get card stats
    const { results: cardStats } = await this.db
      .prepare(`SELECT COUNT(*) as total, 
        SUM(CASE WHEN due_date <= ? THEN 1 ELSE 0 END) as due
        FROM ${tables.karaokeLinesTable}`)
      .bind(now)
      .all()

    return {
      totalSessions: sessionStats[0]?.count || 0,
      totalCards: cardStats[0]?.total || 0,
      cardsToReview: cardStats[0]?.due || 0,
      averageScore: sessionStats[0]?.avg_score || 0
    }
  }
}

// Export singleton instance
export const tablelandWriteService = new TablelandWriteService()