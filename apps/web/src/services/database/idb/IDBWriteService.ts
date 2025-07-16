import { openDB, type IDBPDatabase } from 'idb'
import { fsrs, generatorParameters, Rating, createEmptyCard, type Card } from 'ts-fsrs'
import type { 
  KaraokeSessionData,
  ExerciseSessionData,
  KaraokeLineResult
} from '../../../types/srs.types'
import type { 
  KaraokeSRSDB, 
  IDBKaraokeSession, 
  IDBKaraokeLine,
  IDBExerciseSession
} from '../../../types/idb.types'
import {
  SRS_CORRECT_THRESHOLD,
  toStoredDifficulty,
  toStoredStability,
  fromStoredDifficulty,
  fromStoredStability
} from '../../../types/srs.types'

export class IDBWriteService {
  private db: IDBPDatabase<KaraokeSRSDB> | null = null
  private fsrs = fsrs(generatorParameters({ enable_fuzz: false }))
  private DB_NAME = 'KaraokeSRS'
  private DB_VERSION = 1

  async initialize(): Promise<void> {
    if (this.db) return

    try {
      this.db = await openDB<KaraokeSRSDB>(this.DB_NAME, this.DB_VERSION, {
        upgrade(db) {
          // Create karaoke_sessions store
          if (!db.objectStoreNames.contains('karaoke_sessions')) {
            const sessionStore = db.createObjectStore('karaoke_sessions', { 
              keyPath: 'id', 
              autoIncrement: true 
            })
            sessionStore.createIndex('by-session-id', 'sessionId')
            sessionStore.createIndex('by-sync-status', 'synced')
          }

          // Create karaoke_lines store
          if (!db.objectStoreNames.contains('karaoke_lines')) {
            const linesStore = db.createObjectStore('karaoke_lines', { 
              keyPath: 'id', 
              autoIncrement: true 
            })
            linesStore.createIndex('by-song-line', ['songId', 'lineIndex'])
            linesStore.createIndex('by-due-date', 'dueDate')
            linesStore.createIndex('by-sync-status', 'synced')
          }

          // Create exercise_sessions store
          if (!db.objectStoreNames.contains('exercise_sessions')) {
            const exerciseStore = db.createObjectStore('exercise_sessions', { 
              keyPath: 'id', 
              autoIncrement: true 
            })
            exerciseStore.createIndex('by-session-id', 'sessionId')
            exerciseStore.createIndex('by-sync-status', 'synced')
          }

          // Create sync_metadata store
          if (!db.objectStoreNames.contains('sync_metadata')) {
            db.createObjectStore('sync_metadata', { keyPath: 'id' })
          }
        }
      })

      console.log('✅ IDB Write Service initialized')
      
      // Initialize sync metadata if not exists
      await this.initializeSyncMetadata()
    } catch (error) {
      console.error('❌ Failed to initialize IDB:', error)
      throw error
    }
  }

  private async initializeSyncMetadata(): Promise<void> {
    if (!this.db) return

    const tx = this.db.transaction('sync_metadata', 'readwrite')
    const store = tx.objectStore('sync_metadata')
    
    const existing = await store.get('status')
    if (!existing) {
      await store.put({
        id: 'status',
        lastSyncTimestamp: 0,
        pendingChanges: 0,
        syncInProgress: false
      })
    }
  }

  async saveKaraokeSession(sessionData: KaraokeSessionData): Promise<string> {
    if (!this.db) {
      throw new Error('IDB not initialized')
    }

    const now = Date.now()
    const tx = this.db.transaction(['karaoke_sessions', 'karaoke_lines', 'sync_metadata'], 'readwrite')

    try {
      // Save session
      const sessionStore = tx.objectStore('karaoke_sessions')
      const idbSession: IDBKaraokeSession = {
        ...sessionData,
        synced: false,
        lastModified: now
      }
      await sessionStore.add(idbSession)

      // Save/update lines with FSRS calculations
      const linesStore = tx.objectStore('karaoke_lines')
      
      for (const line of sessionData.lines) {
        const isCorrect = line.score >= 70 // 70% threshold
        const rating = isCorrect ? Rating.Good : Rating.Again

        // Check if line exists
        const existingIndex = linesStore.index('by-song-line')
        const existing = await existingIndex.get([sessionData.songId, line.lineIndex])

        if (existing) {
          // Update existing card
          const card: Card = {
            due: new Date(existing.dueDate),
            stability: fromStoredStability(existing.stability),
            difficulty: fromStoredDifficulty(existing.difficulty),
            elapsed_days: existing.elapsedDays,
            scheduled_days: existing.scheduledDays,
            reps: existing.reps,
            lapses: existing.lapses,
            state: existing.state,
            last_review: existing.lastReview ? new Date(existing.lastReview) : undefined
          }

          const scheduling = this.fsrs.repeat(card, new Date())
          const newCard = scheduling[rating].card

          const updated: IDBKaraokeLine = {
            ...existing,
            difficulty: toStoredDifficulty(newCard.difficulty),
            stability: toStoredStability(newCard.stability),
            elapsedDays: newCard.elapsed_days,
            scheduledDays: newCard.scheduled_days,
            reps: newCard.reps,
            lapses: newCard.lapses,
            state: newCard.state,
            lastReview: now,
            dueDate: newCard.due.getTime(),
            updatedAt: now,
            synced: false,
            lastModified: now
          }

          await linesStore.put(updated)
        } else {
          // Create new card
          const newCard = createEmptyCard()
          const scheduling = this.fsrs.repeat(newCard, new Date())
          const { card } = scheduling[rating]

          const newLine: IDBKaraokeLine = {
            songId: sessionData.songId,
            lineIndex: line.lineIndex,
            lineText: line.expectedText,
            difficulty: toStoredDifficulty(card.difficulty),
            stability: toStoredStability(card.stability),
            elapsedDays: 0,
            scheduledDays: card.scheduled_days,
            reps: 1,
            lapses: isCorrect ? 0 : 1,
            state: card.state,
            lastReview: now,
            dueDate: card.due.getTime(),
            createdAt: now,
            updatedAt: now,
            synced: false,
            lastModified: now
          }

          await linesStore.add(newLine)
        }
      }

      // Update sync metadata
      const metaStore = tx.objectStore('sync_metadata')
      const metadata = await metaStore.get('status')
      if (metadata) {
        metadata.pendingChanges += sessionData.lines.length + 1 // lines + session
        await metaStore.put(metadata)
      }

      await tx.done
      console.log('✅ Saved karaoke session to IDB:', sessionData.sessionId)
      return sessionData.sessionId
    } catch (error) {
      console.error('❌ Failed to save karaoke session to IDB:', error)
      throw error
    }
  }

