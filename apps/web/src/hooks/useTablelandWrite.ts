import { useState, useCallback, useEffect } from 'react'
import { useAccount, useWalletClient } from 'wagmi'
import { tablelandWriteService } from '../services/database/tableland/TablelandWriteService'
import { walletClientToSigner } from '../utils/walletClientToSigner'

interface SaveKaraokeParams {
  songId: number
  score: number
  scoringDetails: any
  transcript: string
  startedAt: number
}

export function useTablelandWrite() {
  const { address, isConnected, chain } = useAccount()
  const { data: walletClient } = useWalletClient()
  const [isInitialized, setIsInitialized] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sessionHash, setSessionHash] = useState<string | null>(null)
  const [lastChainId, setLastChainId] = useState<number | null>(null)
  
  // Remove verbose logging in production
  // console.log('🎯 useTablelandWrite state:', {
  //   isConnected,
  //   currentChain: chain?.id,
  //   isInitialized,
  //   error
  // })

  // Initialize service when wallet is connected or chain changes
  useEffect(() => {
    const init = async () => {
      // Check if we need to reinitialize due to chain change
      const currentChainId = chain?.id
      const needsInit = walletClient && (!isInitialized || (lastChainId && lastChainId !== currentChainId))
      
      // Only log if initialization is needed
      if (needsInit) {
        console.log('🔍 Tableland init needed for chain:', currentChainId)
      }
      
      if (needsInit) {
        try {
          const signer = await walletClientToSigner(walletClient)
          await tablelandWriteService.initialize(signer, true) // Force reinit
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
    
    // Ensure we're on Optimism Sepolia
    if (chain?.id !== 11155420) {
      const msg = 'Please switch to Optimism Sepolia network'
      console.error('❌ Wrong chain:', chain?.id, 'need:', 11155420)
      setError(msg)
      return null
    }

    setIsSaving(true)
    setError(null)

    try {
      const hash = await tablelandWriteService.saveKaraokeSession(
        address,
        params.songId,
        params.score,
        params.scoringDetails,
        params.transcript,
        params.startedAt
      )
      setSessionHash(hash)
      return hash
    } catch (err) {
      console.error('Failed to save karaoke session:', err)
      setError(err instanceof Error ? err.message : 'Failed to save session')
      return null
    } finally {
      setIsSaving(false)
    }
  }, [address, isConnected, isInitialized, chain?.id])

  const getUserHistory = useCallback(async () => {
    if (!isConnected || !address || !isInitialized) {
      return []
    }

    try {
      return await tablelandWriteService.getUserHistory(address)
    } catch (err) {
      console.error('Failed to get user history:', err)
      return []
    }
  }, [address, isConnected, isInitialized, chain?.id])

  return {
    saveKaraokeSession,
    getUserHistory,
    isSaving,
    error,
    sessionHash,
    isReady: isConnected && isInitialized,
    currentChainId: chain?.id,
    isInitialized
  }
}