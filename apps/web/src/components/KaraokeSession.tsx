import { useEffect, useState } from 'react'
import { KaraokeDisplay } from './KaraokeDisplay'
import { KaraokeCompletionPage } from '../pages/KaraokeCompletionPage'
import { useKaraoke } from '../hooks/useKaraoke'

interface KaraokeSessionProps {
  songId: number
  lyrics: Array<{ time: number; text: string; translation?: string }>
  midiData: Uint8Array
  onClose: () => void
}

export function KaraokeSession({ songId, lyrics, midiData, onClose }: KaraokeSessionProps) {
  const [showCompletion, setShowCompletion] = useState(false)
  const [karaokeScore, setKaraokeScore] = useState(85) // Mock score for now
  
  // Use only first 2 lines for testing
  const testLyrics = lyrics.slice(0, 2)
  
  const {
    isPlaying,
    currentLineIndex,
    startKaraoke,
    stopKaraoke
  } = useKaraoke({
    lyrics: testLyrics,
    midiData,
    onComplete: async (mp3Blob, expectedLyrics) => {
      console.log('🎤 Karaoke completed, processing...')
      
      // For now, just show completion with a mock score
      // In production, this would send to Lit Action for grading
      setKaraokeScore(85)
      setShowCompletion(true)
    }
  })
  
  // Auto-start when component mounts
  useEffect(() => {
    startKaraoke()
  }, [])
  
  // Show completion page when done
  if (showCompletion) {
    return (
      <KaraokeCompletionPage
        score={karaokeScore}
        initialProgressState="idle"
        hasTable={false}
      />
    )
  }
  
  return (
    <KaraokeDisplay
      lyrics={testLyrics.map(l => ({ text: l.text }))}
      onClose={onClose}
      autoStart={true} // Let KaraokeDisplay handle countdown
    />
  )
}