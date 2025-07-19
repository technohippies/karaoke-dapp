import { useState, useCallback, useEffect } from 'react'
import { useAccount, useWalletClient } from 'wagmi'
import { walletClientToSigner } from '../utils/walletClientToSigner'
import { tablelandService } from '../services/database/tableland/TablelandReadService'
import { idbWriteService } from '../services/database/idb/IDBWriteService'
import { idbReadService } from '../services/database/idb/IDBReadService'
import { idbSyncService } from '../services/database/idb/IDBSyncService'
import type { 
  KaraokeSessionData, 
  ExerciseSessionData,
  DueCard 
} from '../types/srs.types'
import type { SyncStatus, SyncResult } from '../types/idb.types'

interface SaveKaraokeParams {
  songId: number
  score: number
  scoringDetails: {
    lines: Array<{
      lineIndex: number
      expectedText: string
      transcribedText: string
      score: number
      needsPractice: boolean
    }>
  }
  transcript: string
  startedAt: number
}

export function useIDBSRS() {
  const { address, isConnected, chain } = useAccount()
  const { data: walletClient } = useWalletClient()
  const [isInitialized, setIsInitialized] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    pendingChanges: 0,
    lastSyncTimestamp: null,
    syncInProgress: false
  })

  // Initialize IDB services on mount
  useEffect(() => {
    const init = async () => {
      try {
        await idbWriteService.initialize()
        await idbReadService.initialize()
        await idbSyncService.initialize()
        setIsInitialized(true)
        console.log('✅ IDB services initialized')
        
        // Load initial sync status
        const status = await idbReadService.getSyncStatus()
        setSyncStatus(status)
      } catch (err) {
        console.error('❌ Failed to initialize IDB:', err)
        setError('Failed to initialize local database')
        setIsInitialized(false)
      }
    }
    init()
  }, [])

  // Load sync status once on initialization
  useEffect(() => {
    if (!isInitialized) return

    const loadSyncStatus = async () => {
      const status = await idbReadService.getSyncStatus()
      setSyncStatus(status)
    }

    loadSyncStatus()
  }, [isInitialized])

  const saveKaraokeSession = useCallback(async (params: SaveKaraokeParams) => {
    if (!isInitialized || !address) {
      const msg = 'Database not initialized or wallet not connected'
      console.error('❌', msg)
      setError(msg)
      return null
    }

    setIsSaving(true)
    setError(null)

    try {
      // Fetch song metadata
      const song = await tablelandService.getSongById(params.songId)
      if (!song) {
        throw new Error('Song not found')
      }
      
      // Convert to KaraokeSessionData format
      const sessionData: KaraokeSessionData = {
        sessionId: `${address}_${params.songId}_${Date.now()}`,
        userAddress: address,
        songId: params.songId,
        songTitle: song.title,
        artistName: song.artist,
        totalScore: params.score,
        startedAt: params.startedAt,
        completedAt: Date.now(),
        lines: params.scoringDetails?.lines || []
      }
      
      // Save to IDB only - no signature required!
      const id = await idbWriteService.saveKaraokeSession(sessionData)
      setSessionId(id)
      
      // Update sync status
      const status = await idbReadService.getSyncStatus()
      setSyncStatus(status)
      
      return id
    } catch (err) {
      console.error('Failed to save karaoke session:', err)
      setError(err instanceof Error ? err.message : 'Failed to save session')
      return null
    } finally {
      setIsSaving(false)
    }
  }, [address, isInitialized])

  const saveExerciseSession = useCallback(async (data: Omit<ExerciseSessionData, 'userAddress'>) => {
    if (!isInitialized || !address) {
      const msg = 'Database not initialized or wallet not connected'
      console.error('❌', msg)
      setError(msg)
      return null
    }

    try {
      const exerciseData: ExerciseSessionData = {
        ...data,
        userAddress: address
      }
      
      // Save to IDB only
      const id = await idbWriteService.saveExerciseSession(exerciseData)
      
      // Update sync status
      const status = await idbReadService.getSyncStatus()
      setSyncStatus(status)
      
      return id
    } catch (err) {
      console.error('Failed to save exercise session:', err)
      setError(err instanceof Error ? err.message : 'Failed to save session')
      return null
    }
  }, [address, isInitialized])

  const getDueCards = useCallback(async (limit?: number): Promise<DueCard[]> => {
    if (!isInitialized) {
      return []
    }

    try {
      return await idbReadService.getDueCards(limit)
    } catch (err) {
      console.error('Failed to get due cards:', err)
      return []
    }
  }, [isInitialized])

  const updateCardReview = useCallback(async (
    songId: number,
    lineIndex: number,
    wasCorrect: boolean
  ) => {
    if (!isInitialized) {
      return
    }

    try {
      await idbWriteService.updateCardReview(songId, lineIndex, wasCorrect)
      
      // Update sync status
      const status = await idbReadService.getSyncStatus()
      setSyncStatus(status)
    } catch (err) {
      console.error('Failed to update card review:', err)
      setError(err instanceof Error ? err.message : 'Failed to update card')
    }
  }, [isInitialized])

  const getUserStats = useCallback(async () => {
    if (!isInitialized) {
      return {
        totalSessions: 0,
        totalCards: 0,
        cardsToReview: 0,
        averageScore: 0
      }
    }

    try {
      return await idbReadService.getUserStats()
    } catch (err) {
      console.error('Failed to get user stats:', err)
      return {
        totalSessions: 0,
        totalCards: 0,
        cardsToReview: 0,
        averageScore: 0
      }
    }
  }, [isInitialized])

  // Manual sync to Tableland - requires signature
  const syncToTableland = useCallback(async (): Promise<SyncResult | null> => {
    if (!isInitialized || !walletClient || !address) {
      const msg = 'Wallet not connected or service not initialized'
      console.error('❌', msg)
      setError(msg)
      return null
    }

    // Ensure we're on Optimism Sepolia for Tableland
    if (chain?.id !== 11155420) {
      const msg = 'Please switch to Optimism Sepolia network for sync'
      console.error('❌ Wrong chain:', chain?.id, 'need:', 11155420)
      setError(msg)
      return null
    }

    setIsSyncing(true)
    setError(null)

    try {
      const signer = await walletClientToSigner(walletClient)
      const result = await idbSyncService.syncToTableland(signer, address)
      
      // Update sync status
      const status = await idbReadService.getSyncStatus()
      setSyncStatus(status)
      
      return result
    } catch (err) {
      console.error('Sync to Tableland failed:', err)
      setError(err instanceof Error ? err.message : 'Sync failed')
      return null
    } finally {
      setIsSyncing(false)
    }
  }, [address, walletClient, isInitialized, chain?.id])

  // Import from Tableland (for recovery)
  const importFromTableland = useCallback(async () => {
    if (!isInitialized || !address || !walletClient) {
      const msg = 'Wallet not connected or service not initialized'
      console.error('❌', msg)
      setError(msg)
      return null
    }

    try {
      const signer = await walletClientToSigner(walletClient)
      const result = await idbSyncService.importFromTableland(signer, address)
      
      // Update sync status
      const status = await idbReadService.getSyncStatus()
      setSyncStatus(status)
      
      return result
    } catch (err) {
      console.error('Import from Tableland failed:', err)
      setError(err instanceof Error ? err.message : 'Import failed')
      return null
    }
  }, [address, walletClient, isInitialized])

  // Check if user has data on Tableland (for recovery flow)
  const hasTablelandData = useCallback(async (): Promise<boolean> => {
    if (!address) return false
    
    try {
      return await idbSyncService.hasTablelandData(address)
    } catch (err) {
      console.error('Failed to check Tableland data:', err)
      return false
    }
  }, [address])

  return {
    // State
    isReady: isConnected && isInitialized,
    isInitialized,
    isSaving,
    isSyncing,
    error,
    sessionId,
    syncStatus,
    currentChainId: chain?.id,
    
    // Local operations (no signature required)
    saveKaraokeSession,
    saveExerciseSession,
    getDueCards,
    updateCardReview,
    getUserStats,
    
    // Sync operations (signature required)
    syncToTableland,
    importFromTableland,
    hasTablelandData
  }
}