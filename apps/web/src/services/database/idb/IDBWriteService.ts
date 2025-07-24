import type { IDBPDatabase } from 'idb'
import { getGlobalDB } from './globalDB'
import { fsrs, generatorParameters, Rating, createEmptyCard, type Card } from 'ts-fsrs'
import type { 
  KaraokeSessionData,
  ExerciseSessionData
} from '../../../types/srs.types'
import type { 
  KaraokeSRSDB, 
  IDBKaraokeSession, 
  IDBKaraokeLine,
  IDBExerciseSession
} from '../../../types/idb.types'
import {
  toStoredDifficulty,
  toStoredStability,
  fromStoredDifficulty,
  fromStoredStability
} from '../../../types/srs.types'

class IDBWriteService {
  private db: IDBPDatabase<KaraokeSRSDB> | null = null
  private fsrs = fsrs(generatorParameters({ enable_fuzz: false }))
  // private DB_NAME = 'KaraokeSRS'
  // private DB_VERSION = 1

  async initialize(): Promise<void> {
    if (this.db) {
      console.log('✅ IDB Write Service already initialized, reusing connection')
      return
    }

    try {
      this.db = await getGlobalDB()
      console.log('✅ IDB Write Service initialized with global DB')
      
      // Initialize sync metadata if not exists
      await this.initializeSyncMetadata()
      
      // Debug: Check what's in the database after init
      try {
        const debugTx = this.db.transaction(['karaoke_lines'], 'readonly')
        const debugStore = debugTx.objectStore('karaoke_lines')
        const lineCount = await debugStore.count()
        console.log('📊 After Write Service init, line count:', lineCount)
      } catch (debugError) {
        console.warn('⚠️ Could not get line count (DB may be closing):', debugError)
      }
    } catch (error) {
      console.error('❌ Failed to initialize IDB:', error)
      throw error
    }
  }

  private async initializeSyncMetadata(): Promise<void> {
    if (!this.db) return
    
    try {
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
    } catch (error) {
      console.warn('⚠️ Could not initialize sync metadata (DB may be closing):', error)
      // Don't throw - this is not critical for basic functionality
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
      
      // Only process lines that need practice or have existing cards
      console.log(`📝 Processing ${sessionData.lines.length} lines for saving`)
      let savedCount = 0
      let skippedCount = 0
      
      for (const line of sessionData.lines) {

        // Check if line exists
        const existingIndex = linesStore.index('by-song-line')
        const existing = await existingIndex.get([sessionData.songId, line.lineIndex])

        // Skip lines that don't need practice and don't already exist
        if (!line.needsPractice && !existing) {
          skippedCount++
          continue
        }

        if (existing) {
          // Don't update NEW cards - they haven't been studied yet
          if (existing.state === 0) {
            console.log(`📝 Skipping update for NEW card line ${line.lineIndex}`)
            continue
          }
          
          // Update existing card with rating based on score
          const isCorrect = !line.needsPractice
          const rating = isCorrect ? Rating.Good : Rating.Again
          
          console.log(`📝 Updating existing card for line ${line.lineIndex}: currentState=${existing.state}, rating=${rating}`)
          
          const card: Card = {
            due: new Date(existing.dueDate),
            stability: fromStoredStability(existing.stability),
            difficulty: fromStoredDifficulty(existing.difficulty),
            elapsed_days: existing.elapsedDays,
            scheduled_days: existing.scheduledDays,
            reps: existing.reps,
            lapses: existing.lapses,
            state: existing.state,
            last_review: existing.lastReview ? new Date(existing.lastReview) : undefined,
            learning_steps: 0
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
          savedCount++
        } else {
          // Create new card - should start in NEW state
          const newCard = createEmptyCard()
          
          console.log(`📝 Creating NEW card for line ${line.lineIndex}: score=${line.score}, needsPractice=${line.needsPractice}`)
          
          const newLine: IDBKaraokeLine = {
            songId: sessionData.songId,
            lineIndex: line.lineIndex,
            lineText: line.expectedText,
            difficulty: toStoredDifficulty(newCard.difficulty),
            stability: toStoredStability(newCard.stability),
            elapsedDays: 0,
            scheduledDays: 0,
            reps: 0, // Never been reviewed
            lapses: 0, // No failures yet
            state: 0, // NEW state
            lastReview: null, // Never reviewed
            dueDate: now, // NEW cards are always available immediately
            createdAt: now,
            updatedAt: now,
            synced: false,
            lastModified: now
          }

          await linesStore.add(newLine)
          savedCount++
        }
      }

      // Update sync metadata
      const metaStore = tx.objectStore('sync_metadata')
      const metadata = await metaStore.get('status')
      if (metadata && 'pendingChanges' in metadata) {
        metadata.pendingChanges += sessionData.lines.length + 1 // lines + session
        await metaStore.put(metadata)
      }

      await tx.done
      console.log(`✅ Saved karaoke session to IDB: ${sessionData.sessionId}`)
      console.log(`📊 Lines summary: ${savedCount} saved, ${skippedCount} skipped (didn't need practice)`)
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
      
      // Use provided sessionDate or calculate in YYYYMMDD format
      const sessionDate = exerciseData.sessionDate || parseInt(new Date(now).toISOString().slice(0, 10).replace(/-/g, ''))
      
      const idbSession: IDBExerciseSession = {
        ...exerciseData,
        sessionDate,
        synced: false,
        lastModified: now
      }
      await sessionStore.add(idbSession)

      // Update sync metadata
      const metaStore = tx.objectStore('sync_metadata')
      const metadata = await metaStore.get('status')
      if (metadata && 'pendingChanges' in metadata) {
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
        last_review: existing.lastReview ? new Date(existing.lastReview) : undefined,
        learning_steps: 0
      }

      // Apply FSRS algorithm
      const rating = wasCorrect ? Rating.Good : Rating.Again
      const scheduling = this.fsrs.repeat(card, new Date())
      const newCard = scheduling[rating].card
      
      // Log the scheduling details
      const intervalMinutes = (newCard.due.getTime() - Date.now()) / 60000
      console.log(`📅 FSRS scheduling: state ${card.state} → ${newCard.state}, rating=${rating}, interval=${intervalMinutes.toFixed(1)} minutes`)

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
      if (metadata && 'pendingChanges' in metadata && existing.synced) {
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
    if (metadata && 'pendingChanges' in metadata && 'lastSyncTimestamp' in metadata) {
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