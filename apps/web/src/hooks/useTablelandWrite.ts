import { useState, useCallback, useEffect } from 'react'
import { useAccount, useWalletClient } from 'wagmi'
import { tablelandWriteService } from '../services/database/tableland/TablelandWriteService'
import { walletClientToSigner } from '../utils/walletClientToSigner'

interface SaveKaraokeParams {
  songId: number
  score: number
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
      // Create mock session data - in a real app this would come from actual karaoke performance
      const mockSessionData: any = {
        sessionId: `karaoke_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userAddress: address,
        songId: params.songId,
        songTitle: "Mock Song Title", // This should come from song metadata
        artistName: "Mock Artist", // This should come from song metadata
        totalScore: params.score,
        startedAt: params.startedAt,
        completedAt: Date.now(),
        lines: [] // This should contain actual line-by-line results
      }
      
      const hash = await tablelandWriteService.saveKaraokeSession(mockSessionData)
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