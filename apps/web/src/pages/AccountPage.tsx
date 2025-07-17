import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAccount, useReadContract, useWalletClient } from 'wagmi'
import { CrownCross, Fire } from '@phosphor-icons/react'
import { SimpleHeader } from '../components/SimpleHeader'
import { CreditsWidget } from '../components/CreditsWidget'
import { SyncStatus } from '../components/SyncStatus'
import { Button } from '../components/ui/button'
import { KARAOKE_CONTRACT_ADDRESS, DEFAULT_CHAIN_ID, BASE_SEPOLIA_CHAIN_ID } from '../constants'
import { KARAOKE_SCHOOL_ABI } from '../contracts/abis/KaraokeSchool'
import { usePurchase } from '../hooks/usePurchase'
import { useStreak } from '../hooks/useStreak'
import { useIDBSync } from '../hooks/useIDBSync'
import { calculateStreakFromSessions } from '../services/streakService'
import { TablelandWriteService } from '../services/database/tableland/TablelandWriteService'
import { walletClientToSigner } from '../utils/walletClientToSigner'

export function AccountPage() {
  const navigate = useNavigate()
  const { isConnected, address, chain } = useAccount()
  const { data: walletClient } = useWalletClient()
  const { balance, voiceCredits, songCredits } = usePurchase()
  const { currentStreak: localStreak, refreshStreak } = useStreak()
  const { syncToTableland, importFromTableland, syncStatus } = useIDBSync()
  
  const [cloudStreak, setCloudStreak] = useState<number | null>(null)
  const [isLoadingCloudStreak, setIsLoadingCloudStreak] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [isRecovering, setIsRecovering] = useState(false)
  
  useEffect(() => {
    if (!isConnected || !address) {
      navigate('/')
    }
  }, [isConnected, address, navigate])
  
  // Load cloud streak from Tableland
  useEffect(() => {
    if (address && walletClient && chain?.id === DEFAULT_CHAIN_ID) {
      loadCloudStreak()
    }
  }, [address, walletClient, chain?.id])
  
  const loadCloudStreak = async () => {
    if (!address || !walletClient) return
    
    setIsLoadingCloudStreak(true)
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
      setIsLoadingCloudStreak(false)
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
      alert('Failed to save progress. Please try again.')
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
      alert('Failed to recover data. Please try again.')
    } finally {
      setIsRecovering(false)
    }
  }
  
  if (!isConnected || !address) {
    return null
  }
  
  return (
    <div className="min-h-screen bg-neutral-900">
      <SimpleHeader />
      
      <div className="pt-24 px-6 pb-24">
        <div className="w-full max-w-2xl mx-auto">
          {/* Wallet Address */}
          <div className="mb-8">
            <p className="text-neutral-400 mb-2">Your Wallet Address</p>
            <p className="text-white font-mono break-all">{address}</p>
          </div>
          
          {/* Stats Row */}
          <div className="flex gap-4 mb-8">
            {/* Crown Count */}
            <div className="flex-1 bg-neutral-800 rounded-lg p-6 border border-neutral-700">
              <div className="flex items-center gap-3">
                <CrownCross size={40} weight="fill" className="text-yellow-500" />
                <div>
                  <div className="text-3xl font-bold text-white">0</div>
                  <div className="text-neutral-400">Crowns <span className="text-neutral-500 text-sm">(Coming Soon)</span></div>
                </div>
              </div>
            </div>
            
            {/* Streak */}
            <div className="flex-1 bg-neutral-800 rounded-lg p-6 border border-neutral-700">
              <div className="flex items-center gap-3">
                <Fire size={40} weight="fill" className="text-orange-500" />
                <div>
                  <div className="text-3xl font-bold text-white">{localStreak}</div>
                  <div className="text-neutral-400">Day Streak</div>
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
                Network: {chain.name || `Chain ${chain.id}`}. Please connect to {DEFAULT_CHAIN_ID === BASE_SEPOLIA_CHAIN_ID ? 'Base Sepolia' : 'Base'}.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}