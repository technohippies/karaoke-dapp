import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAccount } from 'wagmi'
import { useWalletClient } from 'wagmi'
import { walletClientToSigner } from '../utils/walletClientToSigner'
import { useIDBSRS } from '../hooks/useIDBSRS'
import { useLitSession } from '../hooks/useLitSession'
import { useDirectIDB } from '../hooks/useDirectIDB'
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
import type { DueCard } from '../types/srs.types'

interface StudyStats {
  totalCards: number
  reviewedCards: number
  correctCards: number
  startTime: number
}

export function StudyPageV2() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { address } = useAccount()
  const { data: walletClient } = useWalletClient()
  const { updateCardReview, saveExerciseSession } = useIDBSRS()
  const { sessionSigs } = useLitSession()
  const { getDueCards, isReady: isDBReady } = useDirectIDB()
  const { startRecording, stopRecording, audioBlob, isRecording, reset: resetRecorder } = useSimpleAudioRecorder()
  const { invalidateCache: invalidateStreakCache, currentStreak, refreshStreak } = useStreak()
  
  const [dueCards, setDueCards] = useState<DueCard[]>([])
  const [currentCardIndex, setCurrentCardIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [attempts, setAttempts] = useState(0)
  const [lastScore, setLastScore] = useState<number | null>(null)
  const [transcript, setTranscript] = useState('')
  const [showFeedback, setShowFeedback] = useState(false)
  const [aiFeedback, setAiFeedback] = useState<string | null>(null)
  const [showCompletion, setShowCompletion] = useState(false)
  const [previousStreak, setPreviousStreak] = useState(0)
  
  const [studyStats, setStudyStats] = useState<StudyStats>({
    totalCards: 0,
    reviewedCards: 0,
    correctCards: 0,
    startTime: Date.now()
  })
  const [sessionId] = useState(() => `exercise_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`)
  
  // Load due cards on mount
  useEffect(() => {
    if (isDBReady && address) {
      loadDueCards()
    }
  }, [address, isDBReady])
  
  // Store the streak when component mounts
  useEffect(() => {
    setPreviousStreak(currentStreak)
  }, [])
  
  const loadDueCards = async () => {
    if (!address) return
    
    try {
      setIsLoading(true)
      const cards = await getDueCards(20)
      
      if (cards.length === 0) {
        // No cards due - navigate back
        navigate('/')
        return
      }
      
      setDueCards(cards)
      setStudyStats(prev => ({ ...prev, totalCards: cards.length }))
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
  
  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-900 flex items-center justify-center">
        <SpinnerWithScarlett size="lg" />
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