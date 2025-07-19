import type { IDBPDatabase } from 'idb'
import { getGlobalDB } from './globalDB'
import type { 
  KaraokeSRSDB,
  IDBKaraokeSession,
  IDBKaraokeLine,
  IDBExerciseSession,
  SyncStatus
} from '../../../types/idb.types'
import type { DueCard } from '../../../types/srs.types'
// import { fromStoredDifficulty, fromStoredStability } from '../../../types/srs.types'

class IDBReadService {
  private db: IDBPDatabase<KaraokeSRSDB> | null = null
  // private DB_NAME = 'KaraokeSRS'
  // private DB_VERSION = 1

  async initialize(): Promise<void> {
    if (this.db) {
      console.log('✅ IDB Read Service already initialized, reusing connection')
      return
    }

    try {
      this.db = await getGlobalDB()
      console.log('✅ IDB Read Service initialized with global DB')
    } catch (error) {
      console.error('❌ Failed to initialize IDB Read Service:', error)
      throw error
    }
  }

  async getDueCards(limit: number = 20): Promise<DueCard[]> {
    console.log('🔍 getDueCards called with limit:', limit)
    console.log('📊 DB instance:', this.db?.name, this.db?.version, 'isOpen:', this.db && !this.db.close)
    
    if (!this.db) {
      console.error('❌ getDueCards: IDB not initialized!')
      throw new Error('IDB not initialized')
    }

    const now = Date.now()
    const tx = this.db.transaction('karaoke_lines', 'readonly')
    const store = tx.objectStore('karaoke_lines')
    const index = store.index('by-due-date')

    // Debug: Get all cards first to understand the data
    const allCards = await store.getAll()
    console.log('🎯 getDueCards Debug:', {
      totalCards: allCards.length,
      currentTime: new Date(now).toISOString(),
      nowTimestamp: now,
      dbInstance: this.db,
      dbName: this.db.name,
      dbVersion: this.db.version,
      objectStores: Array.from(this.db.objectStoreNames),
      cards: allCards.map(c => ({
        songId: c.songId,
        lineIndex: c.lineIndex,
        dueDate: new Date(c.dueDate).toISOString(),
        dueDateTimestamp: c.dueDate,
        isDue: c.dueDate <= now,
        state: c.state,
        reps: c.reps
      }))
    })
    
    // Double check the data exists
    if (allCards.length === 0) {
      console.warn('⚠️ No cards found in IDB!')
      const dbCheck = await store.count()
      console.log('Store count:', dbCheck)
      
      // Check the window global
      const globalDBCheck = (window as any).__karaoke_db
      if (globalDBCheck) {
        const globalTx = globalDBCheck.transaction('karaoke_lines', 'readonly')
        const globalStore = globalTx.objectStore('karaoke_lines')
        const globalCount = await globalStore.count()
        console.log('🌍 Global DB line count:', globalCount)
      }
    }

    const dueCards: DueCard[] = []
    let cursor = await index.openCursor()

    while (cursor && dueCards.length < limit) {
      const line = cursor.value
      if (line.dueDate <= now) {
        dueCards.push({
          id: line.id!,
          songId: line.songId,
          lineIndex: line.lineIndex,
          lineText: line.lineText,
          difficulty: line.difficulty,
          stability: line.stability,
          elapsedDays: line.elapsedDays,
          scheduledDays: line.scheduledDays,
          reps: line.reps,
          lapses: line.lapses,
          state: line.state,
          lastReview: line.lastReview,
          dueDate: line.dueDate,
          createdAt: line.createdAt,
          updatedAt: line.updatedAt
        })
      } else {
        // Since index is sorted by due date, we can break early
        break
      }
      cursor = await cursor.continue()
    }

    console.log(`📚 Found ${dueCards.length} due cards`)
    return dueCards
  }

  async getUserHistory(limit: number = 20): Promise<IDBKaraokeSession[]> {
    if (!this.db) {
      throw new Error('IDB not initialized')
    }

    const tx = this.db.transaction('karaoke_sessions', 'readonly')
    const store = tx.objectStore('karaoke_sessions')

    // Get all sessions and sort by completedAt
    const allSessions = await store.getAll()
    return allSessions
      .sort((a, b) => b.completedAt - a.completedAt)
      .slice(0, limit)
  }

  async getUserStats(): Promise<{
    totalSessions: number
    totalCards: number
    cardsToReview: number
    averageScore: number
    newCards: number
    learningCards: number
  }> {
    if (!this.db) {
      throw new Error('IDB not initialized')
    }

    const now = Date.now()
    console.log('📊 getUserStats called, DB:', this.db?.name, this.db?.version)
    
    const tx = this.db.transaction(['karaoke_sessions', 'karaoke_lines'], 'readonly')

    // Get session stats
    const sessionStore = tx.objectStore('karaoke_sessions')
    const allSessions = await sessionStore.getAll()
    const totalSessions = allSessions.length
    const averageScore = allSessions.length > 0
      ? allSessions.reduce((sum, s) => sum + s.totalScore, 0) / allSessions.length
      : 0

    // Get card stats
    const linesStore = tx.objectStore('karaoke_lines')
    const allLines = await linesStore.getAll()
    const totalCards = allLines.length
    console.log('📊 getUserStats found lines:', totalCards)
    
    // Count cards by state
    // State 0 = New, State 1 = Learning, State 2 = Review, State 3 = Relearning
    let newCards = 0
    let learningCards = 0
    let cardsToReview = 0
    
    allLines.forEach(line => {
      if (line.state === 0) {
        newCards++
      } else if (line.state === 1 || line.state === 3) {
        learningCards++
      }
      
      // Any card past due date needs review
      if (line.dueDate <= now) {
        cardsToReview++
      }
    })
    
    console.log('📊 SRS Stats Debug:', {
      totalLines: allLines.length,
      states: allLines.map(l => ({ 
        songId: l.songId, 
        lineIndex: l.lineIndex, 
        state: l.state, 
        dueDate: new Date(l.dueDate).toISOString(),
        isDue: l.dueDate <= now 
      })),
      newCards,
      learningCards,
      cardsToReview,
      currentTime: new Date(now).toISOString()
    })

    return {
      totalSessions,
      totalCards,
      cardsToReview,
      averageScore,
      newCards,
      learningCards
    }
  }

