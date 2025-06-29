import React from 'react'
import { Play, Pause, SkipBack, SkipForward } from '@phosphor-icons/react'
import { Button } from '../ui/button'
import { cn } from '../../lib/utils'

interface AudioPlayerProps {
  isPlaying: boolean
  currentTime: number
  duration: number
  onPlay: () => void
  onPause: () => void
  onSeek: (time: number) => void
  className?: string
}

export function AudioPlayer({
  isPlaying,
  currentTime,
  duration,
  onPlay,
  onPause,
  onSeek,
  className
}: AudioPlayerProps) {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }
  
  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const percentage = x / rect.width
    onSeek(percentage * duration)
  }
  
  const handleSkipBack = () => {
    onSeek(Math.max(0, currentTime - 10))
  }
  
  const handleSkipForward = () => {
    onSeek(Math.min(duration, currentTime + 10))
  }
  
  return (
    <div className={cn("bg-neutral-800/50 backdrop-blur-lg rounded-lg p-4 space-y-4", className)}>
      {/* Progress bar */}
      <div 
        className="relative h-2 bg-neutral-700 rounded-full cursor-pointer overflow-hidden"
        onClick={handleProgressClick}
      >
        <div 
          className="absolute h-full bg-primary-500 rounded-full transition-all duration-100"
          style={{ width: `${(currentTime / duration) * 100}%` }}
        />
      </div>
      
      {/* Time display */}
      <div className="flex justify-between text-sm text-neutral-400">
        <span>{formatTime(currentTime)}</span>
        <span>{formatTime(duration)}</span>
      </div>
      
      {/* Controls */}
      <div className="flex items-center justify-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleSkipBack}
          className="hover:bg-neutral-700"
        >
          <SkipBack size={20} />
        </Button>
        
        <Button
          size="icon"
          onClick={isPlaying ? onPause : onPlay}
          className="w-12 h-12"
        >
          {isPlaying ? <Pause size={24} /> : <Play size={24} />}
        </Button>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={handleSkipForward}
          className="hover:bg-neutral-700"
        >
          <SkipForward size={20} />
        </Button>
      </div>
    </div>
  )
}