import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { CloseHeader } from './CloseHeader'
import { Spinner } from './ui/spinner'
import { Button } from './ui/button'
import coachImage from '../assets/scarlett-right-128x128.png'
import { useIDBSRS } from '../hooks/useIDBSRS'
import { ChainSwitcher } from './ChainSwitcher'
import { useAccount } from 'wagmi'

interface LineScore {
  lineIndex: number
  score: number
  needsPractice: boolean
  expectedText?: string
  transcribedText?: string
}

interface ScoringDetails {
  lines: LineScore[]
  overall_score: number
}

export interface KaraokeCompletionProps {
  initialProgressState?: 'idle' | 'saving' | 'saved' | 'syncing' | 'synced'
  hasTable?: boolean
  score?: number
  scoringDetails?: ScoringDetails
  transcript?: string
  songId?: string
  startedAt?: number
  onClose: () => void
}

export function KaraokeCompletion({ 
  initialProgressState = 'idle', 
  hasTable = false, 
  score = 85,
  scoringDetails,
  transcript,
  songId,
  startedAt = Date.now(),
  onClose
}: KaraokeCompletionProps) {
  const navigate = useNavigate()
  const [progressState, setProgressState] = useState<'idle' | 'saving' | 'saved' | 'syncing' | 'synced'>(initialProgressState)
  const [localSaveComplete, setLocalSaveComplete] = useState(false)
  const { 
    saveKaraokeSession, 
    syncToTableland, 
    isReady, 
    currentChainId, 
    isInitialized,
    syncStatus,
    isSyncing 
  } = useIDBSRS()
  const [saveError, setSaveError] = useState<string | null>(null)
  const [syncError, setSyncError] = useState<string | null>(null)
  const { chain } = useAccount()
  
  // Auto-save to IDB when component mounts with scoring data
  useEffect(() => {
    const autoSaveToIDB = async () => {
      if (!isInitialized || !songId || !scoringDetails || localSaveComplete) {
        return
      }
      
      console.log('🔄 Auto-saving to IDB...')
      try {
        const sessionHash = await saveKaraokeSession({
          songId: parseInt(songId),
          score: score || 0,
          scoringDetails,
          transcript: transcript || '',
          startedAt
        })
        
        if (sessionHash) {
          setLocalSaveComplete(true)
          console.log('✅ Auto-saved to IDB:', sessionHash)
        }
      } catch (err) {
        console.error('❌ Auto-save to IDB failed:', err)
      }
    }
    
    autoSaveToIDB()
  }, [isInitialized, songId, scoringDetails, score, transcript, startedAt, saveKaraokeSession, localSaveComplete])
  
  // Monitor chain changes
  useEffect(() => {
    console.log('🔗 KaraokeCompletion chain changed:', {
      chainId: chain?.id,
      chainName: chain?.name,
      isReady,
      isInitialized
    })
  }, [chain, isReady, isInitialized])
  
  console.log('📊 KaraokeCompletion state:', {
    progressState,
    isReady,
    currentChainId,
    isInitialized,
    saveError,
    syncError,
    actualChain: chain?.id,
    syncStatus
  })

  const getScoreMessage = () => {
    if (score >= 90) return "Excellent work!"
    if (score >= 80) return "Good job!"
    if (score >= 70) return "Keep practicing!"
    if (score >= 60) return "You're getting there!"
    return "Don't give up!"
  }

  const getActionMessage = () => {
    if (progressState === 'synced') return "Now you can study with exercises!"
    return "Your progress is saved locally. Study with exercises anytime!"
  }

  const handleSyncToChain = async () => {
    if (!isReady) {
      setSyncError('Unable to sync: wallet not connected')
      return
    }
    
    setProgressState('syncing')
    setSyncError(null)
    
    try {
      const result = await syncToTableland()
      
      if (result && result.success && (result.syncedSessions > 0 || result.syncedLines > 0 || result.syncedExercises > 0)) {
        setProgressState('synced')
        console.log('✅ Synced to chain:', result)
      } else {
        // User declined or no data was synced
        setProgressState('idle')
        console.log('⚠️ Sync incomplete or declined:', result)
      }
    } catch (err) {
      setProgressState('idle')
      console.error('Sync error:', err)
    }
  }

  const handlePractice = () => {
    navigate('/study')
  }

  const getProgressContent = () => {
    // Show sync status if there are pending changes
    const showSyncButton = localSaveComplete && syncStatus.pendingChanges > 0

    return (
      <div className="grid grid-cols-2 gap-3">
        {/* Study button - always on the left */}
        <Button
          variant="secondary"
          onClick={handlePractice}
          className="w-full"
        >
          Study
        </Button>
        
        {/* Sync button - always on the right */}
        <div className="w-full">
          <ChainSwitcher 
            requiredChainId={11155420}
            className="w-full"
          >
            <Button
              onClick={handleSyncToChain}
              disabled={progressState === 'syncing' || progressState === 'synced' || !showSyncButton}
              className="w-full"
            >
              {progressState === 'syncing' ? (
                <>
                  <Spinner size="sm" />
                  Syncing...
                </>
              ) : progressState === 'synced' ? (
                'Saved'
              ) : (
                'Save Progress'
              )}
            </Button>
          </ChainSwitcher>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-900 relative overflow-hidden">
      <div className="relative z-10 h-screen flex flex-col">
        <CloseHeader onClose={onClose} />
        
        <div className="flex-1 overflow-y-auto">
          <div className="w-full max-w-2xl mx-auto px-6 pt-8 pb-24 flex items-center justify-center min-h-full">
            <div className="text-center">
              <h1 className="text-4xl font-bold text-white mb-8">Score</h1>
              
              <div className="text-6xl font-bold text-white mb-8">
                {score}
              </div>
              
              {/* Error message */}
              {saveError && (
                <div className="text-red-400 text-sm mb-4">
                  {saveError}
                </div>
              )}

              {/* Coach feedback */}
              <div className="flex gap-4 w-full max-w-lg mb-8">
                <div className="w-16 h-16 bg-neutral-700 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
                  <img src={coachImage} alt="Coach" className="w-full h-full object-cover" />
                </div>
                <div className="bg-neutral-800 px-4 py-3 rounded-lg w-96">
                  <p className="text-lg text-neutral-300 text-left">
                    {getScoreMessage()}
                  </p>
                  {getActionMessage() && (
                    <p className="text-lg text-neutral-400 text-left mt-2">
                      {progressState === 'idle' && !isReady ? 
                        'Connect your wallet to Optimism Sepolia to save progress' : 
                        getActionMessage()
                      }
                    </p>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Sticky footer with action button */}
        <div className="fixed bottom-0 left-0 right-0 bg-neutral-900/95 backdrop-blur-sm border-t border-neutral-700 z-20">
          <div className="w-full max-w-2xl mx-auto px-6 py-4">
            {getProgressContent()}
          </div>
        </div>
      </div>
    </div>
  )
}