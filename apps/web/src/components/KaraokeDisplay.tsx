import { useState, useEffect } from 'react'
import { X } from '@phosphor-icons/react'
import { IconButton } from './IconButton'

interface LyricLine {
  text: string
  duration?: number // Duration in milliseconds for this line
}

interface KaraokeDisplayProps {
  lyrics: LyricLine[]
  onClose: () => void
  autoStart?: boolean
  lineDelay?: number // Default delay between lines in ms
  currentLineIndex?: number // Externally controlled line index
  isPlaying?: boolean // External playing state
}

export function KaraokeDisplay({ 
  lyrics, 
  onClose, 
  autoStart = true,
  lineDelay = 3000, // 3 seconds per line by default
  currentLineIndex: externalLineIndex,
  isPlaying: externalIsPlaying
}: KaraokeDisplayProps) {
  const [internalLineIndex, setInternalLineIndex] = useState(-1) // -1 for countdown
  const [countdown, setCountdown] = useState(3)
  const [isStarted, setIsStarted] = useState(false)
  
  // Use external index if provided, otherwise use internal
  const currentLineIndex = externalLineIndex !== undefined ? externalLineIndex : internalLineIndex

  // Countdown effect
  useEffect(() => {
    if (!autoStart) return

    const countdownInterval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownInterval)
          setIsStarted(true)
          if (externalLineIndex === undefined) {
            setInternalLineIndex(0)
          }
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(countdownInterval)
  }, [autoStart])

  // Lyrics progression effect
  useEffect(() => {
    if (!isStarted || currentLineIndex < 0) return

    // Don't schedule if we're past the last line
    if (currentLineIndex >= lyrics.length) return

    // Only use internal timer if no external control
    if (externalLineIndex === undefined) {
      const timer = setTimeout(() => {
        setInternalLineIndex((prev) => {
          if (prev < lyrics.length - 1) {
            return prev + 1
          } else {
            // Move to completion state
            return prev + 1
          }
        })
      }, lyrics[currentLineIndex]?.duration || lineDelay)
      
      return () => clearTimeout(timer)
    }

  }, [currentLineIndex, isStarted, lyrics, lineDelay, externalLineIndex])

  // Removed unused manual control functions

  return (
    <div className="h-screen bg-neutral-900 flex flex-col overflow-hidden">
      {/* Header with close button */}
      <header className="w-full bg-neutral-900 border-b border-neutral-700 h-16 flex-shrink-0">
        <div className="w-full max-w-2xl mx-auto px-6 py-4 flex items-center h-full">
          <IconButton variant="ghost" onClick={onClose}>
            <X size={20} weight="regular" />
          </IconButton>
        </div>
      </header>

      {/* Main karaoke display */}
      <div className="flex-1 flex items-center justify-center overflow-hidden">
        <div className="w-full mx-auto px-6 text-center">
          <div className="space-y-6">
            {/* Countdown above first line */}
            {!isStarted && countdown > 0 && (
              <div className="text-6xl font-bold text-white mb-12">
                {countdown}
              </div>
            )}

            {/* Lyrics display */}
            {lyrics.map((lyric, index) => {
              const isCurrent = index === currentLineIndex
              const isPast = index < currentLineIndex
              
              return (
                <div
                  key={index}
                  className={`text-3xl transition-all duration-500 leading-relaxed ${
                    isCurrent 
                      ? 'text-white scale-105' 
                      : isPast 
                        ? 'text-neutral-600'
                        : 'text-neutral-500'
                  }`}
                >
                  {lyric.text}
                </div>
              )
            })}
          </div>

          {/* No completion message here - KaraokeSession handles completion */}
        </div>
      </div>
    </div>
  )
}