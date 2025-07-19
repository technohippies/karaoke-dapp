import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAccount } from 'wagmi'
import { useWalletClient } from 'wagmi'
import { useIDBSRS } from '../hooks/useIDBSRS'
import { useLitSession } from '../hooks/useLitSession'
import { useDirectIDB } from '../hooks/useDirectIDB'
import { SayItBack } from '../components/SayItBack'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
import { Progress } from '../components/ui/progress'
import { SpinnerWithScarlett } from '../components/ui/spinner-with-scarlett'
import { ArrowLeft, Trophy, Target, AlertCircle } from 'lucide-react'
import type { DueCard } from '../types/srs.types'

interface StudyStats {
  totalCards: number
  reviewedCards: number
  correctCards: number
  startTime: number
}

export function StudyPage() {
  const navigate = useNavigate()
  const { address } = useAccount()
  const { data: walletClient } = useWalletClient()
  const { updateCardReview, saveExerciseSession } = useIDBSRS()
  const { sessionSigs } = useLitSession()
  const { getDueCards, getUserStats, isReady: isDBReady } = useDirectIDB()
  
  const [dueCards, setDueCards] = useState<DueCard[]>([])
  const [currentCardIndex, setCurrentCardIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [studyStats, setStudyStats] = useState<StudyStats>({
    totalCards: 0,
    reviewedCards: 0,
    correctCards: 0,
    startTime: Date.now()
  })
  const [sessionId] = useState(() => `exercise_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`)
  const [debugInfo, setDebugInfo] = useState<any>(null)
  
  // Load due cards on mount
  useEffect(() => {
    if (isDBReady && address) {
      loadDueCards()
    }
  }, [address, isDBReady])
  
  const loadDueCards = async () => {
    if (!address) return
    
    try {
      setIsLoading(true)
      
      // Wait a bit for IDB to be ready
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Get stats for debugging
      const stats = await getUserStats()
      console.log('📊 Study page stats:', stats)
      
      const cards = await getDueCards(20) // Get up to 20 due cards
      setDueCards(cards)
      setStudyStats(prev => ({ ...prev, totalCards: cards.length }))
      console.log(`📚 Loaded ${cards.length} due cards for review`)
      
      // Store debug info
      setDebugInfo({
        stats,
        cardsFound: cards.length,
        currentTime: new Date().toISOString()
      })
    } catch (error) {
      console.error('Failed to load due cards:', error)
    } finally {
      setIsLoading(false)
    }
  }
  
  const handleCardComplete = async (score: number) => {
    if (!dueCards[currentCardIndex] || !address) return
    
    setIsProcessing(true)
    const card = dueCards[currentCardIndex]
    const wasCorrect = score >= 70 // 70% threshold for correct
    
    try {
      // Update card review in IDB
      await updateCardReview(
        card.songId,
        card.lineIndex,
        wasCorrect
      )
      
      // Update stats
      setStudyStats(prev => ({
        ...prev,
        reviewedCards: prev.reviewedCards + 1,
        correctCards: prev.correctCards + (wasCorrect ? 1 : 0)
      }))
      
      // Move to next card
      if (currentCardIndex < dueCards.length - 1) {
        setCurrentCardIndex(prev => prev + 1)
      } else {
        // All cards reviewed - save session
        await completeSession()
      }
    } catch (error) {
      console.error('Failed to update card review:', error)
    } finally {
      setIsProcessing(false)
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
      console.log('✅ Exercise session saved')
    } catch (error) {
      console.error('Failed to save exercise session:', error)
    }
  }
  
  // Handle skip
  const handleSkip = () => {
    if (currentCardIndex < dueCards.length - 1) {
      setCurrentCardIndex(prev => prev + 1)
    } else {
      completeSession()
    }
  }
  
  // Check if ready
  // const isReady = isConnected && walletClient && isLitReady && isDBReady && !isLoading
  const currentCard = dueCards[currentCardIndex]
  const isComplete = studyStats.reviewedCards > 0 && currentCardIndex >= dueCards.length - 1
  
  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <SpinnerWithScarlett size="lg" />
      </div>
    )
  }
  
  // Show completion screen
  if (isComplete) {
    const accuracy = studyStats.reviewedCards > 0 
      ? Math.round((studyStats.correctCards / studyStats.reviewedCards) * 100)
      : 0
      
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <Card className="max-w-md w-full bg-white/5 border-white/10">
          <div className="p-8 text-center">
            <Trophy className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Study Session Complete!</h2>
            <div className="space-y-2 text-white/80 mb-6">
              <p>Cards Reviewed: {studyStats.reviewedCards}</p>
              <p>Accuracy: {accuracy}%</p>
              <p>Time: {Math.round((Date.now() - studyStats.startTime) / 1000 / 60)} minutes</p>
            </div>
            <Button onClick={() => navigate('/')} size="lg" className="w-full">
              Back to Home
            </Button>
          </div>
        </Card>
      </div>
    )
  }
  
  // Show no cards message
  if (dueCards.length === 0) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <Card className="max-w-md w-full bg-white/5 border-white/10">
          <div className="p-8 text-center">
            <Target className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">All caught up!</h2>
            <p className="text-white/60 mb-6">No cards are due for review right now.</p>
            
            {/* Debug info for development */}
            {debugInfo && (
              <Card className="bg-white/5 border-white/10 p-4 mb-6 text-left">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-4 h-4 text-yellow-500" />
                  <p className="text-sm font-medium text-white">Debug Info</p>
                </div>
                <div className="text-xs text-white/60 space-y-1">
                  <p>Total Cards: {debugInfo.stats?.totalCards || 0}</p>
                  <p>New: {debugInfo.stats?.newCards || 0}</p>
                  <p>Learning: {debugInfo.stats?.learningCards || 0}</p>
                  <p>Due for Review: {debugInfo.stats?.cardsToReview || 0}</p>
                  <p>Cards Found: {debugInfo.cardsFound}</p>
                  <p>Current Time: {debugInfo.currentTime}</p>
                </div>
              </Card>
            )}
            
            <Button onClick={() => navigate('/')} size="lg" className="w-full">
              Back to Home
            </Button>
          </div>
        </Card>
      </div>
    )
  }
  
  // Main study interface
  return (
    <div className="min-h-screen bg-black">
        {/* Header */}
        <div className="fixed top-0 left-0 right-0 z-10 bg-black/80 backdrop-blur-sm border-b border-white/10">
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/')}
              className="text-white/60 hover:text-white"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div className="text-white/60">
              {currentCardIndex + 1} / {dueCards.length}
            </div>
          </div>
          <Progress 
            value={(currentCardIndex / dueCards.length) * 100} 
            className="h-1 bg-white/10"
          />
        </div>
        
        {/* Main content */}
        <div className="pt-24 pb-32 px-4">
          <div className="max-w-2xl mx-auto">
            {currentCard && (
              <div className="space-y-6">
                <Card className="bg-white/5 border-white/10 p-6">
                  <p className="text-sm text-white/60 mb-2">Say this line:</p>
                  <p className="text-2xl font-medium text-white">
                    {currentCard.lineText}
                  </p>
                </Card>
                
                <SayItBack
                  key={`${currentCard.songId}-${currentCard.lineIndex}`}
                  expectedText={currentCard.lineText}
                  songId={currentCard.songId.toString()}
                  onComplete={handleCardComplete}
                  isStudyMode={true}
                  sessionSigs={sessionSigs}
                  walletClient={walletClient}
                />
                
                {/* Skip button */}
                <div className="text-center">
                  <Button
                    variant="ghost"
                    onClick={handleSkip}
                    disabled={isProcessing}
                    className="text-white/40 hover:text-white/60"
                  >
                    Skip this card
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
    </div>
  )
}