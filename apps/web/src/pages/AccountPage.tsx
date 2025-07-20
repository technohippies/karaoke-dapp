import { useEffect, useState } from 'react'
import { useAccount, useWalletClient } from 'wagmi'
import { useTranslation } from 'react-i18next'
import { CrownCross, Fire } from '@phosphor-icons/react'
import { SimpleHeader } from '../components/SimpleHeader'
import { CreditsWidget } from '../components/CreditsWidget'
import { SyncStatus } from '../components/SyncStatus'
import { BASE_SEPOLIA_CHAIN_ID } from '../constants'
import { defaultChainId as DEFAULT_CHAIN_ID } from '../config/networks.config'
import { usePurchase } from '../hooks/usePurchase'
import { useStreak } from '../hooks/useStreak'
import { useIDBSync } from '../hooks/useIDBSync'
import { calculateStreakFromSessions } from '../services/streakService'
import { TablelandWriteService } from '../services/database/tableland/TablelandWriteService'
import { walletClientToSigner } from '../utils/walletClientToSigner'
import { SpinnerWithScarlett } from '../components/ui/spinner-with-scarlett'

export function AccountPage() {
  const { t } = useTranslation()
  const { isConnected, address, chain, isReconnecting } = useAccount()
  const { data: walletClient } = useWalletClient()
  const { balance, voiceCredits, songCredits } = usePurchase()
  const { currentStreak: localStreak, refreshStreak } = useStreak()
  const { syncToTableland, importFromTableland, syncStatus } = useIDBSync()
  
  const [cloudStreak, setCloudStreak] = useState<number | null>(null)
  const [isSyncing, setIsSyncing] = useState(false)
  const [isRecovering, setIsRecovering] = useState(false)
  
  // Load cloud streak from Tableland
  useEffect(() => {
    if (address && walletClient && chain?.id === DEFAULT_CHAIN_ID) {
      loadCloudStreak()
    }
  }, [address, walletClient, chain?.id])
  
  const loadCloudStreak = async () => {
    if (!address || !walletClient) return
    
    // setIsLoadingCloudStreak(true)
    try {
      const signer = await walletClientToSigner(walletClient)
      const tablelandService = new TablelandWriteService()
      await tablelandService.initialize(signer)
      
      const sessions = await tablelandService.getExerciseSessions(address)
      const streak = calculateStreakFromSessions(sessions)
      setCloudStreak(streak)
    } catch (error) {
      console.error('Failed to load cloud streak:', error)
      setCloudStreak(null)
    } finally {
      // setIsLoadingCloudStreak(false)
    }
  }
  
  const handleSaveProgress = async () => {
    if (!walletClient) return
    
    setIsSyncing(true)
    try {
      const signer = await walletClientToSigner(walletClient)
      await syncToTableland(signer)
      await loadCloudStreak() // Reload cloud streak
      await refreshStreak() // Refresh local streak
    } catch (error) {
      console.error('Failed to save progress:', error)
      alert(t('account.errors.failedToSave'))
    } finally {
      setIsSyncing(false)
    }
  }
  
  const handleRecover = async () => {
    if (!walletClient) return
    
    setIsRecovering(true)
    try {
      const signer = await walletClientToSigner(walletClient)
      await importFromTableland(signer)
      await refreshStreak() // Refresh local streak
      await loadCloudStreak() // Reload cloud streak
    } catch (error) {
      console.error('Failed to recover:', error)
      alert(t('account.errors.failedToRecover'))
    } finally {
      setIsRecovering(false)
    }
  }
  
  // Show loading state while reconnecting or not connected yet
  if (isReconnecting || !isConnected || !address) {
    return (
      <div className="min-h-screen bg-neutral-900 flex items-center justify-center">
        <SpinnerWithScarlett size="lg" />
      </div>
    )
  }
  
  return (
    <div className="min-h-screen bg-neutral-900">
      <SimpleHeader />
      
      <div className="pt-24 pb-24">
        <div className="w-full max-w-2xl mx-auto px-6">
          {/* Wallet Address */}
          <div className="mb-8">
            <p className="text-neutral-400 mb-2">{t('account.walletAddress')}</p>
            <p className="text-white font-mono break-all">{address}</p>
          </div>
          
          {/* Stats Row */}
          <div className="flex gap-4 mb-8">
            {/* Crown Count */}
            <div className="flex-1 bg-neutral-800 rounded-lg p-6 border border-neutral-700">
              <div className="flex items-start gap-3">
                <CrownCross size={24} weight="fill" className="text-yellow-500 flex-shrink-0 mt-1" />
                <div className="min-w-0">
                  <div className="text-3xl font-bold text-white">0</div>
                  <div className="text-neutral-400">{t('account.crowns')}</div>
                </div>
              </div>
            </div>
            
            {/* Streak */}
            <div className="flex-1 bg-neutral-800 rounded-lg p-6 border border-neutral-700">
              <div className="flex items-start gap-3">
                <Fire size={24} weight="fill" className="text-orange-500 flex-shrink-0 mt-1" />
                <div className="min-w-0">
                  <div className="text-3xl font-bold text-white">{localStreak}</div>
                  <div className="text-neutral-400">{t('account.dayStreak')}</div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Sync Status */}
          {chain?.id === DEFAULT_CHAIN_ID && (
            <div className="mb-8">
              <SyncStatus
                localStreak={localStreak}
                cloudStreak={cloudStreak}
                lastSyncTimestamp={syncStatus.lastSyncTimestamp}
                onSaveProgress={handleSaveProgress}
                onRecover={handleRecover}
                isSyncing={isSyncing}
                isRecovering={isRecovering}
              />
            </div>
          )}
          
          {/* Credits Widget */}
          <CreditsWidget 
            balance={balance}
            voiceCredits={voiceCredits}
            songCredits={songCredits}
          />
          
          {/* Network message */}
          {chain && chain.id !== DEFAULT_CHAIN_ID && (
            <div className="mt-4">
              <p className="text-neutral-400">
                {t('account.network.currentNetwork')}: {chain.name || `Chain ${chain.id}`}. {t('account.network.pleaseConnect')} {DEFAULT_CHAIN_ID === BASE_SEPOLIA_CHAIN_ID ? t('account.network.baseSepolia') : t('account.network.base')}.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}