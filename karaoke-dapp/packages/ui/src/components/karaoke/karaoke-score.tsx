import { motion } from "motion/react"
import { cn } from "../../lib/utils"
import { Button } from "../ui/button"
import { Spinner } from "../ui/spinner"

interface KaraokeScoreProps {
  isLoading?: boolean
  score?: number
  songTitle?: string
  artist?: string
  onSaveProgress?: () => void
  onSkip?: () => void
  onPractice?: () => void
  isSaving?: boolean
  isSaved?: boolean
  className?: string
}

export function KaraokeScore({
  isLoading = false,
  score = 0,
  songTitle,
  artist,
  onSaveProgress,
  onSkip,
  onPractice,
  isSaving = false,
  isSaved = false,
  className
}: KaraokeScoreProps) {
  
  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-400"
    if (score >= 70) return "text-yellow-400"
    if (score >= 50) return "text-orange-400"
    return "text-red-400"
  }

  const getScoreMessage = (score: number) => {
    if (score >= 90) return "Outstanding!"
    if (score >= 70) return "Great job!"
    if (score >= 50) return "Good effort!"
    return "Keep practicing!"
  }

  if (isLoading) {
    return (
      <div className={cn(
        "min-h-screen bg-neutral-900 text-white flex flex-col",
        className
      )}>
        <div className="flex-1 flex items-center justify-center">
          <Spinner size="lg" />
        </div>
      </div>
    )
  }

  return (
    <div className={cn(
      "min-h-screen bg-neutral-900 text-white flex flex-col",
      className
    )}>
      <div className="flex-1 flex items-center justify-center px-4 pb-20">
        <motion.div 
          className="text-center max-w-md w-full space-y-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* Song info */}
          {(songTitle || artist) && (
            <motion.div 
              className="space-y-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              {songTitle && (
                <h2 className="text-2xl font-bold text-white">{songTitle}</h2>
              )}
              {artist && (
                <p className="text-lg text-neutral-300">{artist}</p>
              )}
            </motion.div>
          )}

          {/* Score circle */}
          <motion.div 
            className="relative w-48 h-48 mx-auto"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.4, type: "spring", stiffness: 200 }}
          >
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              {/* Background circle */}
              <circle
                cx="50"
                cy="50"
                r="45"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                className="text-neutral-700"
              />
              {/* Progress circle */}
              <motion.circle
                cx="50"
                cy="50"
                r="45"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                strokeLinecap="round"
                className={getScoreColor(score)}
                strokeDasharray={283}
                initial={{ strokeDashoffset: 283 }}
                animate={{ strokeDashoffset: 283 - (283 * score) / 100 }}
                transition={{ delay: 0.6, duration: 1.5, ease: "easeOut" }}
              />
            </svg>
            
            {/* Score text */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <motion.div 
                  className={cn("text-4xl font-bold", getScoreColor(score))}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.2 }}
                >
                  {score}
                </motion.div>
              </div>
            </div>
          </motion.div>

          {/* Score message */}
          <motion.div 
            className="space-y-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.6 }}
          >
            <h3 className={cn("text-2xl font-semibold", isSaved ? "text-green-400" : getScoreColor(score))}>
              {isSaved ? "Saved!" : getScoreMessage(score)}
            </h3>
          </motion.div>
        </motion.div>
      </div>

      {/* Fixed footer with action buttons */}
      <div className="fixed bottom-0 left-0 right-0 bg-neutral-800/80 backdrop-blur-lg border-t border-neutral-700">
        <div className="container mx-auto px-4 py-4">
          {isSaved ? (
            <Button 
              className="w-full" 
              size="lg"
              variant="default"
              onClick={onPractice}
            >
              Practice
            </Button>
          ) : (
            <div className="flex gap-3">
              <Button 
                className="flex-1" 
                size="lg"
                variant="outline"
                onClick={onSkip}
              >
                Skip
              </Button>
              <Button 
                className="flex-1" 
                size="lg"
                variant="default"
                onClick={onSaveProgress}
                disabled={isSaving}
              >
                {isSaving ? (
                  <div className="flex items-center gap-2">
                    <Spinner size="sm" />
                    <span>Saving...</span>
                  </div>
                ) : (
                  'Save Progress'
                )}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}