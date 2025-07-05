import { useEffect, useState } from "react"
import { Header, LyricLine, Button, ConnectWalletSheet, KaraokeDisplay, KaraokeScore, LyricsSlider, StreamingSlider, AdaptivePurchaseSlider, VoiceCreditsSlider } from "@karaoke-dapp/ui"
import { CaretLeft } from "@phosphor-icons/react"
import { useParams, useNavigate } from "react-router-dom"
import { DatabaseService, type Song } from "@karaoke-dapp/services/browser"
import { motion } from "motion/react"
import { useSongMachine } from "../machines"
import { useAccount, useConnect } from "wagmi"
import { LyricsService } from "../services/lyrics.service"
import { AudioProvider, useAudio } from '../contexts/audio-context'
import { parseLRC, prepareKaraokeSegments } from '../utils/lyrics-parser'
import { X, MusicNote, Article } from '@phosphor-icons/react'
import type { KaraokeLyricLine } from '@karaoke-dapp/ui'
import { KaraokeGradingService } from '../services/karaoke-grading.service'
import { FinalGradingService } from '../services/final-grading.service'
import { useRef } from 'react'
import { useUserTable } from '../hooks/use-user-table'
// import { useBundledPurchase } from '../hooks/use-bundled-purchase'


function SongDetailContent({ song }: { song: Song }) {
  const navigate = useNavigate()
  const { isConnected, address } = useAccount()
  const { hasTables, checkUserTables } = useUserTable()
  const { connectors, connect, status, error: connectError } = useConnect()
  const [lyrics, setLyrics] = useState<string[]>([])
  const [karaokeLyrics, setKaraokeLyrics] = useState<KaraokeLyricLine[]>([])
  const karaokeSegmentsRef = useRef<ReturnType<typeof prepareKaraokeSegments>>([])
  const gradingServiceRef = useRef<KaraokeGradingService | null>(null)
  const finalGradingServiceRef = useRef<FinalGradingService | null>(null)
  
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
    isKaraokeGrading,
    karaokeCountdownValue,
    karaokeActor,
    karaokeState,
    // Voice credit states
    isWaitingForCreditConfirmation,
    voiceCredits,
    creditsNeeded,
    confirmCredits,
    cancelKaraoke,
    purchaseVoiceCredits,
    isPurchasingVoiceCredits,
    purchaseComboPack,
    isPurchasingComboPack,
    // Get song credits too
    credits: songCredits,
    isPurchased
  } = useSongMachine(song.id, song.duration)
  
  // Determine if user has made any purchases
  // A user has purchases if they have: owned songs, song credits, or have had voice credits
  const hasExistingPurchases = isPurchased || (songCredits !== undefined && songCredits > 0) || 
    (voiceCredits !== undefined && voiceCredits > 0)
  
  // Bundled purchase hook
  // Bundled purchase hook - keeping for future use
  // const { executeBundledPurchase } = useBundledPurchase()
  
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
  
  const [lineGrades, setLineGrades] = useState<Map<number, number>>(new Map())
  const [isSavingProgress, setIsSavingProgress] = useState(false)
  const [hasSavedProgress, setHasSavedProgress] = useState(false)
  
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
              text: line.text.replace(/\s*\([^)]*\)/g, '').trim(), // Remove parenthetical content for display
              startTime: line.startTime * 1000,
              endTime: line.endTime * 1000
            }))
            setKaraokeLyrics(karaokeLines)
            
            // Prepare karaoke segments for recording
            karaokeSegmentsRef.current = prepareKaraokeSegments(parsedLyrics)
            console.log('🎯 Prepared karaoke segments:', karaokeSegmentsRef.current.length)
          }
        }
      } catch (err) {
        console.error('Failed to load lyrics:', err)
      }
    }
    
    loadLyrics()
  }, [song])
  
  // Update karaoke machine with segments when lyrics are loaded
  useEffect(() => {
    if (karaokeSegmentsRef.current.length > 0 && karaokeActor) {
      console.log('📦 Updating karaoke machine with segments:', karaokeSegmentsRef.current.length)
      karaokeActor.send({
        type: 'UPDATE_CONTEXT',
        segments: karaokeSegmentsRef.current,
        gradingService: gradingServiceRef.current,
        finalGradingService: finalGradingServiceRef.current
      })
    }
  }, [karaokeLyrics, karaokeActor]) // Use karaokeLyrics as dependency since it triggers when segments are ready
  
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
      console.log('🔐 Initializing grading services with session signatures')
      const sessionId = `karaoke-${song.id}-${Date.now()}`
      
      gradingServiceRef.current = new KaraokeGradingService({
        sessionSigs: karaokeState.context.sessionSigs,
        userAddress: address,
        sessionId,
        language: 'en'
      })
      
      finalGradingServiceRef.current = new FinalGradingService({
        sessionSigs: karaokeState.context.sessionSigs,
        sessionId,
        songId: song.id,
        userAddress: address,
        totalLines: karaokeSegmentsRef.current.length
      })
      
      Promise.all([
        gradingServiceRef.current.initialize(),
        finalGradingServiceRef.current.initialize()
      ]).then(() => {
        console.log('✅ Grading services initialized successfully')
        // Update the karaoke machine with both grading services
        if (karaokeActor) {
          karaokeActor.send({
            type: 'UPDATE_CONTEXT',
            segments: karaokeSegmentsRef.current,
            gradingService: gradingServiceRef.current,
            finalGradingService: finalGradingServiceRef.current
          })
        }
      }).catch(error => {
        console.error('❌ Failed to initialize grading services:', error)
      })
    }
  }, [isInKaraokeMode, address, song.id, karaokeState?.context?.sessionSigs, karaokeActor])
  
  // Update karaoke machine when segments or grading services are ready
  useEffect(() => {
    if (isInKaraokeMode && karaokeSegmentsRef.current.length > 0 && gradingServiceRef.current && finalGradingServiceRef.current && karaokeActor) {
      // Update the machine context with segments and grading services
      karaokeActor.send({
        type: 'UPDATE_CONTEXT',
        segments: karaokeSegmentsRef.current,
        gradingService: gradingServiceRef.current,
        finalGradingService: finalGradingServiceRef.current,
        songId: song.id,
        songTitle: song.title,
        artistName: song.artist,
        userAddress: address
      } as const)
    }
  }, [isInKaraokeMode, karaokeActor])
  
  // Listen for grading results from the karaoke machine
  useEffect(() => {
    if (isInKaraokeMode && karaokeState?.context?.gradingResults?.size > 0) {
      const newGrades = new Map<number, number>()
      karaokeState.context.gradingResults.forEach((result: { transcript: string; accuracy: number }, lineId: number) => {
        newGrades.set(lineId, result.accuracy)
      })
      setLineGrades(newGrades)
    }
  }, [isInKaraokeMode, karaokeState?.context?.gradingResults])
  
  // No need to start recording - the karaoke machine starts automatically in preparing state
  
  // Handle karaoke state transitions
  useEffect(() => {
    if (isKaraokePlaying && !isPlaying) {
      console.log('🎵 Starting karaoke playback, hasMidi:', hasMidi)
      
      // Wait for MIDI to be loaded before playing
      if (hasMidi) {
        console.log('🎵 MIDI is ready, starting playback')
        console.log(`🎵 Song play() called at: ${Date.now()}`)
        play()
      } else {
        console.log('⏳ Waiting for MIDI to load...')
        // Will be triggered again when hasMidi changes
      }
    } else if (!isKaraokePlaying && isPlaying) {
      console.log('⏹️ Stopping karaoke playback')
      pause()
    }
  }, [isKaraokePlaying, isPlaying, play, pause, hasMidi])
  
  // Monitor song progress and notify karaoke machine when song ends
  useEffect(() => {
    if (isInKaraokeMode && isKaraokePlaying && currentTime >= duration && duration > 0) {
      karaokeActor?.send({ type: 'SONG_ENDED' })
    }
  }, [isInKaraokeMode, isKaraokePlaying, currentTime, duration, karaokeActor])
  
  // Handle song completion
  useEffect(() => {
    if (isKaraokePlaying && currentTime >= duration && duration > 0) {
      send({ type: 'COMPLETE' })
    }
  }, [isKaraokePlaying, currentTime, duration, send])

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
            showLogo={false}
            showAccount={false}
            leftContent={
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  pause()
                  setHasSavedProgress(false)
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
            showLogo={false}
            showAccount={false}
            leftContent={
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  pause()
                  setHasSavedProgress(false)
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
          <Header 
        onAccountClick={handleAccountClick}
        showLogo={false}
        showAccount={true}
        leftContent={
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <CaretLeft size={24} />
          </Button>
        }
      />
          <div className="flex-1 flex flex-col items-center justify-center p-8">
            <KaraokeScore
              isLoading={isKaraokeGrading}
              score={karaokeState?.context?.score || 0}
              songTitle={song.title}
              artist={song.artist}
              onSaveProgress={async () => {
                // Handle save progress
                setIsSavingProgress(true)
                const { karaokeDataPipeline } = await import('@karaoke-dapp/services')
                
                try {
                  // Validate address before proceeding
                  if (!address || address.trim() === '') {
                    console.warn('No wallet address available for saving progress')
                    return
                  }
                  
                  // Check tables first
                  await checkUserTables()
                  
                  const result = await karaokeDataPipeline.handleSaveProgress(
                    address,
                    hasTables
                  )
                  
                  if (result.tablelandCreated) {
                    console.log('✅ Tableland table created')
                  }
                  if (result.syncStarted) {
                    console.log('✅ Sync started')
                  }
                  
                  // Mark as saved instead of navigating
                  setIsSavingProgress(false)
                  setHasSavedProgress(true)
                } catch (error) {
                  console.error('Failed to save progress:', error)
                  setIsSavingProgress(false)
                }
              }}
              onSkip={() => {
                setHasSavedProgress(false)
                send({ type: 'EXIT' })
              }}
              onPractice={() => navigate('/exercise')}
              isSaving={isSavingProgress}
              isSaved={hasSavedProgress}
            />
          </div>
        </div>
      )
    }
  }
  
  // Normal song detail view
  return (
    <div className="min-h-screen bg-neutral-900 text-white flex flex-col">
      <Header 
        onAccountClick={handleAccountClick}
        showLogo={false}
        showAccount={true}
        leftContent={
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <CaretLeft size={24} />
          </Button>
        }
      />
      
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
                className="text-xl text-neutral-200 mb-4"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.5 }}
              >
                {song.artist}
              </motion.p>
              <motion.div 
                className="flex gap-3"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.7 }}
              >
                <StreamingSlider
                  songTitle={song.title}
                  artist={song.artist}
                  streamingLinks={song.streaming_links}
                >
                  <Button
                    variant="ghost"
                    size="icon"
                    className="bg-white/10 hover:bg-white/20 text-white opacity-80 hover:opacity-100 transition-opacity"
                  >
                    <MusicNote size={20} weight="fill" />
                  </Button>
                </StreamingSlider>
                <LyricsSlider
                  songTitle={song.title}
                  artist={song.artist}
                  geniusSlug={song.genius_slug}
                >
                  <Button
                    variant="ghost"
                    size="icon"
                    className="bg-white/10 hover:bg-white/20 text-white opacity-80 hover:opacity-100 transition-opacity"
                  >
                    <Article size={20} weight="fill" />
                  </Button>
                </LyricsSlider>
              </motion.div>
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
          ) : machineError && machineError.includes('Insufficient voice credits') ? (
            <div className="space-y-4">
              <VoiceCreditsSlider
                onPurchaseVoice={() => purchaseVoiceCredits()}
                isPurchasing={isPurchasingVoiceCredits}
                currentVoiceCredits={voiceCredits}
                creditsNeeded={creditsNeeded}
              >
                <Button 
                  className="w-full" 
                  size="lg"
                  disabled={isPurchasingVoiceCredits}
                >
                  {isPurchasingVoiceCredits ? 'Purchasing...' : 'Buy Voice Credits'}
                </Button>
              </VoiceCreditsSlider>
              <Button 
                className="w-full" 
                size="lg"
                variant="outline"
                onClick={() => buttonState.action?.()}
              >
                Retry
              </Button>
            </div>
          ) : machineError ? (
            <div className="space-y-4">
              <div className="text-center text-red-400 text-sm">
                {machineError}
              </div>
              <Button 
                className="w-full" 
                size="lg"
                onClick={() => buttonState.action?.()}
              >
                Retry
              </Button>
            </div>
          ) : buttonState.text === 'Purchase' ? (
            <AdaptivePurchaseSlider
              onPurchaseCombo={() => buttonState.action?.()}
              onPurchaseSongs={() => buttonState.action?.()}
              onPurchaseVoice={() => purchaseVoiceCredits()}
              isPurchasing={buttonState.disabled}
              hasExistingPurchases={hasExistingPurchases}
              currentSongCredits={songCredits}
              currentVoiceCredits={voiceCredits}
            >
              <Button 
                className="w-full" 
                size="lg"
                disabled={buttonState.disabled}
              >
                {buttonState.text}
              </Button>
            </AdaptivePurchaseSlider>
          ) : buttonState.text === 'Download' ? (
            <Button 
              className="w-full" 
              size="lg"
              onClick={() => buttonState.action?.()}
              disabled={buttonState.disabled}
            >
              {buttonState.disabled ? 'Decrypting...' : 'Download'}
            </Button>
          ) : isWaitingForCreditConfirmation ? (
            <div className="space-y-4">
              <div className="text-center">
                <div className="text-sm text-neutral-300 mb-2">
                  Cost: {creditsNeeded} credits
                </div>
                <div className="text-xs text-neutral-400">
                  Balance: {voiceCredits}
                </div>
              </div>
              <div className="flex gap-2">
                <Button 
                  className="flex-1" 
                  size="lg"
                  variant="outline"
                  onClick={() => cancelKaraoke()}
                >
                  Cancel
                </Button>
                <Button 
                  className="flex-1" 
                  size="lg"
                  onClick={() => confirmCredits()}
                >
                  Confirm & Start
                </Button>
              </div>
            </div>
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
        <Header 
        onAccountClick={handleAccountClick}
        showLogo={false}
        showAccount={true}
        leftContent={
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <CaretLeft size={24} />
          </Button>
        }
      />
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-neutral-400">Loading song...</div>
        </div>
      </div>
    )
  }

  if (error || !songData) {
    return (
      <div className="min-h-screen bg-neutral-900 text-white">
        <Header 
        onAccountClick={handleAccountClick}
        showLogo={false}
        showAccount={true}
        leftContent={
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <CaretLeft size={24} />
          </Button>
        }
      />
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