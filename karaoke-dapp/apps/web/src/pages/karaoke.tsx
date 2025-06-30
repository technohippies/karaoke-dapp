import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Header, KaraokeDisplay, AudioPlayer, Button } from '@karaoke-dapp/ui'
import { Microphone, Stop } from '@phosphor-icons/react'
import { AudioProvider, useAudio } from '../contexts/audio-context'
import { parseLRC, getCurrentLyricIndex } from '../utils/lyrics-parser'
import type { KaraokeLyricLine } from '@karaoke-dapp/ui'

// Sample LRC lyrics - in production this would come from LRCLIB API
const sampleLRC = `[00:01.00] Welcome to the karaoke demo
[00:03.50] This is a test of the timing system
[00:06.00] Each line appears at the right moment
[00:08.50] Sing along with the highlighted text
[00:11.00] The words will guide your performance
[00:13.50] Keep your voice steady and clear
[00:16.00] Practice makes perfect every time
[00:18.50] Let the music flow through you
[00:21.00] This is your moment to shine
[00:23.50] Express yourself with confidence
[00:26.00] The stage is yours tonight
[00:28.50] Sing from your heart and soul
[00:31.00] Every note tells a story
[00:33.50] Make this performance your own
[00:36.00] Thank you for testing our system`

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
  const [, setActiveLyricIndex] = useState(-1)
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