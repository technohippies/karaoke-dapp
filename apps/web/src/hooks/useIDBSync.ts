import { useState, useEffect, useCallback } from 'react'
import { useAccount } from 'wagmi'
import { ethers } from 'ethers'
import { idbSyncService } from '../services'
import { idbReadService } from '../services'
import type { SyncStatus, SyncResult } from '../types/idb.types'

export function useIDBSync() {
  const { address } = useAccount()
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    pendingChanges: 0,
    lastSyncTimestamp: null,
    syncInProgress: false
  })
  const [isInitialized, setIsInitialized] = useState(false)

  // Initialize services
  useEffect(() => {
    const init = async () => {
      try {
        await idbSyncService.initialize()
        await idbReadService.initialize()
        setIsInitialized(true)
      } catch (error) {
        console.error('Failed to initialize IDB sync services:', error)
      }
    }
    init()
  }, [])

  // Load sync status
  useEffect(() => {
    if (isInitialized) {
      loadSyncStatus()
    }
  }, [isInitialized])

  const loadSyncStatus = async () => {
    try {
      const status = await idbReadService.getSyncStatus()
      setSyncStatus(status)
    } catch (error) {
      console.error('Failed to load sync status:', error)
    }
  }

  const syncToTableland = useCallback(async (signer: ethers.Signer): Promise<SyncResult> => {
    if (!address) {
      throw new Error('No wallet connected')
    }

    if (!isInitialized) {
      throw new Error('IDB services not initialized')
    }

    try {
      const result = await idbSyncService.syncToTableland(signer, address)
      await loadSyncStatus() // Reload status after sync
      return result
    } catch (error) {
      console.error('Sync to Tableland failed:', error)
      throw error
    }
  }, [address, isInitialized])

  const importFromTableland = useCallback(async (signer: ethers.Signer): Promise<void> => {
    if (!address) {
      throw new Error('No wallet connected')
    }

    if (!isInitialized) {
      throw new Error('IDB services not initialized')
    }

    try {
      // Import data (tablelandWriteService will be initialized by idbSyncService)
      const result = await idbSyncService.importFromTableland(signer, address)
      console.log('Import complete:', result)
      
      await loadSyncStatus() // Reload status after import
    } catch (error) {
      console.error('Import from Tableland failed:', error)
      throw error
    }
  }, [address, isInitialized])

  return {
    syncStatus,
    syncToTableland,
    importFromTableland,
    refreshSyncStatus: loadSyncStatus,
    isInitialized
  }
}