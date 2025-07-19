import { openDB, type IDBPDatabase } from 'idb'
import { ethers } from 'ethers'
import type { 
  KaraokeSRSDB,
  IDBKaraokeSession,
  SyncResult
} from '../../../types/idb.types'
import type { 
  KaraokeSessionData,
  ExerciseSessionData
} from '../../../types/srs.types'
import { tablelandWriteService } from '../tableland/TablelandWriteService'
import { idbReadService } from './IDBReadService'
import { idbWriteService } from './IDBWriteService'

export class IDBSyncService {
  private db: IDBPDatabase<KaraokeSRSDB> | null = null
  private DB_NAME = 'KaraokeSRS'
  private DB_VERSION = 2

  async initialize(): Promise<void> {
    if (this.db) return

    try {
      this.db = await openDB<KaraokeSRSDB>(this.DB_NAME, this.DB_VERSION)
      console.log('✅ IDB Sync Service initialized')
    } catch (error) {
      console.error('❌ Failed to initialize IDB Sync Service:', error)
      throw error
    }
  }

  /**
   * Manual sync to Tableland - requires user signature
   */
  async syncToTableland(signer: ethers.Signer, userAddress: string): Promise<SyncResult> {
    if (!this.db) {
      throw new Error('IDB not initialized')
    }

    // Check if sync is already in progress
    const syncStatus = await idbReadService.getSyncStatus()
    if (syncStatus.syncInProgress) {
      throw new Error('Sync already in progress')
    }

    // Mark sync as in progress
    await this.updateSyncStatus({ syncInProgress: true })

    try {
      // Initialize Tableland with signer
      await tablelandWriteService.initialize(signer)

      // Get all unsynced data
      const { sessions, lines, exercises } = await idbReadService.getUnsyncedData()

      console.log(`📤 Syncing to Tableland: ${sessions.length} sessions, ${lines.length} lines, ${exercises.length} exercises`)

      // Convert IDB data to formats needed for sync
      const sessionDataArray: KaraokeSessionData[] = sessions.map(session => ({
        sessionId: session.sessionId,
        userAddress,
        songId: session.songId,
        songTitle: session.songTitle,
        artistName: session.artistName,
        totalScore: session.totalScore,
        startedAt: session.startedAt,
        completedAt: session.completedAt,
        lines: session.lines
      }))

      // Extract line updates from IDB lines (these are individual updates from exercises)
      const lineUpdates: Array<{ songId: number; lineIndex: number; wasCorrect: boolean }> = lines.map(line => ({
        songId: line.songId,
        lineIndex: line.lineIndex,
        wasCorrect: line.lapses === 0 // Simplified - in a real app might track more detail
      }))

      // Convert exercise sessions
      const exerciseDataArray: ExerciseSessionData[] = exercises.map(exercise => ({
        sessionId: exercise.sessionId,
        userAddress,
        cardsReviewed: exercise.cardsReviewed,
        cardsCorrect: exercise.cardsCorrect,
        startedAt: exercise.startedAt,
        completedAt: exercise.completedAt,
        sessionDate: exercise.sessionDate
      }))

      // Execute everything in ONE transaction!
      const result = await tablelandWriteService.syncAllDataInOneTransaction(
        userAddress,
        sessionDataArray,
        lineUpdates,
        exerciseDataArray
      )

      // Mark all items as synced
      const sessionIds = sessions.map(s => s.id!).filter(id => id !== undefined)
      const lineIds = lines.map(l => l.id!).filter(id => id !== undefined)
      const exerciseIds = exercises.map(e => e.id!).filter(id => id !== undefined)

      if (sessionIds.length > 0) {
        await idbWriteService.markAsSynced('karaoke_sessions', sessionIds)
      }
      if (lineIds.length > 0) {
        await idbWriteService.markAsSynced('karaoke_lines', lineIds)
      }
      if (exerciseIds.length > 0) {
        await idbWriteService.markAsSynced('exercise_sessions', exerciseIds)
      }

      // Update sync status
      await this.updateSyncStatus({
        syncInProgress: false,
        lastSyncTimestamp: Date.now(),
        lastSyncError: undefined
      })

      const syncResult: SyncResult = {
        success: true,
        syncedSessions: sessionIds.length,
        syncedLines: lineIds.length,
        syncedExercises: exerciseIds.length
      }

      console.log('✅ Sync completed with single transaction:', result.transactionHash)
      return syncResult

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
      // Update sync status with error
      await this.updateSyncStatus({
        syncInProgress: false,
        lastSyncError: errorMessage
      })

      console.error('❌ Sync failed:', error)
      throw error
    }
  }

  /**
   * Import data from Tableland to IDB (for recovery/new device)
   */
  async importFromTableland(signer: ethers.Signer, userAddress: string): Promise<{
    importedSessions: number
    importedLines: number
    importedExercises: number
  }> {
    if (!this.db) {
      throw new Error('IDB not initialized')
    }

    try {
      console.log('📥 Importing data from Tableland for user:', userAddress)

      // Initialize Tableland with signer
      await tablelandWriteService.initialize(signer)

      // Get user's Tableland tables
      const tables = await tablelandWriteService.getUserTables(userAddress)
      if (!tables) {
        console.log('No Tableland tables found for user')
        return { importedSessions: 0, importedLines: 0, importedExercises: 0 }
      }

      // Get all data from Tableland
      const history = await tablelandWriteService.getUserHistory(userAddress)
      // const stats = await tablelandWriteService.getUserStats(userAddress)

      // For now, we'll import the history sessions
      // In a full implementation, we'd need to query all three tables
      let importedSessions = 0
      let importedLines = 0
      let importedExercises = 0

      // Clear existing data before import
      await idbWriteService.clearAllData()

      // Import sessions (simplified - in reality we'd need to reconstruct full data)
      for (const session of history) {
        // Note: This is a simplified import - we'd need to query line details too
        const idbSession: IDBKaraokeSession = {
          sessionId: session.session_id,
          songId: session.song_id,
          songTitle: session.song_title,
          artistName: session.artist_name,
          totalScore: session.total_score,
          startedAt: session.started_at,
          completedAt: session.completed_at,
          lines: [], // Would need to query these separately
          synced: true, // Mark as synced since it came from Tableland
          lastModified: Date.now()
        }

        const tx = this.db.transaction('karaoke_sessions', 'readwrite')
        await tx.objectStore('karaoke_sessions').add(idbSession)
        importedSessions++
      }

      console.log(`✅ Imported ${importedSessions} sessions from Tableland`)

      return {
        importedSessions,
        importedLines,
        importedExercises
      }

    } catch (error) {
      console.error('❌ Import from Tableland failed:', error)
      throw error
    }
  }

  private async updateSyncStatus(updates: Partial<{
    syncInProgress: boolean
    lastSyncTimestamp: number
    lastSyncError?: string
  }>): Promise<void> {
    if (!this.db) return

    const tx = this.db.transaction('sync_metadata', 'readwrite')
    const store = tx.objectStore('sync_metadata')
    const current = await store.get('status')

    if (current) {
      Object.assign(current, updates)
      await store.put(current)
    }
  }

  /**
   * Check if user has Tableland tables (for recovery flow)
   */
  async hasTablelandData(userAddress: string): Promise<boolean> {
    try {
      const tables = await tablelandWriteService.getUserTables(userAddress)
      return tables !== null
    } catch (error) {
      console.error('Failed to check Tableland data:', error)
      return false
    }
  }
}

// Export singleton instance
export const idbSyncService = new IDBSyncService()