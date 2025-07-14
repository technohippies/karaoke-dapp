import React, { useState, useEffect } from 'react'
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
}

export function KaraokeDisplay({ 
  lyrics, 
  onClose, 
  autoStart = true,
  lineDelay = 3000 // 3 seconds per line by default
}: KaraokeDisplayProps) {
  const [currentLineIndex, setCurrentLineIndex] = useState(-1) // -1 for countdown
  const [countdown, setCountdown] = useState(3)
  const [isStarted, setIsStarted] = useState(false)

  // Countdown effect
  useEffect(() => {
    if (!autoStart) return

    const countdownInterval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownInterval)
          setIsStarted(true)
          setCurrentLineIndex(0)
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

    const timer = setTimeout(() => {
      setCurrentLineIndex((prev) => {
        if (prev < lyrics.length - 1) {
          return prev + 1
        }
        return prev
      })
    }, lyrics[currentLineIndex]?.duration || lineDelay)

    return () => clearTimeout(timer)
  }, [currentLineIndex, isStarted, lyrics, lineDelay])

  const handleManualStart = () => {
    setIsStarted(true)
    setCurrentLineIndex(0)
  }

  const handlePrevious = () => {
    if (currentLineIndex > 0) {
      setCurrentLineIndex(currentLineIndex - 1)
    }
  }

  const handleNext = () => {
    if (currentLineIndex < lyrics.length - 1) {
      setCurrentLineIndex(currentLineIndex + 1)
    }
  }

  return (
    <div className="min-h-screen bg-neutral-900 flex flex-col">
      {/* Header with close button */}
      <header className="w-full bg-neutral-900 border-b border-neutral-700 h-16">
        <div className="w-full max-w-2xl mx-auto px-6 py-4 flex items-center h-full">
          <IconButton variant="ghost" onClick={onClose}>
            <X size={20} weight="regular" />
          </IconButton>
        </div>
      </header>

      {/* Main karaoke display */}
      <div className="flex-1 flex items-center justify-center px-6 pt-16">
        <div className="w-full max-w-2xl text-center">
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
              const isFuture = index > currentLineIndex
              
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

          {/* Completion message */}
          {isStarted && currentLineIndex >= lyrics.length - 1 && (
            <div className="mt-12">
              <div className="text-2xl font-semibold text-white mb-4">
                Great job! 🎤
              </div>
              <button
                onClick={onClose}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
              >
                Finish
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}