  async getSyncStatus(): Promise<SyncStatus> {
    if (!this.db) {
      throw new Error('IDB not initialized')
    }

    const tx = this.db.transaction('sync_metadata', 'readonly')
    const store = tx.objectStore('sync_metadata')
    const metadata = await store.get('status')

    if (!metadata) {
      return {
        pendingChanges: 0,
        lastSyncTimestamp: null,
        syncInProgress: false
      }
    }

    // Type guard to check if it's SyncMetadata
    if ('pendingChanges' in metadata && 'lastSyncTimestamp' in metadata) {
      return {
        pendingChanges: metadata.pendingChanges,
        lastSyncTimestamp: metadata.lastSyncTimestamp || null,
        syncInProgress: metadata.syncInProgress,
        lastSyncError: metadata.lastSyncError
      }
    }
    
    // If it's StreakCache, return default sync status
    return {
      pendingChanges: 0,
      lastSyncTimestamp: null,
      syncInProgress: false
    }
  }

  async getUnsyncedData(): Promise<{
    sessions: IDBKaraokeSession[]
    lines: IDBKaraokeLine[]
    exercises: IDBExerciseSession[]
  }> {
    if (!this.db) {
      throw new Error('IDB not initialized')
    }

    const tx = this.db.transaction(['karaoke_sessions', 'karaoke_lines', 'exercise_sessions'], 'readonly')

    // Get unsynced sessions
    const sessionStore = tx.objectStore('karaoke_sessions')
    const sessions: IDBKaraokeSession[] = []
    let sessionCursor = await sessionStore.openCursor()
    while (sessionCursor) {
      if (!sessionCursor.value.synced) {
        sessions.push(sessionCursor.value)
      }
      sessionCursor = await sessionCursor.continue()
    }

    // Get unsynced lines
    const linesStore = tx.objectStore('karaoke_lines')
    const lines: IDBKaraokeLine[] = []
    let linesCursor = await linesStore.openCursor()
    while (linesCursor) {
      if (!linesCursor.value.synced) {
        lines.push(linesCursor.value)
      }
      linesCursor = await linesCursor.continue()
    }

    // Get unsynced exercises
    const exerciseStore = tx.objectStore('exercise_sessions')
    const exercises: IDBExerciseSession[] = []
    let exerciseCursor = await exerciseStore.openCursor()
    while (exerciseCursor) {
      if (!exerciseCursor.value.synced) {
        exercises.push(exerciseCursor.value)
      }
      exerciseCursor = await exerciseCursor.continue()
    }

    return { sessions, lines, exercises }
  }

  async getCardByLocation(songId: number, lineIndex: number): Promise<IDBKaraokeLine | null> {
    if (!this.db) {
      throw new Error('IDB not initialized')
    }

    const tx = this.db.transaction('karaoke_lines', 'readonly')
    const store = tx.objectStore('karaoke_lines')
    const index = store.index('by-song-line')

    const result = await index.get([songId, lineIndex])
    return result || null
  }

  async getSessionById(sessionId: string): Promise<IDBKaraokeSession | null> {
    if (!this.db) {
      throw new Error('IDB not initialized')
    }

    const tx = this.db.transaction('karaoke_sessions', 'readonly')
    const store = tx.objectStore('karaoke_sessions')
    const index = store.index('by-session-id')

    const result = await index.get(sessionId)
    return result || null
  }

  async getExerciseHistory(limit: number = 20): Promise<IDBExerciseSession[]> {
    if (!this.db) {
      throw new Error('IDB not initialized')
    }

    const tx = this.db.transaction('exercise_sessions', 'readonly')
    const store = tx.objectStore('exercise_sessions')

    // Get all sessions and sort by completedAt
    const allSessions = await store.getAll()
    return allSessions
      .sort((a, b) => b.completedAt - a.completedAt)
      .slice(0, limit)
  }

  async hasLocalData(): Promise<boolean> {
    if (!this.db) {
      throw new Error('IDB not initialized')
    }

    const tx = this.db.transaction(['karaoke_sessions', 'karaoke_lines', 'exercise_sessions'], 'readonly')
    
    const sessionCount = await tx.objectStore('karaoke_sessions').count()
    const linesCount = await tx.objectStore('karaoke_lines').count()
    const exerciseCount = await tx.objectStore('exercise_sessions').count()

    return (sessionCount + linesCount + exerciseCount) > 0
  }
}

// Export singleton instance
export const idbReadService = new IDBReadService()