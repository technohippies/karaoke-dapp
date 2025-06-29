import { useState, useCallback } from 'react'
import { useAccount } from 'wagmi'
import { useSessionStorage, type KaraokeSession } from './use-session-storage'
import { useUserTable } from './use-user-table'

export interface KaraokeFlowState {
  showTableCreation: boolean
  pendingSession: KaraokeSession | null
  isProcessing: boolean
  error: string | null
}

export function useKaraokeFlow() {
  const { address } = useAccount()
  const { saveSession, markSessionSettled } = useSessionStorage()
  const { hasTable, saveSession: saveToTableland } = useUserTable()
  
  const [state, setState] = useState<KaraokeFlowState>({
    showTableCreation: false,
    pendingSession: null,
    isProcessing: false,
    error: null
  })

  const completeKaraokeSession = useCallback(async (
    session: KaraokeSession,
    pkpSignature?: string
  ) => {
    if (!address) {
      setState(prev => ({ ...prev, error: 'Wallet not connected' }))
      return
    }

    setState(prev => ({ ...prev, isProcessing: true, error: null }))

    try {
      // 1. Save to IndexedDB with PKP signature
      await saveSession(session, pkpSignature)
      console.log('✅ Session saved to IndexedDB')

      // 2. Check if user has a Tableland table
      if (!hasTable && !state.pendingSession) {
        // First karaoke - show table creation modal
        setState(prev => ({
          ...prev,
          showTableCreation: true,
          pendingSession: session,
          isProcessing: false
        }))
        return
      }

      // 3. If table exists, save to Tableland
      if (hasTable) {
        await saveToTableland(session)
        console.log('✅ Session saved to Tableland')
      }

      // 4. Mark session as settled in IndexedDB
      await markSessionSettled(session.sessionId)
      console.log('✅ Session marked as settled')

      setState(prev => ({ ...prev, isProcessing: false }))
      
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save session'
      setState(prev => ({ 
        ...prev, 
        error: message,
        isProcessing: false 
      }))
      throw error
    }
  }, [address, hasTable, saveSession, saveToTableland, markSessionSettled, state.pendingSession])

  const handleTableCreated = useCallback(async (tableName: string) => {
    console.log('✅ User table created:', tableName)
    
    setState(prev => ({ ...prev, showTableCreation: false }))

    // Save the pending session to the newly created table
    if (state.pendingSession) {
      try {
        await saveToTableland(state.pendingSession)
        await markSessionSettled(state.pendingSession.sessionId)
        console.log('✅ Pending session saved to Tableland')
      } catch (error) {
        console.error('Failed to save pending session:', error)
      }
    }

    setState(prev => ({ ...prev, pendingSession: null }))
  }, [state.pendingSession, saveToTableland, markSessionSettled])

  const handleTableCreationSkipped = useCallback(() => {
    setState(prev => ({ 
      ...prev, 
      showTableCreation: false,
      pendingSession: null 
    }))
  }, [])

  return {
    ...state,
    completeKaraokeSession,
    handleTableCreated,
    handleTableCreationSkipped
  }
}