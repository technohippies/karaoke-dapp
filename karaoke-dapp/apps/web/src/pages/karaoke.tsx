import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Header, KaraokeDisplay, AudioPlayer, Button } from '@karaoke-dapp/ui'
import { Microphone, Stop } from '@phosphor-icons/react'
import { AudioProvider, useAudio } from '../contexts/audio-context'
import { parseLRC, getCurrentLyricIndex } from '../utils/lyrics-parser'
import type { KaraokeLyricLine } from '@karaoke-dapp/ui'

// Sample LRC lyrics - in production this would come from LRCLIB API
const sampleLRC = `[00:01.02] Party girls don't get hurt
[00:03.11] Can't feel anything, when will I learn?
[00:05.91] I push it down, I push it down
[00:12.14] I'm the one for a "good time call"
[00:14.26] Phone's blowin' up, ringin' my doorbell
[00:17.02] I feel the love, feel the love
[00:22.82] One, two, three, one, two, three, drink
[00:25.53] One, two, three, one, two, three, drink
[00:28.31] One, two, three, one, two, three, drink
[00:31.17] Throw 'em back 'til I lose count
[00:33.82] I'm gonna swing from the chandelier
[00:41.63] From the chandelier
[00:44.83] I'm gonna live like tomorrow doesn't exist
[00:52.78] Like it doesn't exist
[00:56.05] I'm gonna fly like a bird through the night`

function KaraokeContent() {
  const navigate = useNavigate()
  const { songId } = useParams()
  const {
    isPlaying,
    currentTime,
    duration,
    isRecording,
    recordingTime,
    play,
    pause,
    seek,
    startRecording,
    stopRecording,
    loadAudio
  } = useAudio()
  
  const [lyrics, setLyrics] = useState<KaraokeLyricLine[]>([])
  const [activeLyricIndex, setActiveLyricIndex] = useState(-1)
  const [lyricsWithScores, setLyricsWithScores] = useState<KaraokeLyricLine[]>([])
  const [isProcessingRecording, setIsProcessingRecording] = useState(false)
  
  // Mock audio URL - in production, this would come from the song data
  const audioUrl = `/songs/${songId}/audio.mp3`
  
  useEffect(() => {
    // Parse LRC lyrics
    const parsedLyrics = parseLRC(sampleLRC)
    const karaokeLines: KaraokeLyricLine[] = parsedLyrics.map(line => ({
      id: line.id.toString(),
      text: line.text,
      startTime: line.startTime * 1000, // Convert to milliseconds
      endTime: line.endTime * 1000
    }))
    setLyrics(karaokeLines)
    setLyricsWithScores(karaokeLines)
    
    // Load audio when component mounts
    loadAudio(audioUrl).catch(console.error)
  }, [audioUrl, loadAudio])
  
  // Update active lyric based on current time
  useEffect(() => {
    const newIndex = getCurrentLyricIndex(
      lyrics.map(l => ({
        id: parseInt(l.id),
        text: l.text,
        startTime: l.startTime / 1000,
        endTime: l.endTime / 1000
      })),
      currentTime
    )
    setActiveLyricIndex(newIndex)
  }, [currentTime, lyrics])
  
  const handleAccountClick = () => {
    navigate('/account')
  }
  
  const handleStartRecording = async () => {
    await startRecording()
  }
  
  const handleStopRecording = async () => {
    setIsProcessingRecording(true)
    const recordingBlob = await stopRecording()
    
    if (recordingBlob) {
      // In production, send to Deepgram for processing
      // For now, simulate processing with random scores
      setTimeout(() => {
        const scoredLyrics = lyrics.map(lyric => ({
          ...lyric,
          score: Math.random() * 0.8 + 0.2 // Random score between 0.2 and 1
        }))
        setLyricsWithScores(scoredLyrics)
        setIsProcessingRecording(false)
        
        // Navigate to completion page
        setTimeout(() => {
          navigate(`/karaoke/${songId}/complete`)
        }, 2000)
      }, 2000)
    }
  }
  
  const handleSeekToLyric = (lyricId: string) => {
    const lyric = lyrics.find(l => l.id === lyricId)
    if (lyric) {
      seek(lyric.startTime / 1000)
    }
  }
  
  return (
    <div className="min-h-screen bg-neutral-900 text-white flex flex-col">
      <Header onAccountClick={handleAccountClick} />
      
      {/* Main karaoke area */}
      <div className="flex-grow flex flex-col">
        <div className="container mx-auto px-4 py-8 flex-grow flex flex-col">
          <div className="flex-grow flex items-center justify-center">
            <KaraokeDisplay
              lines={lyricsWithScores}
              currentTime={currentTime * 1000} // Convert to milliseconds
              onLineClick={handleSeekToLyric}
            />
          </div>
        </div>
      </div>
      
      {/* Controls area */}
      <div className="bg-neutral-800/50 backdrop-blur-lg border-t border-neutral-700">
        <div className="container mx-auto px-4 py-6 space-y-4">
          {/* Recording status */}
          {isRecording && (
            <div className="text-center text-sm text-red-500">
              Recording: {recordingTime.toFixed(1)}s
            </div>
          )}
          
          {isProcessingRecording && (
            <div className="text-center text-sm text-primary-500">
              Processing your performance...
            </div>
          )}
          
          {/* Audio player */}
          <AudioPlayer
            isPlaying={isPlaying}
            currentTime={currentTime}
            duration={duration}
            onPlay={play}
            onPause={pause}
            onSeek={seek}
          />
          
          {/* Recording controls */}
          <div className="flex justify-center gap-4">
            {!isRecording ? (
              <Button
                size="lg"
                variant="secondary"
                onClick={handleStartRecording}
                disabled={!isPlaying || isProcessingRecording}
                className="gap-2"
              >
                <Microphone size={20} />
                Start Recording
              </Button>
            ) : (
              <Button
                size="lg"
                variant="destructive"
                onClick={handleStopRecording}
                className="gap-2"
              >
                <Stop size={20} />
                Stop Recording
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export function KaraokePage() {
  return (
    <AudioProvider>
      <KaraokeContent />
    </AudioProvider>
  )
}