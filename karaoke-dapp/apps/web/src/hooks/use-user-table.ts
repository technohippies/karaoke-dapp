import { useState, useEffect, useCallback } from 'react'
import { useAccount } from 'wagmi'
import { userTableService, type UserTableInfo, type KaraokeSession } from '@karaoke-dapp/services'

export function useUserTable() {
  const { address, connector } = useAccount()
  const [isInitialized, setIsInitialized] = useState(false)
  const [userTables, setUserTables] = useState<UserTableInfo | null>(null)
  const [isCreatingTables, setIsCreatingTables] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasCheckedTables, setHasCheckedTables] = useState(false)

  // Initialize service when wallet connects
  useEffect(() => {
    async function init() {
      if (!connector || !address) {
        setIsInitialized(false)
        return
      }

      try {
        const provider = await connector.getProvider()
        await userTableService.initialize(provider)
        setIsInitialized(true)
        setError(null)
        // Don't check for tables until actually needed
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to initialize'
        setError(message)
        setIsInitialized(false)
      }
    }

    init()
  }, [connector, address])

  const checkUserTables = useCallback(async () => {
    if (!address || !isInitialized || hasCheckedTables) {
      return userTables
    }

    setHasCheckedTables(true)
    try {
      const existingTables = await userTableService.getUserTables(address)
      setUserTables(existingTables)
      return existingTables
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to check tables'
      setError(message)
      return null
    }
  }, [address, isInitialized, hasCheckedTables, userTables])

  const createUserTables = useCallback(async () => {
    if (!address || !isInitialized) {
      setError('Wallet not connected')
      return null
    }

    setIsCreatingTables(true)
    setError(null)

    try {
      const newTables = await userTableService.createUserTables(address)
      setUserTables(newTables)
      return newTables
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create tables'
      setError(message)
      throw err
    } finally {
      setIsCreatingTables(false)
    }
  }, [address, isInitialized])

  const saveSession = useCallback(async (session: KaraokeSession, songId?: number) => {
    // Check tables first if we haven't already
    if (!hasCheckedTables) {
      await checkUserTables()
    }

    if (!address || !isInitialized) {
      setError('Wallet not connected')
      throw new Error('Wallet not connected')
    }

    try {
      setError(null)
      await userTableService.saveKaraokeSession(address, session, songId)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save session'
      setError(message)
      throw err
    }
  }, [address, isInitialized])

  const saveExerciseSession = useCallback(async (
    sessionId: string,
    cardsReviewed: number,
    cardsCorrect: number
  ) => {
    if (!address || !isInitialized) {
      setError('Wallet not connected')
      throw new Error('Wallet not connected')
    }

    try {
      setError(null)
      await userTableService.saveExerciseSession(address, sessionId, cardsReviewed, cardsCorrect)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save exercise session'
      setError(message)
      throw err
    }
  }, [address, isInitialized])

  const getDueCards = useCallback(async (limit = 20) => {
    if (!address || !isInitialized) {
      return []
    }

    try {
      setError(null)
      return await userTableService.getDueCards(address, limit)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch due cards'
      setError(message)
      return []
    }
  }, [address, isInitialized])

  const getExerciseStreak = useCallback(async () => {
    if (!address || !isInitialized) {
      return 0
    }

    try {
      setError(null)
      return await userTableService.getExerciseStreak(address)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch streak'
      setError(message)
      return 0
    }
  }, [address, isInitialized])

  return {
    isInitialized,
    userTables,
    isCreatingTables,
    error,
    hasTables: !!userTables,
    checkUserTables,
    createUserTables,
    saveSession,
    saveExerciseSession,
    getDueCards,
    getExerciseStreak
  }
}