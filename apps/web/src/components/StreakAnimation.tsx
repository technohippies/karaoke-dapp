import { useState, useEffect } from 'react'
import { Fire } from '@phosphor-icons/react'
import { useTranslation } from 'react-i18next'

interface StreakAnimationProps {
  initialStreak: number
  targetStreak: number
  onAnimationComplete?: () => void
  autoAnimate?: boolean
  animationDelay?: number
}

export function StreakAnimation({ 
  initialStreak, 
  targetStreak, 
  onAnimationComplete,
  autoAnimate = true,
  animationDelay = 1000
}: StreakAnimationProps) {
  const { t } = useTranslation()
  const [displayStreak, setDisplayStreak] = useState(initialStreak)
  const [isAnimating, setIsAnimating] = useState(false)
  
  const shouldAnimate = targetStreak > initialStreak
  
  useEffect(() => {
    if (!autoAnimate || !shouldAnimate) return
    
    const timer = setTimeout(() => {
      setIsAnimating(true)
      
      // Small delay for fade out
      setTimeout(() => {
        setDisplayStreak(targetStreak)
        
        // Reset animation state after transition
        setTimeout(() => {
          setIsAnimating(false)
          onAnimationComplete?.()
        }, 500)
      }, 200)
    }, animationDelay)
    
    return () => clearTimeout(timer)
  }, [autoAnimate, shouldAnimate, targetStreak, animationDelay, onAnimationComplete])
  
  return (
    <div className="flex flex-col items-center">
      <Fire size={72} weight="fill" className="text-orange-500 mb-4" />
      <p className="text-4xl font-bold text-white">
        <span className={`inline-block transition-all duration-300 ${
          isAnimating ? 'scale-110 text-orange-400' : ''
        }`}>
          {t('home.study.completion.dayStreak', { count: displayStreak })}
        </span>
      </p>
    </div>
  )
}