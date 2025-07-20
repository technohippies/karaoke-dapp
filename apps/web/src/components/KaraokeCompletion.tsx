import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CloseHeader } from './CloseHeader'
import { Spinner } from './ui/spinner'
import { Button } from './ui/button'
import { SpeechBubble } from './ui/speech-bubble'
import scarlettThumbsUp from '../assets/scarlett-thumbs-up.png'
import { useIDBSRS } from '../hooks/useIDBSRS'
import { ChainSwitcher } from './ChainSwitcher'
import { useAccount } from 'wagmi'
import { useDirectIDB } from '../hooks/useDirectIDB'

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
  score?: number
  scoringDetails?: ScoringDetails
  transcript?: string
  songId?: string
  startedAt?: number
  onClose: () => void
}

export function KaraokeCompletion({ 
  initialProgressState = 'idle', 
  score = 85,
  scoringDetails,
  transcript,
  songId,
  startedAt = Date.now(),
  onClose
}: KaraokeCompletionProps) {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [progressState, setProgressState] = useState<'idle' | 'saving' | 'saved' | 'syncing' | 'synced'>(initialProgressState)
  const [localSaveComplete, setLocalSaveComplete] = useState(false)
  const { 
    saveKaraokeSession, 
    syncToTableland, 
    isReady, 
    currentChainId, 
    isInitialized,
    syncStatus
  } = useIDBSRS()
  const { getDueCards } = useDirectIDB()
  const [saveError] = useState<string | null>(null)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [dueCardsCount, setDueCardsCount] = useState<number | null>(null)
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
          scoringDetails: scoringDetails ? {
            lines: scoringDetails.lines.map(line => ({
              lineIndex: line.lineIndex,
              expectedText: line.expectedText || '',
              transcribedText: line.transcribedText || '',
              score: line.score,
              needsPractice: line.needsPractice
            }))
          } : { lines: [] },
          transcript: transcript || '',
          startedAt
        })
        
        if (sessionHash) {
          setLocalSaveComplete(true)
          console.log('✅ Auto-saved to IDB:', sessionHash)
          
          // Add a small delay to ensure IDB transaction is fully committed
          setTimeout(async () => {
            // Check for due cards after saving
            const cards = await getDueCards(1) // Just need to know if there are any
            setDueCardsCount(cards.length)
            console.log('📊 Due cards after save:', cards.length)
          }, 500) // 500ms delay to ensure IDB transaction completes
        }
      } catch (err) {
        console.error('❌ Auto-save to IDB failed:', err)
      }
    }
    
    autoSaveToIDB()
  }, [isInitialized, songId, scoringDetails, score, transcript, startedAt, saveKaraokeSession, localSaveComplete, getDueCards])
  
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
    if (score >= 90) return t('karaoke.scoreMessages.excellent')
    if (score >= 80) return t('karaoke.scoreMessages.good')
    if (score >= 70) return t('karaoke.scoreMessages.keepPracticing')
    if (score >= 60) return t('karaoke.scoreMessages.gettingThere')
    return t('karaoke.scoreMessages.dontGiveUp')
  }

  const getActionMessage = () => {
    if (progressState === 'synced') return t('karaoke.completion.readyToStudy')
    return t('karaoke.completion.savedLocally')
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
          disabled={dueCardsCount === 0}
          className="w-full"
        >
          {dueCardsCount === 0 ? t('home.study.allCaughtUp') : t('home.study.studyButton')}
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
                  <Spinner size="sm" className="mr-2" />
                  {t('karaoke.completion.syncing')}
                </>
              ) : progressState === 'synced' ? (
                t('karaoke.completion.saved')
              ) : (
                t('karaoke.completion.saveProgress')
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
        
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Score section at top */}
          <div className="w-full max-w-2xl mx-auto px-6 pt-8">
            <div className="text-center">
              <h1 className="text-4xl font-bold text-white mb-8">{t('karaoke.score')}</h1>
              
              <div className="text-6xl font-bold text-white mb-8">
                {score}
              </div>
              
              {/* Error message */}
              {saveError && (
                <div className="text-red-400 text-sm mb-4">
                  {saveError}
                </div>
              )}
            </div>
          </div>
          
          {/* Spacer to push content to bottom */}
          <div className="flex-1"></div>
          
          {/* Coach feedback - positioned at bottom */}
          <div className="flex flex-col items-center pb-[72px] px-6">
            <div className="mb-3 w-full max-w-lg">
              <SpeechBubble 
                variant="default"
                size="lg"
                tailSide="bottom"
                tailPosition="center"
              >
                <div className="text-left">
                  <p className="text-lg text-gray-900">
                    {getScoreMessage()}
                  </p>
                  {getActionMessage() && (
                    <p className="text-base text-gray-600 mt-2">
                      {progressState === 'idle' && !isReady ? 
                        t('karaoke.completion.connectWalletToSave') : 
                        getActionMessage()
                      }
                    </p>
                  )}
                </div>
              </SpeechBubble>
            </div>
            <img 
              src={scarlettThumbsUp} 
              alt="Scarlett giving thumbs up" 
              className="w-48 h-auto"
            />
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