import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CloseHeader } from './CloseHeader'
import { Button } from './ui/button'
import { SpeechBubble } from './ui/speech-bubble'
import { StreakAnimation } from './StreakAnimation'
import scarlettPointing from '../assets/scarlett-pointing.png'

interface StudyCompletionProps {
  currentStreak: number
  previousStreak: number
  cardsCompleted: number
  onClose: () => void
}

export function StudyCompletion({ 
  currentStreak,
  previousStreak,
  onClose
}: StudyCompletionProps) {
  const navigate = useNavigate()
  const { t } = useTranslation()
  
  const handleBack = () => {
    navigate('/')
  }
  
  const handleShare = async () => {
    if (window.farcasterSDK) {
      try {
        const message = currentStreak > previousStreak 
          ? t('home.study.completion.shareMessageStreak', { streak: currentStreak })
          : t('home.study.completion.shareMessage')
        
        await window.farcasterSDK.actions.composeCast({
          message: message,
          embeds: ['https://karaoke.school']
        })
      } catch (error) {
        console.error('Failed to share to Farcaster:', error)
      }
    } else {
      console.log('Farcaster SDK not available')
    }
  }
  
  return (
    <div className="min-h-screen bg-neutral-900 relative overflow-hidden">
      <div className="relative z-10 h-screen flex flex-col">
        <CloseHeader onClose={onClose} />
        
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Score section - vertically centered */}
          <div className="flex-1 flex items-center justify-center">
            <div className="w-full max-w-2xl mx-auto px-6 text-center">
              <h1 className="text-4xl font-bold text-white mb-8">{t('home.study.completion.greatJob')}</h1>
              
              {/* Streak Animation */}
              <div className="mb-8">
                <StreakAnimation 
                  initialStreak={previousStreak}
                  targetStreak={currentStreak}
                  autoAnimate={true}
                  animationDelay={1000}
                />
              </div>
            </div>
          </div>
          
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
                    {currentStreak > previousStreak 
                      ? t('home.study.completion.streakGrowing')
                      : t('home.study.completion.practiceSession')}
                  </p>
                </div>
              </SpeechBubble>
            </div>
            <img 
              src={scarlettPointing} 
              alt={t('home.study.completion.scarlettPointingAlt')} 
              className="w-48 h-auto"
            />
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
                {t('home.study.completion.back')}
              </Button>
              
              {/* Share button - right */}
              <Button
                onClick={handleShare}
                disabled={!window.farcasterSDK}
                className="w-full"
              >
                {window.farcasterSDK ? t('home.study.completion.shareToFarcaster') : t('home.study.completion.shareToFarcasterSoon')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}