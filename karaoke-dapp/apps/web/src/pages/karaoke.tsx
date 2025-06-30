import { useEffect, useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { Header, KaraokeDisplay, Button, CountdownScreen, MicrophonePermission } from '@karaoke-dapp/ui'
import { X } from '@phosphor-icons/react'
import { AudioProvider, useAudio } from '../contexts/audio-context'
import { parseLRC, getCurrentLyricIndex } from '../utils/lyrics-parser'
import { DatabaseService } from '@karaoke-dapp/services/browser'
import { LyricsService } from '../services/lyrics.service'
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
  const { artist, song } = useParams()
  const {
    currentTime,
    duration,
    isRecording,
    hasMidi,
    hasAudio,
    play,
    pause,
    startRecording,
    stopRecording,
    loadAudio,
    loadMidi
  } = useAudio()
  
  const [lyrics, setLyrics] = useState<KaraokeLyricLine[]>([])
  const [, setActiveLyricIndex] = useState(-1)
  const [lyricsWithScores, setLyricsWithScores] = useState<KaraokeLyricLine[]>([])
  const [songId, setSongId] = useState<number | null>(null)
  const [showCountdown, setShowCountdown] = useState(false)
  const [isReady, setIsReady] = useState(false)
  const [hasMicPermission, setHasMicPermission] = useState<boolean | null>(null)
  const [isLoadingLyrics, setIsLoadingLyrics] = useState(true)
  
  // Get data from navigation state
  const navigationState = location.state as {
    midiData?: Uint8Array
    audioUrl?: string
    lyricsUrl?: string
  } | null
  
  useEffect(() => {
    const loadSongData = async () => {
      try {
        // First find the song by artist/title to get its ID
        let numericSongId: number | null = null;
        
        if (artist && song) {
          const dbService = new DatabaseService()
          const songs = await dbService.getSongs()
          const foundSong = songs.find(s => 
            s.artist.toLowerCase().replace(/\s+/g, '-') === artist &&
            s.title.toLowerCase().replace(/\s+/g, '-') === song
          )
          
          if (foundSong) {
            numericSongId = foundSong.id
            setSongId(foundSong.id)
          }
        }
        // Load MIDI data if available
        if (navigationState?.midiData) {
          // Load MIDI data
          await loadMidi(navigationState.midiData)
        } else {
          console.warn('⚠️ No MIDI data in navigation state')
        }
        
        // Load audio if available (for backing track)
        if (navigationState?.audioUrl) {
          console.log('🎵 Loading audio from:', navigationState.audioUrl)
          await loadAudio(navigationState.audioUrl)
        } else {
          // No audio URL - using MIDI only for karaoke
        }
        
        // Fetch song details and lyrics
        if (numericSongId) {
          setIsLoadingLyrics(true)
          const dbService = new DatabaseService()
          const lyricsService = new LyricsService()
          
          const song = await dbService.getSongById(numericSongId)
          
          if (song) {
            // Try to fetch lyrics from LRCLIB
            // Fetch lyrics from LRCLIB
            const lyricsData = await lyricsService.getLyricsForSong(
              song.lrclib_id,
              song.title,
              song.artist,
              '', // album name not stored in our DB
              song.duration
            )
            // Process lyrics data
            
            if (lyricsData && lyricsData.syncedLyrics) {
              // Use synced lyrics if available
              // Use synced lyrics with timestamps
              const parsedLyrics = parseLRC(lyricsData.syncedLyrics)
              const karaokeLines: KaraokeLyricLine[] = parsedLyrics.map(line => ({
                id: line.id.toString(),
                text: line.text,
                startTime: line.startTime * 1000,
                endTime: line.endTime * 1000
              }))
              setLyrics(karaokeLines)
              setLyricsWithScores(karaokeLines)
            } else if (lyricsData && lyricsData.plainLyrics) {
              // Fall back to plain lyrics with estimated timing
              const lines = lyricsData.plainLyrics.split('\n').filter(line => line.trim())
              const timePerLine = (song.duration * 1000) / lines.length
              const karaokeLines: KaraokeLyricLine[] = lines.map((line, index) => ({
                id: index.toString(),
                text: line,
                startTime: index * timePerLine,
                endTime: (index + 1) * timePerLine
              }))
              setLyrics(karaokeLines)
              setLyricsWithScores(karaokeLines)
            } else {
              // Use sample lyrics as fallback
              console.warn('No lyrics found, using sample lyrics')
              const parsedLyrics = parseLRC(sampleLRC)
              const karaokeLines: KaraokeLyricLine[] = parsedLyrics.map(line => ({
                id: line.id.toString(),
                text: line.text,
                startTime: line.startTime * 1000,
                endTime: line.endTime * 1000
              }))
              setLyrics(karaokeLines)
              setLyricsWithScores(karaokeLines)
            }
          }
          setIsLoadingLyrics(false)
        }
      } catch (error) {
        console.error('Error loading song data:', error)
        setIsLoadingLyrics(false)
        
        // Use sample lyrics as fallback
        const parsedLyrics = parseLRC(sampleLRC)
        const karaokeLines: KaraokeLyricLine[] = parsedLyrics.map(line => ({
          id: line.id.toString(),
          text: line.text,
          startTime: line.startTime * 1000,
          endTime: line.endTime * 1000
        }))
        setLyrics(karaokeLines)
        setLyricsWithScores(karaokeLines)
      }
    }
    
    loadSongData()
    checkMicrophonePermission()
  }, [artist, song, navigationState, loadMidi, loadAudio]) // Run when dependencies change
  
  // Lyrics state is now properly managed
  
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
    // Start playback after countdown
    setShowCountdown(false)
    setIsReady(true)
    
    // Start playback (MIDI and/or audio)
    try {
      await play()
      // Playback started successfully
    } catch (error) {
      console.error('❌ Error starting playback:', error)
    }
    
    // Start recording automatically
    try {
      await startRecording()
      // Recording started successfully
    } catch (error) {
      console.error('❌ Error starting recording:', error)
    }
  }
  
  const handleClose = () => {
    pause()
    if (isRecording) {
      stopRecording()
    }
    // Navigate back to song detail page using artist/song format
    if (artist && song) {
      navigate(`/${artist}/${song}`)
    } else {
      navigate('/')
    }
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
                {isLoadingLyrics && (
                  <div className="text-sm mt-2">Loading lyrics...</div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Progress indicator - simple bar without controls for karaoke */}
      {isReady && (
        <div className="bg-neutral-800/50 backdrop-blur-lg border-t border-neutral-700">
          <div className="container mx-auto px-4 py-2">
            <div className="w-full bg-neutral-700 rounded-full h-1">
              <div 
                className="bg-purple-500 h-1 rounded-full transition-all duration-300"
                style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
              />
            </div>
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