import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { useWalletClient } from 'wagmi'
import { walletClientToSigner } from '../utils/walletClientToSigner'
import { useIDBSRS } from '../hooks/useIDBSRS'
import { useLitSession } from '../hooks/useLitSession'
import { useDirectIDB } from '../hooks/useDirectIDB'
import { usePurchaseV4 } from '../hooks/usePurchaseV4'
import { Card } from '../components/ui/card'
import { Progress } from '../components/ui/progress'
import { SpinnerWithScarlett } from '../components/ui/spinner-with-scarlett'
import { Button } from '../components/ui/button'
import { IconButton } from '../components/IconButton'
import { Microphone, StopCircle, X } from '@phosphor-icons/react'
import { lineScoringScoringService } from '../services/integrations/lit/LineScoringService'
import { useSimpleAudioRecorder } from '../hooks/useSimpleAudioRecorder'
import { useStreak } from '../hooks/useStreak'
import { StudyCompletion } from '../components/StudyCompletion'
import { KARAOKE_CONTRACT_ADDRESS } from '../constants'
import { KARAOKE_SCHOOL_V4_ABI } from '../contracts/abis/KaraokeSchoolV4'
import type { DueCard } from '../types/srs.types'

interface StudyStats {
  totalCards: number
  reviewedCards: number
  correctCards: number
  startTime: number
}

