import { useEffect, useState } from "react"
import { Header, LyricLine, Button, PurchaseSlider, ConnectWalletSheet, KaraokeDisplay, KaraokeScore } from "@karaoke-dapp/ui"
import { useParams, useNavigate } from "react-router-dom"
import { DatabaseService, type Song } from "@karaoke-dapp/services/browser"
import { motion } from "motion/react"
import { useSongMachine } from "../machines"
import { useAccount, useConnect } from "wagmi"
import { LyricsService } from "../services/lyrics.service"
import { AudioProvider, useAudio } from '../contexts/audio-context'
import { parseLRC, prepareKaraokeSegments } from '../utils/lyrics-parser'
import { X } from '@phosphor-icons/react'
import type { KaraokeLyricLine } from '@karaoke-dapp/ui'
import { KaraokeGradingService } from '../services/karaoke-grading.service'
import { useRef } from 'react'
import { useMachine } from '@xstate/react'
import { fromCallback } from 'xstate'
import { karaokeMachineV2 } from '../machines/karaoke/karaokeMachineV2'


function SongDetailContent({ song }: { song: Song }) {
  const navigate = useNavigate()
  const { isConnected, address } = useAccount()
  const { connectors, connect, status, error: connectError } = useConnect()
  const [lyrics, setLyrics] = useState<string[]>([])
  const [karaokeLyrics, setKaraokeLyrics] = useState<KaraokeLyricLine[]>([])
  const karaokeSegmentsRef = useRef<ReturnType<typeof prepareKaraokeSegments>>([])
  const gradingServiceRef = useRef<KaraokeGradingService | null>(null)
  
  // Now we have the actual songId from the database
  const {
    state,
    checkAccess,
    getButtonState,
    isCheckingAccess,
    error: machineError,
    send,
    // Karaoke states
    isInKaraokeMode,
    isKaraokeCountdown,
    isKaraokePlaying,
    isKaraokeStopped,
    karaokeCountdownValue,
    karaokeActor,
    karaokeState
  } = useSongMachine(song.id)
  
  // Audio context
  const {
    loadMidi,
    play,
    pause,
    currentTime,
    duration,
    isPlaying,
    hasMidi
  } = useAudio()
  
  // New karaoke machine - only start when in karaoke mode with segments
  const [karaokeV2State, karaokeV2Send] = useMachine(
    karaokeMachineV2.provide({
      actors: {
        countdownTimer: fromCallback(({ sendBack }) => {
          let count = 3;
          
          const interval = setInterval(() => {
            sendBack({ type: 'UPDATE_COUNTDOWN', value: count });
            count--;
            
            if (count < 0) {
              clearInterval(interval);
            }
          }, 1000);
          
          return () => clearInterval(interval);
        })
      }
    }), {
      input: {
        songId: song.id,
        midiData: state.context.midiData,
        segments: karaokeSegmentsRef.current,
        sessionSigs: karaokeState?.context?.sessionSigs,
        gradingService: gradingServiceRef.current
      }
    }
  )
  
  // Get line grades from the new machine
  const lineGrades = karaokeV2State.context.lineScores
  
  useEffect(() => {
    async function loadLyrics() {
      try {
        const lyricsService = new LyricsService()
        
        // This will cache the lyrics for when we navigate to karaoke
        const lyricsData = await lyricsService.getLyricsForSong(
          song.lrclib_id,
          song.title,
          song.artist,
          '', // album name not in DB
          song.duration
        )
        
        if (lyricsData) {
          // Set plain lyrics for display
          if (lyricsData.plainLyrics) {
            setLyrics(lyricsData.plainLyrics.split('\n').filter(line => line.trim()))
          }
          
          // Parse synced lyrics for karaoke
          if (lyricsData.syncedLyrics) {
            const parsedLyrics = parseLRC(lyricsData.syncedLyrics)
            const karaokeLines: KaraokeLyricLine[] = parsedLyrics.map(line => ({
              id: line.id.toString(),
              text: line.text,
              startTime: line.startTime * 1000,
              endTime: line.endTime * 1000
            }))
            setKaraokeLyrics(karaokeLines)
            
            // Prepare karaoke segments for recording
            karaokeSegmentsRef.current = prepareKaraokeSegments(parsedLyrics)
          }
        }
      } catch (err) {
        console.error('Failed to load lyrics:', err)
      }
    }
    
    loadLyrics()
  }, [song])
  
  // Check access when connected
  useEffect(() => {
    if (isConnected) {
      checkAccess()
    }
  }, [isConnected, checkAccess])
  
  // Karaoke states are now handled by the karaoke machine
  
  // Load MIDI when entering karaoke mode
  useEffect(() => {
    if (isInKaraokeMode && state.context.midiData) {
      console.log('🎹 Loading MIDI data into audio context')
      loadMidi(state.context.midiData).then(() => {
        console.log('✅ MIDI loaded successfully')
      }).catch(err => {
        console.error('❌ Failed to load MIDI:', err)
      })
    }
  }, [isInKaraokeMode, state.context.midiData, loadMidi])
  
  // Restart the machine when we have new segments and grading service
  // (XState machines get their input at creation time)
  
  // Initialize grading service when session signatures become available
  useEffect(() => {
    if (isInKaraokeMode && address && karaokeState?.context?.sessionSigs && !gradingServiceRef.current) {
      console.log('🔐 Initializing grading service with session signatures')
      gradingServiceRef.current = new KaraokeGradingService({
        sessionSigs: karaokeState.context.sessionSigs,
        userAddress: address,
        sessionId: `karaoke-${song.id}-${Date.now()}`,
        language: 'en'
      })
      
      gradingServiceRef.current.initialize().then(() => {
        console.log('✅ Grading service initialized successfully')
      }).catch(error => {
        console.error('❌ Failed to initialize grading service:', error)
      })
    }
  }, [isInKaraokeMode, address, song.id, karaokeState?.context?.sessionSigs])
  
  // Handle karaoke state transitions
  useEffect(() => {
    if (isKaraokePlaying && !isPlaying) {
      console.log('🎵 Starting karaoke playback, hasMidi:', hasMidi)
      
      // Wait for MIDI to be loaded before playing
      if (hasMidi) {
        console.log('🎵 MIDI is ready, starting playback')
        play()
      } else {
        console.log('⏳ Waiting for MIDI to load...')
        // Will be triggered again when hasMidi changes
      }
    } else if (!isKaraokePlaying && isPlaying) {
      console.log('⏹️ Stopping karaoke playback')
      pause()
      karaokeV2Send({ type: 'STOP' })
    }
  }, [isKaraokePlaying, isPlaying, play, pause, hasMidi])
  
  // Send time updates to the karaoke machine for recording coordination
  useEffect(() => {
    if (isKaraokePlaying) {
      karaokeV2Send({ 
        type: 'AUDIO_TIME_UPDATE', 
        time: currentTime 
      })
    }
  }, [isKaraokePlaying, currentTime, karaokeV2Send])
  
  // Handle song completion
  useEffect(() => {
    if (isKaraokePlaying && currentTime >= duration && duration > 0) {
      karaokeV2Send({ type: 'COMPLETE' })
      send({ type: 'COMPLETE' })
    }
  }, [isKaraokePlaying, currentTime, duration, send, karaokeV2Send])

  // The countdown is now handled by the karaoke machine
  
  const handleAccountClick = () => {
    navigate('/account')
  }
  
  const buttonState = getButtonState()
  
  // Handle karaoke mode
  if (isInKaraokeMode) {
    // Show countdown
    if (isKaraokeCountdown) {
      return (
        <div className="min-h-screen bg-neutral-900 text-white flex flex-col">
          <Header 
            onAccountClick={handleAccountClick}
            leftContent={
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  pause()
                  karaokeV2Send({ type: 'EXIT' })
                  send({ type: 'EXIT' })
                }}
              >
                <X size={24} />
              </Button>
            }
          />
          <KaraokeDisplay
            lines={karaokeLyrics}
            currentTime={0} // Not started yet
            countdown={karaokeCountdownValue}
          />
        </div>
      )
    }
    
    // Show karaoke playing
    if (isKaraokePlaying) {
      return (
        <div className="min-h-screen bg-neutral-900 text-white flex flex-col">
          <Header 
            onAccountClick={handleAccountClick}
            leftContent={
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  pause()
                  karaokeV2Send({ type: 'STOP' })
                  karaokeActor?.send({ type: 'STOP' })
                }}
              >
                <X size={24} />
              </Button>
            }
          />
          <KaraokeDisplay
            lines={karaokeLyrics}
            currentTime={currentTime * 1000} // Convert to milliseconds
            lineColors={lineGrades}
          />
        </div>
      )
    }
    
    // Show score
    if (isKaraokeStopped) {
      return (
        <div className="min-h-screen bg-neutral-900 text-white flex flex-col">
          <Header onAccountClick={handleAccountClick} />
          <div className="flex-1 flex flex-col items-center justify-center p-8">
            <KaraokeScore
              score={karaokeState?.context?.score || 0}
              songTitle={song.title}
              artist={song.artist}
              onPractice={() => karaokeActor?.send({ type: 'RESTART' })}
            />
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => send({ type: 'EXIT' })}
            >
              Back to Song
            </Button>
          </div>
        </div>
      )
    }
  }
  
  // Normal song detail view
  return (
    <div className="min-h-screen bg-neutral-900 text-white flex flex-col">
      <Header onAccountClick={handleAccountClick} />
      
      {/* Main content area */}
      <div className="flex-1 pb-20">
        {/* Hero section with full-width background image */}
        <motion.div 
          className="relative w-full h-96 bg-cover bg-center"
          style={{
            backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.3), rgba(0,0,0,0.7)), url('${new DatabaseService().getArtworkUrl(song, 'f')}')`
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
        >
          <div className="absolute inset-0 flex items-end">
            <div className="w-full max-w-4xl mx-auto px-4 pb-8">
              <motion.h1 
                className="text-4xl md:text-5xl font-bold text-white mb-2"
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.3 }}
              >
                {song.title}
              </motion.h1>
              <motion.p 
                className="text-xl text-neutral-200"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.5 }}
              >
                {song.artist}
              </motion.p>
            </div>
          </div>
        </motion.div>
        
        {/* Lyrics section */}
        <div className="w-full max-w-4xl mx-auto px-4 py-8">
          <motion.div 
            className="space-y-3"
            initial="hidden"
            animate="visible"
            variants={{
              hidden: { opacity: 0 },
              visible: {
                opacity: 1,
                transition: {
                  delayChildren: 0.3,
                  staggerChildren: 0.02
                }
              }
            }}
          >
            {lyrics.map((line, index) => (
              <LyricLine key={index} text={line} />
            ))}
          </motion.div>
          {lyrics.length === 0 && (
            <div className="text-neutral-400 text-center">Loading lyrics...</div>
          )}
        </div>
      </div>
      
      {/* Bottom action bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-neutral-800/80 backdrop-blur-lg border-t border-neutral-700">
        <div className="container mx-auto px-4 py-4">
          {machineError && (
            <div className="text-red-400 text-sm mb-2">{machineError}</div>
          )}
          {!isConnected ? (
            <ConnectWalletSheet
              connectors={connectors}
              onConnect={(connector) => connect({ connector })}
              isConnecting={status === 'pending'}
              error={connectError}
            >
              <Button 
                className="w-full" 
                size="lg"
              >
                Connect Wallet to Purchase
              </Button>
            </ConnectWalletSheet>
          ) : machineError ? (
            <>
              <Button 
                className="w-full" 
                size="lg"
                onClick={() => buttonState.action?.()}
              >
                Retry
              </Button>
              <div className="text-left text-red-400 text-sm mt-2 leading-relaxed break-words">
                {machineError}
              </div>
            </>
          ) : buttonState.text === 'Purchase' ? (
            <PurchaseSlider
              songTitle={song.title}
              packagePrice={2}
              packageCredits={2}
              onPurchase={() => buttonState.action?.()}
              isPurchasing={buttonState.disabled}
            >
              <Button 
                className="w-full" 
                size="lg"
                disabled={buttonState.disabled}
              >
                {buttonState.text}
              </Button>
            </PurchaseSlider>
          ) : buttonState.text === 'Download' ? (
            <Button 
              className="w-full" 
              size="lg"
              onClick={() => buttonState.action?.()}
              disabled={buttonState.disabled}
            >
              {buttonState.disabled ? 'Decrypting...' : 'Download'}
            </Button>
          ) : (
            <Button 
              className="w-full" 
              size="lg"
              onClick={() => buttonState.action?.()}
              disabled={buttonState.disabled || isCheckingAccess}
            >
              {buttonState.text}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

export function SongDetailPage() {
  const { artist, song } = useParams()
  const navigate = useNavigate()
  const [songData, setSongData] = useState<Song | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  useEffect(() => {
    async function loadSong() {
      if (!artist || !song) return
      
      try {
        setLoading(true)
        
        // Load all songs and find the matching one
        const dbService = new DatabaseService()
        const songs = await dbService.getSongs()
        const foundSong = songs.find(s => 
          s.artist.toLowerCase().replace(/\s+/g, '-') === artist &&
          s.title.toLowerCase().replace(/\s+/g, '-') === song
        )
        
        if (!foundSong) {
          setError('Song not found')
          return
        }
        
        setSongData(foundSong)
      } catch (err) {
        console.error('Failed to load song:', err)
        setError('Failed to load song data')
      } finally {
        setLoading(false)
      }
    }
    
    loadSong()
  }, [artist, song])
  
  const handleAccountClick = () => {
    navigate('/account')
  }
  
  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-900 text-white">
        <Header onAccountClick={handleAccountClick} />
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-neutral-400">Loading song...</div>
        </div>
      </div>
    )
  }

  if (error || !songData) {
    return (
      <div className="min-h-screen bg-neutral-900 text-white">
        <Header onAccountClick={handleAccountClick} />
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-red-400">{error || 'Song not found'}</div>
        </div>
      </div>
    )
  }

  return (
    <AudioProvider>
      <SongDetailContent song={songData} />
    </AudioProvider>
  )
}