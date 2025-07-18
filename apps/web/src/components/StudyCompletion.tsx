import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CloseHeader } from './CloseHeader'
import { Button } from './ui/button'
import { StreakAnimation } from './StreakAnimation'
import coachImage from '../assets/scarlett-right-128x128.png'

interface StudyCompletionProps {
  currentStreak: number
  previousStreak: number
  cardsCompleted: number
  onClose: () => void
}

export function StudyCompletion({ 
  currentStreak,
  previousStreak,
  cardsCompleted,
  onClose
}: StudyCompletionProps) {
  const navigate = useNavigate()
  const { t } = useTranslation()
  
  const handleBack = () => {
    navigate('/')
  }
  
  const handleShare = () => {
    // TODO: Implement Farcaster sharing
    console.log('Share to Farcaster - Coming soon!')
  }
  
  return (
    <div className="min-h-screen bg-neutral-900 relative overflow-hidden">
      <div className="relative z-10 h-screen flex flex-col">
        <CloseHeader onClose={onClose} />
        
        <div className="flex-1 overflow-y-auto">
          <div className="w-full max-w-2xl mx-auto px-6 pt-8 pb-24 flex items-center justify-center min-h-full">
            <div className="text-center">
              <h1 className="text-4xl font-bold text-white mb-8">Great job!</h1>
              
              {/* Streak Animation */}
              <div className="mb-8">
                <StreakAnimation 
                  initialStreak={previousStreak}
                  targetStreak={currentStreak}
                  autoAnimate={true}
                  animationDelay={1000}
                />
              </div>
              
              {/* Coach feedback */}
              <div className="flex gap-4 w-full max-w-lg">
                <div className="w-16 h-16 bg-neutral-700 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
                  <img src={coachImage} alt="Coach" className="w-full h-full object-cover" />
                </div>
                <div className="bg-neutral-800 px-4 py-3 rounded-lg flex-1">
                  <p className="text-lg text-neutral-300 text-left">
                    {currentStreak > previousStreak 
                      ? "Awesome! Your streak is growing! Keep it up!"
                      : "Great practice session! Come back tomorrow to build your streak!"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sticky footer with action buttons */}
        <div className="fixed bottom-0 left-0 right-0 bg-neutral-900/95 backdrop-blur-sm border-t border-neutral-700 z-20">
          <div className="w-full max-w-2xl mx-auto px-6 py-4">
            <div className="grid grid-cols-2 gap-3">
              {/* Back button - left */}
              <Button
                variant="secondary"
                onClick={handleBack}
                className="w-full"
              >
                Back
              </Button>
              
              {/* Share button - right */}
              <Button
                onClick={handleShare}
                disabled={true}
                className="w-full"
              >
                Share to Farcaster (Soon)
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}