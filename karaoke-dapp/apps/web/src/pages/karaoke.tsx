import { useEffect, useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { Header, KaraokeDisplay, AudioPlayer, Button, CountdownScreen, MicrophonePermission } from '@karaoke-dapp/ui'
import { X } from '@phosphor-icons/react'
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
  const location = useLocation()
  const { songId } = useParams()
  const {
    isPlaying,
    currentTime,
    duration,
    isRecording,
    hasMidi,
    hasAudio,
    play,
    pause,
    seek,
    startRecording,
    stopRecording,
    loadAudio,
    loadMidi
  } = useAudio()
  
  const [lyrics, setLyrics] = useState<KaraokeLyricLine[]>([])
  const [, setActiveLyricIndex] = useState(-1)
  const [lyricsWithScores, setLyricsWithScores] = useState<KaraokeLyricLine[]>([])
  const [showCountdown, setShowCountdown] = useState(false)
  const [isReady, setIsReady] = useState(false)
  const [hasMicPermission, setHasMicPermission] = useState<boolean | null>(null)
  
  // Get data from navigation state
  const navigationState = location.state as {
    midiData?: Uint8Array
    audioUrl?: string
    lyricsUrl?: string
  } | null
  
  useEffect(() => {
    // Load MIDI data if available
    if (navigationState?.midiData) {
      loadMidi(navigationState.midiData).catch(console.error)
    }
    
    // Load audio if available (for backing track)
    if (navigationState?.audioUrl) {
      loadAudio(navigationState.audioUrl).catch(console.error)
    }
    
    // For now, use sample lyrics
    // TODO: Fetch from lyricsUrl when available
    const parsedLyrics = parseLRC(sampleLRC)
    const karaokeLines: KaraokeLyricLine[] = parsedLyrics.map(line => ({
      id: line.id.toString(),
      text: line.text,
      startTime: line.startTime * 1000, // Convert to milliseconds
      endTime: line.endTime * 1000
    }))
    setLyrics(karaokeLines)
    setLyricsWithScores(karaokeLines)
    
    // Check microphone permission immediately
    checkMicrophonePermission()
  }, []) // Run only once on mount
  
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
  
  // Handle song completion
  useEffect(() => {
    if (isReady && currentTime >= duration && duration > 0 && isRecording) {
      // Stop recording and process results
      stopRecording().then((recordingBlob) => {
        if (recordingBlob) {
          // Simulate scoring for now
          const scoredLyrics = lyrics.map(lyric => ({
            ...lyric,
            score: Math.random() * 0.8 + 0.2
          }))
          setLyricsWithScores(scoredLyrics)
          
          // Navigate to completion page
          setTimeout(() => {
            navigate(`/karaoke/${songId}/complete`)
          }, 2000)
        }
      })
    }
  }, [currentTime, duration, isReady, isRecording, stopRecording, lyrics, navigate, songId])
  
  const handleAccountClick = () => {
    navigate('/account')
  }
  
  const handleCountdownComplete = async () => {
    setShowCountdown(false)
    setIsReady(true)
    play()
    // Start recording automatically
    await startRecording()
  }
  
  const handleClose = () => {
    pause()
    if (isRecording) {
      stopRecording()
    }
    navigate(`/s/${songId}`)
  }
  
  const checkMicrophonePermission = async () => {
    try {
      // First check if we already have permission using the permissions API
      if ('permissions' in navigator) {
        const permission = await navigator.permissions.query({ name: 'microphone' as PermissionName })
        if (permission.state === 'granted') {
          setHasMicPermission(true)
          setShowCountdown(true)
          return
        }
      }
      
      // If not granted or can't check, request permission
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.getTracks().forEach(track => track.stop())
      setHasMicPermission(true)
      setShowCountdown(true)
    } catch {
      setHasMicPermission(false)
    }
  }
  
  const handleRequestPermission = async () => {
    await checkMicrophonePermission()
  }
  
  
  return (
    <div className="min-h-screen bg-neutral-900 text-white flex flex-col">
      {showCountdown && <CountdownScreen onComplete={handleCountdownComplete} />}
      <Header 
        onAccountClick={handleAccountClick}
        leftContent={
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            className="text-white hover:bg-white/10"
          >
            <X size={24} />
          </Button>
        }
      />
      
      {/* Main karaoke area */}
      <div className="flex-grow flex flex-col">
        <div className="container mx-auto px-4 py-8 flex-grow flex flex-col">
          <div className="flex-grow flex items-center justify-center">
            {hasMicPermission === null || hasMicPermission === false ? (
              <MicrophonePermission 
                onRequestPermission={handleRequestPermission}
                showButton={hasMicPermission === false} // Only show button if explicitly denied
              />
            ) : isReady ? (
              <KaraokeDisplay
                lines={lyricsWithScores}
                currentTime={currentTime * 1000} // Convert to milliseconds
              />
            ) : (
              <div className="text-white/50 text-xl text-center">
                <div>Preparing karaoke session...</div>
                {!hasMidi && !hasAudio && (
                  <div className="text-sm mt-2">Loading music...</div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Audio progress bar only */}
      {isReady && (
        <div className="bg-neutral-800/50 backdrop-blur-lg border-t border-neutral-700">
          <div className="container mx-auto px-4 py-4">
            <AudioPlayer
              isPlaying={isPlaying}
              currentTime={currentTime}
              duration={duration}
              onPlay={play}
              onPause={pause}
              onSeek={seek}
            />
          </div>
        </div>
      )}
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