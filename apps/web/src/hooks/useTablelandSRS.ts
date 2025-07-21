import { useState, useCallback, useEffect } from 'react'
import { useAccount, useWalletClient } from 'wagmi'
import { tablelandWriteService } from '../services/database/tableland/TablelandWriteService'
import { walletClientToSigner } from '../utils/walletClientToSigner'
import { tablelandService } from '../services/database/tableland/TablelandReadService'
import type { 
  KaraokeSessionData, 
  ExerciseSessionData,
  DueCard 
} from '../types/srs.types'

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

export function useTablelandSRS() {
  const { address, isConnected, chain } = useAccount()
  const { data: walletClient } = useWalletClient()
  const [isInitialized, setIsInitialized] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [lastChainId, setLastChainId] = useState<number | null>(null)

  // Initialize service when wallet is connected or chain changes
  useEffect(() => {
    const init = async () => {
      const currentChainId = chain?.id
      const needsInit = walletClient && (!isInitialized || (lastChainId && lastChainId !== currentChainId))
      
      if (needsInit) {
        console.log('🔍 Initializing Tableland SRS for chain:', currentChainId)
        try {
          const signer = await walletClientToSigner(walletClient)
          await tablelandWriteService.initialize(signer, true)
          setIsInitialized(true)
          setLastChainId(currentChainId || null)
        } catch (err) {
          console.error('❌ Failed to initialize Tableland:', err)
          setError('Failed to initialize database')
          setIsInitialized(false)
        }
      }
    }
    init()
  }, [walletClient, chain?.id, isInitialized, lastChainId])

  const saveKaraokeSession = useCallback(async (params: SaveKaraokeParams) => {
    if (!isConnected || !address || !isInitialized) {
      const msg = 'Wallet not connected or service not initialized'
      console.error('❌', msg)
      setError(msg)
      return null
    }
    
    // Ensure we're on the correct Tableland chain
    const tablelandChainId = Number(import.meta.env.VITE_TABLELAND_CHAIN_ID) || 11155420
    if (chain?.id !== tablelandChainId) {
      const msg = `Please switch to ${tablelandChainId === 8453 ? 'Base Mainnet' : 'Optimism Sepolia'} network`
      console.error('❌ Wrong chain:', chain?.id, 'need:', tablelandChainId)
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
      
      const id = await tablelandWriteService.saveKaraokeSession(sessionData)
      setSessionId(id)
      return id
    } catch (err) {
      console.error('Failed to save karaoke session:', err)
      setError(err instanceof Error ? err.message : 'Failed to save session')
      return null
    } finally {
      setIsSaving(false)
    }
  }, [address, isConnected, isInitialized, chain?.id])

  const saveExerciseSession = useCallback(async (data: Omit<ExerciseSessionData, 'userAddress'>) => {
    if (!isConnected || !address || !isInitialized) {
      const msg = 'Wallet not connected or service not initialized'
      console.error('❌', msg)
      setError(msg)
      return null
    }

    try {
      const exerciseData: ExerciseSessionData = {
        ...data,
        userAddress: address
      }
      return await tablelandWriteService.saveExerciseSession(exerciseData)
    } catch (err) {
      console.error('Failed to save exercise session:', err)
      setError(err instanceof Error ? err.message : 'Failed to save session')
      return null
    }
  }, [address, isConnected, isInitialized])

  const getDueCards = useCallback(async (limit?: number): Promise<DueCard[]> => {
    if (!isConnected || !address || !isInitialized) {
      return []
    }

    try {
      return await tablelandWriteService.getDueCards(address, limit)
    } catch (err) {
      console.error('Failed to get due cards:', err)
      return []
    }
  }, [address, isConnected, isInitialized])

  const updateCardReview = useCallback(async (
    songId: number,
    lineIndex: number,
    wasCorrect: boolean
  ) => {
    if (!isConnected || !address || !isInitialized) {
      return
    }

    try {
      await tablelandWriteService.updateCardReview(address, songId, lineIndex, wasCorrect)
    } catch (err) {
      console.error('Failed to update card review:', err)
      setError(err instanceof Error ? err.message : 'Failed to update card')
    }
  }, [address, isConnected, isInitialized])

  const getUserStats = useCallback(async () => {
    if (!isConnected || !address || !isInitialized) {
      return {
        totalSessions: 0,
        totalCards: 0,
        cardsToReview: 0,
        averageScore: 0
      }
    }

    try {
      return await tablelandWriteService.getUserStats(address)
    } catch (err) {
      console.error('Failed to get user stats:', err)
      return {
        totalSessions: 0,
        totalCards: 0,
        cardsToReview: 0,
        averageScore: 0
      }
    }
  }, [address, isConnected, isInitialized])

  return {
    // State
    isReady: isConnected && isInitialized,
    isInitialized,
    isSaving,
    error,
    sessionId,
    currentChainId: chain?.id,
    
    // Methods
    saveKaraokeSession,
    saveExerciseSession,
    getDueCards,
    updateCardReview,
    getUserStats
  }
}