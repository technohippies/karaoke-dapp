import { useState, useEffect } from 'react'
import { CloseHeader } from './CloseHeader'
import { Spinner } from './ui/spinner'
import coachImage from '../assets/scarlett-right-128x128.png'
import { useTablelandWrite } from '../hooks/useTablelandWrite'
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
  initialProgressState?: 'idle' | 'saving' | 'saved'
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
  const [progressState, setProgressState] = useState<'idle' | 'saving' | 'saved'>(initialProgressState)
  const { saveKaraokeSession, isReady, currentChainId, isInitialized } = useTablelandWrite()
  const [saveError, setSaveError] = useState<string | null>(null)
  const { chain } = useAccount()
  
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
    actualChain: chain?.id
  })

  const getScoreMessage = () => {
    if (score >= 90) return "Excellent work!"
    if (score >= 80) return "Good job!"
    if (score >= 70) return "Keep practicing!"
    if (score >= 60) return "You're getting there!"
    return "Don't give up!"
  }

  const getActionMessage = () => {
    if (progressState === 'saved') return "Now you can study with exercises!"
    
    if (hasTable) {
      return "Save your progress!"
    } else {
      return "You can save your data to your own database that you own and control. This means you can import this data into other educational dapps!"
    }
  }

  const handleSaveProgress = async () => {
    if (!isReady || !songId) {
      setSaveError('Unable to save: wallet not connected or missing data')
      return
    }
    
    setProgressState('saving')
    setSaveError(null)
    
    try {
      const sessionHash = await saveKaraokeSession({
        songId: parseInt(songId),
        score: score || 0,
        scoringDetails,
        transcript: transcript || '',
        startedAt
      })
      
      if (sessionHash) {
        setProgressState('saved')
        console.log('✅ Saved with session hash:', sessionHash)
      } else {
        setProgressState('idle')
        setSaveError('Failed to save progress')
      }
    } catch (err) {
      setProgressState('idle')
      setSaveError('Failed to save progress')
      console.error('Save error:', err)
    }
  }

  const handlePractice = () => {
    // TODO: Navigate to exercises or call parent handler
    console.log('Navigate to exercises')
  }

  const getProgressContent = () => {
    switch (progressState) {
      case 'idle':
        return (
          <ChainSwitcher 
            requiredChainId={11155420}
            className="w-full"
          >
            <button
              onClick={handleSaveProgress}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors cursor-pointer"
            >
              Save Progress
            </button>
          </ChainSwitcher>
        )
      case 'saving':
        return (
          <button
            disabled
            className="w-full bg-neutral-600 text-white px-6 py-3 rounded-lg font-semibold cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Spinner size="sm" />
            Saving...
          </button>
        )
      case 'saved':
        return (
          <button
            onClick={handlePractice}
            className="w-full bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors cursor-pointer"
          >
            Study
          </button>
        )
    }
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