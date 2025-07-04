// React import removed - not needed in newer versions
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, XCircle } from '@phosphor-icons/react'
import { Button } from '../ui/button'

export interface ExerciseFooterProps {
  isCorrect: boolean | null
  attemptCount: number
  maxAttempts: number
  onNext: () => void
  onRetry: () => void
}

export function ExerciseFooter({
  isCorrect,
  attemptCount,
  maxAttempts,
  onNext,
  onRetry
}: ExerciseFooterProps) {
  const showRetry = isCorrect === false && attemptCount < maxAttempts
  const buttonText = showRetry ? 'Try Again' : 'Next'
  const buttonAction = showRetry ? onRetry : onNext

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-neutral-700 border-t border-neutral-600 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between">
          <AnimatePresence mode="wait">
            {isCorrect !== null && (
              <motion.div
                key={isCorrect ? 'correct' : 'incorrect'}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                {isCorrect ? (
                  <CheckCircle
                    size={48}
                    weight="fill"
                    className="text-green-500"
                  />
                ) : (
                  <XCircle
                    size={48}
                    weight="fill"
                    className="text-red-500"
                  />
                )}
              </motion.div>
            )}
          </AnimatePresence>
          
          <Button
            onClick={buttonAction}
            variant={showRetry ? 'warning' : 'success'}
            size="lg"
            className="w-32"
          >
            {buttonText}
          </Button>
        </div>
      </div>
    </div>
  )
}