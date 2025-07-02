import { useState, useEffect, useCallback } from 'react'
import { useAccount } from 'wagmi'
import { userTableService, type KaraokeHistoryRow, type KaraokeSession } from '@karaoke-dapp/services'

export function useUserTable() {
  const { address, connector } = useAccount()
  const [isInitialized, setIsInitialized] = useState(false)
  const [tableName, setTableName] = useState<string | null>(null)
  const [isCreatingTable, setIsCreatingTable] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
        
        // Check if user already has a table
        const existingTable = await userTableService.getUserTableName(address)
        setTableName(existingTable)
        setIsInitialized(true)
        setError(null)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to initialize'
        setError(message)
        setIsInitialized(false)
      }
    }

    init()
  }, [connector, address])

  const createUserTable = useCallback(async () => {
    if (!address || !isInitialized) {
      setError('Wallet not connected')
      return null
    }

    setIsCreatingTable(true)
    setError(null)

    try {
      const newTableName = await userTableService.createUserTable(address)
      setTableName(newTableName)
      return newTableName
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create table'
      setError(message)
      throw err
    } finally {
      setIsCreatingTable(false)
    }
  }, [address, isInitialized])

  const saveSession = useCallback(async (session: KaraokeSession, songId?: number) => {
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

  const getUserHistory = useCallback(async (): Promise<KaraokeHistoryRow[]> => {
    if (!address || !isInitialized) {
      return []
    }

    try {
      setError(null)
      return await userTableService.getUserHistory(address)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch history'
      setError(message)
      return []
    }
  }, [address, isInitialized])

  const updateFSRSData = useCallback(async (
    sessionId: string,
    fsrsData: Partial<KaraokeHistoryRow>
  ) => {
    if (!address || !isInitialized) {
      setError('Wallet not connected')
      throw new Error('Wallet not connected')
    }

    try {
      setError(null)
      await userTableService.updateFSRSData(address, sessionId, fsrsData)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update FSRS data'
      setError(message)
      throw err
    }
  }, [address, isInitialized])

  return {
    isInitialized,
    tableName,
    isCreatingTable,
    error,
    hasTable: !!tableName,
    createUserTable,
    saveSession,
    getUserHistory,
    updateFSRSData
  }
}