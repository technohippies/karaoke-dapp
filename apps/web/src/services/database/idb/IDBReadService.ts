import { openDB, type IDBPDatabase } from 'idb'
import type { 
  KaraokeSRSDB,
  IDBKaraokeSession,
  IDBKaraokeLine,
  IDBExerciseSession,
  SyncStatus
} from '../../../types/idb.types'
import type { DueCard } from '../../../types/srs.types'
import { fromStoredDifficulty, fromStoredStability } from '../../../types/srs.types'

export class IDBReadService {
  private db: IDBPDatabase<KaraokeSRSDB> | null = null
  private DB_NAME = 'KaraokeSRS'
  private DB_VERSION = 1

  async initialize(): Promise<void> {
    if (this.db) return

    try {
      this.db = await openDB<KaraokeSRSDB>(this.DB_NAME, this.DB_VERSION)
      console.log('✅ IDB Read Service initialized')
    } catch (error) {
      console.error('❌ Failed to initialize IDB Read Service:', error)
      throw error
    }
  }

  async getDueCards(limit: number = 20): Promise<DueCard[]> {
    if (!this.db) {
      throw new Error('IDB not initialized')
    }

    const now = Date.now()
    const tx = this.db.transaction('karaoke_lines', 'readonly')
    const store = tx.objectStore('karaoke_lines')
    const index = store.index('by-due-date')

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
  }> {
    if (!this.db) {
      throw new Error('IDB not initialized')
    }

    const now = Date.now()
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
    const cardsToReview = allLines.filter(line => line.dueDate <= now).length

    return {
      totalSessions,
      totalCards,
      cardsToReview,
      averageScore
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

    return {
      pendingChanges: metadata.pendingChanges,
      lastSyncTimestamp: metadata.lastSyncTimestamp || null,
      syncInProgress: metadata.syncInProgress,
      lastSyncError: metadata.lastSyncError
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