export function StudyPageV2() {
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useTranslation()
  const { address } = useAccount()
  const { data: walletClient } = useWalletClient()
  const { updateCardReview, saveExerciseSession } = useIDBSRS()
  const { sessionSigs } = useLitSession()
  const { getDueCards, isReady: isDBReady } = useDirectIDB()
  const { startRecording, stopRecording, audioBlob, isRecording, reset: resetRecorder } = useSimpleAudioRecorder()
  const { invalidateCache: invalidateStreakCache, currentStreak, refreshStreak } = useStreak()
  const { voiceCredits, isConnected, isLoadingCredits, refetchCredits } = usePurchaseV4()
  
  // Contract hooks for exercises
  const { 
    writeContract: startExerciseWrite, 
    data: startExerciseHash,
    error: startExerciseError,
    reset: resetStartExercise
  } = useWriteContract()
  
  const { 
    isSuccess: isStartExerciseSuccess, 
    isLoading: isTransactionPending,
    error: transactionError 
  } = useWaitForTransactionReceipt({ 
    hash: startExerciseHash 
  })
  
  const [dueCards, setDueCards] = useState<DueCard[]>([])
  const [currentCardIndex, setCurrentCardIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isCheckingCredits, setIsCheckingCredits] = useState(false)
  const [hasDeductedCredits, setHasDeductedCredits] = useState(false)
  const [attempts, setAttempts] = useState(0)
  const [lastScore, setLastScore] = useState<number | null>(null)
  const [transcript, setTranscript] = useState('')
  const [showFeedback, setShowFeedback] = useState(false)
  const [aiFeedback, setAiFeedback] = useState<string | null>(null)
  const [showCompletion, setShowCompletion] = useState(false)
  const [previousStreak, setPreviousStreak] = useState(0)
  const [creditError, setCreditError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  
  const [studyStats, setStudyStats] = useState<StudyStats>({
    totalCards: 0,
    reviewedCards: 0,
    correctCards: 0,
    startTime: Date.now()
  })
  const [sessionId] = useState(() => `exercise_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`)
  const hasInitiatedDeduction = useRef(false)
  
  // Load due cards on mount
  useEffect(() => {
    if (isDBReady && address && isConnected && !isLoadingCredits) {
      loadDueCards()
    }
  }, [address, isDBReady, isConnected, isLoadingCredits])
  
  // Handle successful credit deduction
  useEffect(() => {
    if (isStartExerciseSuccess && !hasDeductedCredits) {
      setHasDeductedCredits(true)
      setIsCheckingCredits(false)
      setCreditError(null)
      setRetryCount(0)
    }
  }, [isStartExerciseSuccess, hasDeductedCredits])
  
  // Handle transaction errors
  useEffect(() => {
    if (transactionError) {
      console.error('Transaction failed:', transactionError)
      setCreditError('Transaction failed. Please try again.')
      setIsCheckingCredits(false)
      hasInitiatedDeduction.current = false
      // Force refetch credits to sync state
      refetchCredits()
    }
  }, [transactionError, refetchCredits])
  
  // Store the streak when component mounts
  useEffect(() => {
    setPreviousStreak(currentStreak)
  }, [])
  
  const loadDueCards = async () => {
    if (!address) return
    
    console.log('🎯 StudyPageV2 - Loading due cards with:', {
      address,
      voiceCredits,
      isConnected,
      contractAddress: KARAOKE_CONTRACT_ADDRESS
    })
    
    try {
      setIsLoading(true)
      const cards = await getDueCards(20)
      
      if (cards.length === 0) {
        // No cards due - navigate back
        navigate('/')
        return
      }
      
      // Check if user has enough credits
      if (voiceCredits < cards.length) {
        alert(`You need ${cards.length} voice credits for ${cards.length} exercises. You have ${voiceCredits}. Please purchase more credits.`)
        navigate('/pricing')
        return
      }
      
      setDueCards(cards)
      setStudyStats(prev => ({ ...prev, totalCards: cards.length }))
      
      // Deduct credits for exercises
      if (!hasDeductedCredits && !hasInitiatedDeduction.current) {
        hasInitiatedDeduction.current = true
        setIsCheckingCredits(true)
        setCreditError(null)
        try {
          console.log('📝 Starting exercise with:', {
            contractAddress: KARAOKE_CONTRACT_ADDRESS,
            userAddress: address,
            numExercises: cards.length,
            voiceCredits
          })
          
          await startExerciseWrite({
            address: KARAOKE_CONTRACT_ADDRESS,
            abi: KARAOKE_SCHOOL_V4_ABI,
            functionName: 'startExercise',
            args: [BigInt(cards.length)]
          })
        } catch (error: any) {
          console.error('Failed to deduct credits:', error)
          const errorMessage = error?.message || 'Failed to start exercise'
          setCreditError(errorMessage)
          setIsCheckingCredits(false)
          hasInitiatedDeduction.current = false // Reset on error
          setRetryCount(prev => prev + 1)
          return
        }
      }
    } catch (error) {
      console.error('Failed to load due cards:', error)
      navigate('/')
    } finally {
      setIsLoading(false)
    }
  }
  
  // Process audio when recording stops
  useEffect(() => {
    if (audioBlob && !isRecording) {
      processRecording()
    }
  }, [audioBlob, isRecording])
  
  const processRecording = async () => {
    if (!audioBlob || !walletClient || !dueCards[currentCardIndex]) return
    
    setIsProcessing(true)
    
    try {
      // Convert audio blob to Uint8Array
      const audioData = new Uint8Array(await audioBlob.arrayBuffer())
      const signer = await walletClientToSigner(walletClient)
      const currentCard = dueCards[currentCardIndex]
      
      // Score using Lit Protocol
      const result = await lineScoringScoringService.scoreLine(
        audioData,
        currentCard.lineText,
        signer,
        sessionSigs
      )
      
      if (result.success && result.transcript) {
        setTranscript(result.transcript)
        setLastScore(result.score || 0)
        setAiFeedback(result.feedback || null)
        setShowFeedback(true)
        
        const isCorrect = (result.score || 0) >= 80  // Changed threshold to 80%
        
        if (isCorrect) {
          // Update card as correct
          await updateCardReview(
            currentCard.songId,
            currentCard.lineIndex,
            true
          )
          
          setStudyStats(prev => ({
            ...prev,
            reviewedCards: prev.reviewedCards + 1,
            correctCards: prev.correctCards + 1
          }))
          
          // Auto-advance after delay
          setTimeout(() => {
            moveToNextCard()
          }, 2000)
        } else {
          setAttempts(prev => prev + 1)
        }
      }
    } catch (error) {
      console.error('Processing error:', error)
      setAttempts(prev => prev + 1)
    } finally {
      setIsProcessing(false)
      resetRecorder()
    }
  }
  
  const moveToNextCard = async () => {
    const currentCard = dueCards[currentCardIndex]
    
    // If moving to next after failures, mark as incorrect
    if (attempts >= 2 && lastScore !== null && lastScore < 80) {  // Changed threshold to 80%
      await updateCardReview(
        currentCard.songId,
        currentCard.lineIndex,
        false
      )
      
      setStudyStats(prev => ({
        ...prev,
        reviewedCards: prev.reviewedCards + 1
      }))
    }
    
    // Reset state
    setAttempts(0)
    setLastScore(null)
    setTranscript('')
    setShowFeedback(false)
    setAiFeedback(null)
    
    // Move to next card or complete
    if (currentCardIndex < dueCards.length - 1) {
      setCurrentCardIndex(prev => prev + 1)
    } else {
      // Complete session
      await completeSession()
    }
  }
  
  const completeSession = async () => {
    if (!address) return
    
    try {
      const now = new Date()
      const sessionDate = parseInt(
        `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
      )
      
      await saveExerciseSession({
        sessionId,
        cardsReviewed: studyStats.reviewedCards,
        cardsCorrect: studyStats.correctCards,
        startedAt: studyStats.startTime,
        completedAt: Date.now(),
        sessionDate
      })
      
      // Invalidate streak cache so it recalculates with new session
      await invalidateStreakCache()
      
      // Force refresh the streak to get the updated value
      await refreshStreak()
      
      // Show completion screen instead of navigating away
      setShowCompletion(true)
    } catch (error) {
      console.error('Failed to save exercise session:', error)
      // Still show completion even if save fails
      setShowCompletion(true)
    }
  }
  
  const handleButtonClick = () => {
    if (isRecording) {
      stopRecording()
    } else if (attempts >= 2) {
      moveToNextCard()
    } else {
      setShowFeedback(false)
      startRecording()
    }
  }
  
  const getButtonState = () => {
    if (isProcessing) return 'processing'
    if (isRecording) return 'recording'
    if (attempts >= 2) return 'next'
    if (showFeedback && lastScore !== null && lastScore < 80) return 'try-again'
    return 'start'
  }
  
  const getButtonText = () => {
    const state = getButtonState()
    switch (state) {
      case 'processing': return t('exercise.processing')
      case 'recording': return t('exercise.stopRecording')
      case 'next': return t('exercise.next')
      case 'try-again': return t('exercise.tryAgain')
      default: return t('exercise.startRecording')
    }
  }
  
  // Check if ready
  // const isReady = isConnected && walletClient && isLitReady && isDBReady && !isLoading
  const currentCard = dueCards[currentCardIndex]
  const progress = dueCards.length > 0 ? ((currentCardIndex + 1) / dueCards.length) * 100 : 0
  
  const handleRetryCredits = async () => {
    if (!dueCards.length) return
    
    // Reset states
    resetStartExercise()
    setCreditError(null)
    hasInitiatedDeduction.current = false
    
    // Force refetch to get latest credit balance
    await refetchCredits()
    
    // Try again
    setIsCheckingCredits(true)
    try {
      await startExerciseWrite({
        address: KARAOKE_CONTRACT_ADDRESS,
        abi: KARAOKE_SCHOOL_V4_ABI,
        functionName: 'startExercise',
        args: [BigInt(dueCards.length)]
      })
    } catch (error: any) {
      console.error('Retry failed:', error)
      setCreditError(error?.message || 'Failed to start exercise')
      setIsCheckingCredits(false)
      hasInitiatedDeduction.current = false
      setRetryCount(prev => prev + 1)
    }
  }
  
  // Show loading state
  if (isLoading || isCheckingCredits || isTransactionPending) {
    return (
      <div className="min-h-screen bg-neutral-900 flex items-center justify-center">
        <div className="text-center space-y-4">
          <SpinnerWithScarlett size="lg" />
          {isCheckingCredits && (
            <div className="space-y-2">
              <p className="text-white/60">
                {isTransactionPending ? t('exercise.confirmingTransaction') : t('exercise.checkingCredits')}
              </p>
            </div>
          )}
        </div>
      </div>
    )
  }
  
  // Handle contract errors or credit errors
  if (startExerciseError || creditError) {
    const errorMessage = startExerciseError?.message || creditError || ''
    if (errorMessage.includes('InsufficientCredits')) {
      return (
        <div className="min-h-screen bg-neutral-900 flex items-center justify-center">
          <div className="text-center space-y-4 max-w-md">
            <h2 className="text-xl font-semibold text-white">{t('exercise.insufficientCredits')}</h2>
            <p className="text-white/60">{t('exercise.purchaseMoreCredits')}</p>
            <Button onClick={() => navigate('/pricing')}>
              {t('exercise.goToPricing')}
            </Button>
          </div>
        </div>
      )
    }
    
    return (
      <div className="min-h-screen bg-neutral-900 flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md">
          <h2 className="text-xl font-semibold text-white">{t('exercise.errorStarting')}</h2>
          <p className="text-white/60 text-sm">
            {errorMessage.includes('User rejected') ? 
              'Transaction was cancelled. Please try again.' : 
              errorMessage
            }
          </p>
          <div className="flex gap-3 justify-center">
            {retryCount < 3 && (
              <Button onClick={handleRetryCredits} variant="default">
                Try Again
              </Button>
            )}
            <Button onClick={() => navigate('/')} variant="secondary">
              {t('exercise.backToHome')}
            </Button>
          </div>
          {retryCount >= 3 && (
            <p className="text-xs text-red-400">
              Multiple attempts failed. Please check your wallet connection and try again later.
            </p>
          )}
        </div>
      </div>
    )
  }
  
  // Show completion screen
  if (showCompletion) {
    return (
      <StudyCompletion
        currentStreak={currentStreak}
        previousStreak={previousStreak}
        cardsCompleted={studyStats.reviewedCards}
        onClose={() => navigate('/')}
      />
    )
  }
  
  if (!currentCard) {
    return null
  }
  
  return (
    <div className="min-h-screen bg-neutral-900 flex flex-col">
      {/* Custom header with progress bar */}
      <div className="fixed top-0 left-0 right-0 z-10 bg-neutral-900/95 backdrop-blur-sm border-b border-neutral-700">
        <div className="w-full max-w-2xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <IconButton variant="ghost" onClick={() => navigate('/')}>
              <X size={24} weight="bold" />
            </IconButton>
            <div className="flex-1">
              <Progress value={progress} className="h-2" />
            </div>
          </div>
        </div>
      </div>
      
      {/* Main content */}
      <div className="flex-1 pt-24 pb-32">
        <div className="w-full max-w-2xl mx-auto px-6 space-y-8">
          {/* Instruction */}
          <h2 className="text-2xl font-semibold text-white">
            {t('exercise.sayThis')}
          </h2>
          
          {/* Card */}
          <Card className="bg-neutral-800 border-neutral-700 p-8">
            <p className="text-3xl font-medium text-white leading-relaxed">
              {currentCard.lineText}
            </p>
          </Card>
          
          {/* Feedback */}
          {showFeedback && (
            <Card className={`p-6 border ${lastScore !== null && lastScore >= 80 ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
              <div className="space-y-3">
                {lastScore !== null && lastScore >= 80 ? (
                  // Success - just show checkmark
                  <div className="flex items-center justify-center py-4">
                    <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center">
                      <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </div>
                ) : (
                  // Failure - show transcript and AI feedback
                  <>
                    {transcript && (
                      <div>
                        <p className="text-sm text-white/60 mb-1">{t('exercise.youSaid')}</p>
                        <p className="text-white">{transcript}</p>
                      </div>
                    )}
                    {aiFeedback && (
                      <div className="mt-4 p-3 bg-neutral-800 rounded-lg">
                        <p className="text-white font-medium">{aiFeedback}</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </Card>
          )}
          
          {/* Attempt indicator */}
          {attempts > 0 && (
            <div className="flex justify-center gap-2">
              {[0, 1].map((i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full ${
                    i < attempts ? 'bg-red-500' : 'bg-neutral-600'
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-neutral-900/95 backdrop-blur-sm border-t border-neutral-700 z-20">
        <div className="w-full max-w-2xl mx-auto px-6 py-4">
          <Button
            onClick={handleButtonClick}
            disabled={getButtonState() === 'processing'}
            variant={
              getButtonState() === 'recording' ? 'destructive' :
              getButtonState() === 'next' || (showFeedback && lastScore !== null && lastScore < 80) ? 'secondary' :
              'default'
            }
            className={`w-full h-auto px-6 py-3 text-base ${
              getButtonState() === 'next' ? 'bg-yellow-600 hover:bg-yellow-700' :
              showFeedback && lastScore !== null && lastScore < 80 ? 'bg-orange-600 hover:bg-orange-700' :
              ''
            }`}
          >
            {getButtonState() === 'processing' ? (
              <>
                <div className="w-5 h-5 border-2 border-neutral-500 border-t-transparent rounded-full animate-spin" />
                <span>{getButtonText()}</span>
              </>
            ) : getButtonState() === 'recording' ? (
              <>
                <StopCircle size={28} weight="fill" />
                <span>{getButtonText()}</span>
              </>
            ) : (
              <>
                <Microphone size={28} weight="fill" />
                <span>{getButtonText()}</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}