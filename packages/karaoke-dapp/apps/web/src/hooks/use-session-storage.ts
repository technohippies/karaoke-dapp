import { useState, useEffect, useCallback } from 'react'
import { sessionStorage, type KaraokeSession, type KaraokeLineResult } from '../lib/session-storage'

export function useSessionStorage() {
  const [isInitialized, setIsInitialized] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    sessionStorage.initialize()
      .then(() => setIsInitialized(true))
      .catch(err => setError(err.message))
  }, [])

  const saveSession = useCallback(async (session: KaraokeSession, pkpSignature?: string) => {
    try {
      setError(null)
      await sessionStorage.saveSession(session, pkpSignature)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save session'
      setError(message)
      throw err
    }
  }, [])

  const getSession = useCallback(async (sessionId: string): Promise<KaraokeSession | null> => {
    try {
      setError(null)
      return await sessionStorage.getSession(sessionId)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to get session'
      setError(message)
      throw err
    }
  }, [])

  const getUserSessions = useCallback(async (userId: string): Promise<KaraokeSession[]> => {
    try {
      setError(null)
      return await sessionStorage.getSessionsByUser(userId)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to get user sessions'
      setError(message)
      throw err
    }
  }, [])

  const getUnsettledSessions = useCallback(async (userId: string): Promise<KaraokeSession[]> => {
    try {
      setError(null)
      return await sessionStorage.getUnsettledSessions(userId)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to get unsettled sessions'
      setError(message)
      throw err
    }
  }, [])

  const markSessionSettled = useCallback(async (sessionId: string) => {
    try {
      setError(null)
      await sessionStorage.markSessionSettled(sessionId)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to mark session as settled'
      setError(message)
      throw err
    }
  }, [])

  const deleteSession = useCallback(async (sessionId: string) => {
    try {
      setError(null)
      await sessionStorage.deleteSession(sessionId)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete session'
      setError(message)
      throw err
    }
  }, [])

  const clearAllSessions = useCallback(async () => {
    try {
      setError(null)
      await sessionStorage.clearAllSessions()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to clear sessions'
      setError(message)
      throw err
    }
  }, [])

  const getSessionIntegrity = useCallback(async (sessionId: string) => {
    try {
      setError(null)
      return await sessionStorage.getSessionIntegrityInfo(sessionId)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to check session integrity'
      setError(message)
      throw err
    }
  }, [])

  return {
    isInitialized,
    error,
    saveSession,
    getSession,
    getUserSessions,
    getUnsettledSessions,
    markSessionSettled,
    deleteSession,
    clearAllSessions,
    getSessionIntegrity
  }
}

export type { KaraokeSession, KaraokeLineResult }