  async saveExerciseSession(exerciseData: ExerciseSessionData): Promise<string> {
    if (!this.db) {
      throw new Error('IDB not initialized')
    }

    const now = Date.now()
    const tx = this.db.transaction(['exercise_sessions', 'sync_metadata'], 'readwrite')

    try {
      const sessionStore = tx.objectStore('exercise_sessions')
      const idbSession: IDBExerciseSession = {
        ...exerciseData,
        synced: false,
        lastModified: now
      }
      await sessionStore.add(idbSession)

      // Update sync metadata
      const metaStore = tx.objectStore('sync_metadata')
      const metadata = await metaStore.get('status')
      if (metadata) {
        metadata.pendingChanges += 1
        await metaStore.put(metadata)
      }

      await tx.done
      console.log('✅ Saved exercise session to IDB:', exerciseData.sessionId)
      return exerciseData.sessionId
    } catch (error) {
      console.error('❌ Failed to save exercise session to IDB:', error)
      throw error
    }
  }

  async updateCardReview(
    songId: number,
    lineIndex: number,
    wasCorrect: boolean
  ): Promise<void> {
    if (!this.db) {
      throw new Error('IDB not initialized')
    }

    const tx = this.db.transaction(['karaoke_lines', 'sync_metadata'], 'readwrite')
    const linesStore = tx.objectStore('karaoke_lines')
    const index = linesStore.index('by-song-line')

    try {
      const existing = await index.get([songId, lineIndex])
      if (!existing) {
        throw new Error('Card not found')
      }

      const now = Date.now()

      // Reconstruct FSRS card
      const card: Card = {
        due: new Date(existing.dueDate),
        stability: fromStoredStability(existing.stability),
        difficulty: fromStoredDifficulty(existing.difficulty),
        elapsed_days: existing.elapsedDays,
        scheduled_days: existing.scheduledDays,
        reps: existing.reps,
        lapses: existing.lapses,
        state: existing.state,
        last_review: existing.lastReview ? new Date(existing.lastReview) : undefined
      }

      // Apply FSRS algorithm
      const rating = wasCorrect ? Rating.Good : Rating.Again
      const scheduling = this.fsrs.repeat(card, new Date())
      const newCard = scheduling[rating].card

      // Update the card
      const updated: IDBKaraokeLine = {
        ...existing,
        difficulty: toStoredDifficulty(newCard.difficulty),
        stability: toStoredStability(newCard.stability),
        elapsedDays: newCard.elapsed_days,
        scheduledDays: newCard.scheduled_days,
        reps: newCard.reps,
        lapses: newCard.lapses,
        state: newCard.state,
        lastReview: now,
        dueDate: newCard.due.getTime(),
        updatedAt: now,
        synced: false,
        lastModified: now
      }

      await linesStore.put(updated)

      // Update sync metadata
      const metaStore = tx.objectStore('sync_metadata')
      const metadata = await metaStore.get('status')
      if (metadata && existing.synced) {
        metadata.pendingChanges += 1
        await metaStore.put(metadata)
      }

      await tx.done
      console.log('✅ Updated card review in IDB:', { songId, lineIndex, wasCorrect })
    } catch (error) {
      console.error('❌ Failed to update card review in IDB:', error)
      throw error
    }
  }

  async markAsSynced(
    storeName: 'karaoke_sessions' | 'karaoke_lines' | 'exercise_sessions',
    ids: number[]
  ): Promise<void> {
    if (!this.db) return

    const tx = this.db.transaction([storeName, 'sync_metadata'], 'readwrite')
    const store = tx.objectStore(storeName)

    for (const id of ids) {
      const item = await store.get(id)
      if (item) {
        item.synced = true
        await store.put(item)
      }
    }

    // Update sync metadata
    const metaStore = tx.objectStore('sync_metadata')
    const metadata = await metaStore.get('status')
    if (metadata) {
      metadata.pendingChanges = Math.max(0, metadata.pendingChanges - ids.length)
      metadata.lastSyncTimestamp = Date.now()
      await metaStore.put(metadata)
    }

    await tx.done
  }

  async clearAllData(): Promise<void> {
    if (!this.db) return

    const tx = this.db.transaction(['karaoke_sessions', 'karaoke_lines', 'exercise_sessions', 'sync_metadata'], 'readwrite')
    
    await tx.objectStore('karaoke_sessions').clear()
    await tx.objectStore('karaoke_lines').clear()
    await tx.objectStore('exercise_sessions').clear()
    
    // Reset sync metadata
    await tx.objectStore('sync_metadata').put({
      id: 'status',
      lastSyncTimestamp: 0,
      pendingChanges: 0,
      syncInProgress: false
    })

    await tx.done
    console.log('✅ Cleared all IDB data')
  }
}

// Export singleton instance
export const idbWriteService = new IDBWriteService()