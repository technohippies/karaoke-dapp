import { useEffect, useState } from "react"
import { Header, LyricLine, Button, ConnectWalletSheet, KaraokeDisplay, KaraokeScore, LyricsSlider, StreamingSlider, AdaptivePurchaseSlider, VoiceCreditsSlider, TranslationSlider } from "@karaoke-dapp/ui"
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
import { PortoPurchaseButton } from '../components/porto-purchase-button'
import { PortoKaraokeIndicator } from '../components/porto-karaoke-indicator'
import { TranslationService } from '../services/translation.service'
// import { useBundledPurchase } from '../hooks/use-bundled-purchase'
import { MetaMaskIntegrationStatus } from '../components/metamask-integration-status'
import { TestV030Contract } from '../components/test-v030-contract'


function SongDetailContent({ song }: { song: Song }) {
  const navigate = useNavigate()
  const { isConnected, address, connector } = useAccount()
  const { checkUserTables } = useUserTable()
  const { connectors, connect, status, error: connectError } = useConnect()
  const [lyrics, setLyrics] = useState<string[]>([])
  const [karaokeLyrics, setKaraokeLyrics] = useState<KaraokeLyricLine[]>([])
  const [translations, setTranslations] = useState<Record<string, Record<number, string>>>({})
  const [translationsLoading, setTranslationsLoading] = useState(false)
  const [hasLoadedTranslations, setHasLoadedTranslations] = useState(false)
  const [userLanguage, setUserLanguage] = useState<string>('en')
  const [detectedLanguageLabel, setDetectedLanguageLabel] = useState<string>('')
  const karaokeSegmentsRef = useRef<ReturnType<typeof prepareKaraokeSegments>>([])
  const gradingServiceRef = useRef<KaraokeGradingService | null>(null)
  const finalGradingServiceRef = useRef<FinalGradingService | null>(null)
  const translationServiceRef = useRef<TranslationService | null>(null)
  
  
  // Detect user's browser language
  useEffect(() => {
    const browserLang = navigator.language || navigator.languages?.[0] || 'en';
    
    // Map browser language codes to our translation codes
    // zh-CN, zh-TW, zh-HK -> zh
    // ug, ug-CN -> ug  
    // bo, bo-CN, bo-IN -> bo
    let mappedLang = 'en'; // default
    let label = 'English'; // default
    
    if (browserLang.startsWith('zh')) {
      mappedLang = 'zh';
      label = 'Chinese';
    } else if (browserLang.startsWith('ug')) {
      mappedLang = 'ug';
      label = 'Uyghur';
    } else if (browserLang.startsWith('bo')) {
      mappedLang = 'bo';
      label = 'Tibetan';
    }
    
    setUserLanguage(mappedLang);
    setDetectedLanguageLabel(label);
  }, []);
  
  // Now we have the actual songId from the database
  const {
    state,
    checkAccess,
    getButtonState,
    isCheckingAccess,
    isIdle,
    isDetectingWallet,
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
    // Session states
    isMetaMaskSessionActive,
    isInitializingMetaMaskSession,
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
  const [isPortoWallet, setIsPortoWallet] = useState(false)
  
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
    
    async function checkTranslationCache() {
      if (!song.translations || Object.keys(song.translations).length === 0) {
        console.log('🌐 No translations available for this song');
        return;
      }
      
      try {
        if (!translationServiceRef.current) {
          translationServiceRef.current = new TranslationService();
        }
        
        // Check if translations are cached (no signature needed)
        const cachedTranslations = await translationServiceRef.current.getTranslations(
          song.id,
          song.translations
        );
        
        if (Object.keys(cachedTranslations).length > 0) {
          setTranslations(cachedTranslations);
          setHasLoadedTranslations(true);
          console.log('🌐 Cached translations loaded:', Object.keys(cachedTranslations));
          console.log('🌐 Cached translation data:', cachedTranslations);
        } else {
          console.log('🌐 No cached translations found');
        }
      } catch (err) {
        console.error('Failed to check translation cache:', err);
      }
    }
    
    // Only load lyrics if user has purchased the song
    if (isPurchased) {
      loadLyrics();
      // Check if translations are cached (no signature needed)
      checkTranslationCache();
    }
  }, [song, isPurchased])
  
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
  
  // Check access when connected and wallet detection is complete
  useEffect(() => {
    console.log('🔍 Access check conditions:', { 
      isConnected, 
      isIdle, 
      isDetectingWallet,
      address,
      state: state.value 
    })
    if (isConnected && isIdle) {
      console.log('✅ Calling checkAccess()')
      checkAccess()
    }
  }, [isConnected, isIdle, checkAccess])
  
  // Detect Porto wallet and MetaMask smart account
  useEffect(() => {
    const checkWalletCapabilities = async () => {
      if (!address) return
      
      try {
        // Check if using Porto connector
        const isPortoConnector = connector?.name === 'Porto'
        
        // Also check if window.ethereum has Porto-specific properties
        const provider = window.ethereum as any
        const hasPortoProvider = provider?.isPorto === true
        
        // Check for MetaMask smart account capabilities
        let hasSmartAccountCapabilities = false
        let capabilities = null
        
        // Check if wallet supports EIP-5792 (wallet_getCapabilities)
        if (provider?.request) {
          try {
            console.log('🔍 Checking wallet capabilities via EIP-5792...')
            // MetaMask requires chain IDs as second parameter
            const chainId = '0x14a34' // Base Sepolia in hex (84532)
            capabilities = await provider.request({
              method: 'wallet_getCapabilities',
              params: [address, [chainId]]
            })
            console.log('📋 Wallet capabilities:', capabilities)
            
            // Check for atomic batch capability (MetaMask smart account feature)
            const chainCapabilities = capabilities?.[chainId]
            // MetaMask uses 'atomic' not 'atomicBatch' based on user's console output
            const atomicSupported = chainCapabilities?.atomic?.status === 'supported' || 
                                   chainCapabilities?.atomic?.status === 'ready'
            const atomicBatchSupported = chainCapabilities?.atomicBatch?.status === 'supported' || 
                                       chainCapabilities?.atomicBatch?.status === 'ready'
            
            hasSmartAccountCapabilities = atomicSupported || atomicBatchSupported
            
            console.log('🦊 MetaMask smart account detection:', {
              chainId,
              atomicSupported,
              atomicStatus: chainCapabilities?.atomic?.status,
              atomicBatchSupported,
              atomicBatchStatus: chainCapabilities?.atomicBatch?.status,
              allCapabilities: chainCapabilities
            })
          } catch (capError) {
            console.log('⚠️ wallet_getCapabilities not supported or failed:', capError)
          }
        }
        
        // Additional MetaMask smart account detection
        const isMetaMask = provider?.isMetaMask === true
        const metamaskVersion = provider?._metamask?.version
        
        console.log('🦊 MetaMask detection:', {
          isMetaMask,
          metamaskVersion,
          hasSmartAccountCapabilities,
          capabilities,
          provider: provider ? Object.keys(provider).filter(k => !k.startsWith('_')) : null
        })
        
        const isPorto = isPortoConnector || hasPortoProvider
        
        console.log('🔍 Wallet detection summary:', {
          isPorto,
          isPortoConnector,
          hasPortoProvider,
          isMetaMask,
          hasSmartAccountCapabilities,
          connectorName: connector?.name,
          address
        })
        
        if (isPorto) {
          setIsPortoWallet(true)
          // Notify the state machine about Porto detection
          send({ type: 'PORTO_DETECTED', isPorto: true })
        } else if (hasSmartAccountCapabilities) {
          // Notify the state machine about MetaMask smart account
          send({ type: 'METAMASK_SMART_ACCOUNT_DETECTED', isSmartAccount: true })
        }
      } catch (err) {
        console.log('Wallet detection error:', err)
      }
    }
    
    checkWalletCapabilities()
  }, [address, connector, send])
  
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
          {/* Show Porto session indicator if using Porto */}
          {state.context.portoSessionId && <PortoKaraokeIndicator />}
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
                  const existingTables = await checkUserTables()
                  
                  const result = await karaokeDataPipeline.handleSaveProgress(
                    address,
                    !!existingTables
                  )
                  
                  if (result.tablelandCreated) {
                    console.log('✅ Tableland tables were created for the first time')
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
              <motion.div 
                className="flex items-center justify-between mb-4"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.5 }}
              >
                <p className="text-xl text-neutral-200">{song.artist}</p>
                {song.words_per_second && song.words_in_top_1k !== undefined && (
                  <p className="text-xl text-neutral-200">
                    {song.words_per_second} WPS   {song.words_in_top_1k} Words in Top 1k
                  </p>
                )}
              </motion.div>
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
        
        {/* Test V0.3.0 Contract - Remove this after testing */}
        <div className="w-full max-w-4xl mx-auto px-4 py-4">
          <TestV030Contract />
        </div>
        
        {/* Lyrics section */}
        <div className="w-full max-w-4xl mx-auto px-4 py-8">
          {isPurchased ? (
            <>
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
                {lyrics.map((line, index) => {
                  const hasTranslations = song.translations && Object.keys(song.translations).length > 0;
                  
                  return hasTranslations ? (
                    <TranslationSlider
                      key={index}
                      lyricLine={line}
                      onGenerate={async (type) => {
                        console.log(`🌐 Getting ${type} for line ${index}: ${line}`);
                        
                        if (type === 'translation') {
                          // If translations not loaded yet, fetch them now (one-time signature)
                          if (!hasLoadedTranslations && song.translations && Object.keys(song.translations).length > 0) {
                            try {
                              setTranslationsLoading(true);
                              console.log('🔓 First translation click - fetching all translations...');
                              
                              if (!translationServiceRef.current) {
                                translationServiceRef.current = new TranslationService();
                              }
                              
                              // Use existing session sigs if available
                              const sessionSigs = state.context.sessionSigs;
                              
                              const allTranslations = await translationServiceRef.current.fetchAndCacheAllTranslations(
                                song.id,
                                song.translations,
                                sessionSigs
                              );
                              
                              setTranslations(allTranslations);
                              setHasLoadedTranslations(true);
                              setTranslationsLoading(false);
                              console.log('✅ All translations loaded and cached:', allTranslations);
                              
                              // Now that we have translations, return the appropriate one
                              if (userLanguage !== 'en' && allTranslations[userLanguage] && allTranslations[userLanguage][index]) {
                                return allTranslations[userLanguage][index];
                              }
                              
                              // For English users, show all translations
                              if (userLanguage === 'en') {
                                const lineTranslations: string[] = [];
                                if (allTranslations.zh && allTranslations.zh[index]) {
                                  lineTranslations.push(`Chinese: ${allTranslations.zh[index]}`);
                                }
                                if (allTranslations.ug && allTranslations.ug[index]) {
                                  lineTranslations.push(`Uyghur: ${allTranslations.ug[index]}`);
                                }
                                if (allTranslations.bo && allTranslations.bo[index]) {
                                  lineTranslations.push(`Tibetan: ${allTranslations.bo[index]}`);
                                }
                                return lineTranslations.join('\n\n') || 'No translations available for this line';
                              }
                              
                              return 'No translation available for this line';
                            } catch (err) {
                              console.error('Failed to load translations:', err);
                              setTranslationsLoading(false);
                              return 'Failed to load translations';
                            }
                          }
                          
                          // Return translation for user's language only
                          if (userLanguage !== 'en' && translations[userLanguage] && translations[userLanguage][index]) {
                            return translations[userLanguage][index];
                          }
                          
                          // If user's language is English or no translation available, show all
                          if (userLanguage === 'en') {
                            const availableTranslations: string[] = [];
                            
                            if (translations.zh && translations.zh[index]) {
                              availableTranslations.push(`Chinese: ${translations.zh[index]}`);
                            }
                            if (translations.ug && translations.ug[index]) {
                              availableTranslations.push(`Uyghur: ${translations.ug[index]}`);
                            }
                            if (translations.bo && translations.bo[index]) {
                              availableTranslations.push(`Tibetan: ${translations.bo[index]}`);
                            }
                            
                            if (availableTranslations.length === 0 && translationsLoading) {
                              return 'Loading translations...';
                            }
                            
                            return availableTranslations.join('\n\n') || 'No translations available for this line';
                          }
                          
                          if (translationsLoading) {
                            return 'Loading translations...';
                          }
                          
                          return 'No translation available for this line';
                        }
                        
                        // For meaning and grammar, we'd need to implement AI generation
                        return `${type} analysis coming soon...`;
                      }}
                    >
                      <div onClick={() => console.log(`🖱️ Clicked on line ${index}: "${line}"`)}>
                        <LyricLine text={line} />
                      </div>
                    </TranslationSlider>
                  ) : (
                    <div onClick={() => console.log(`🖱️ Clicked on line ${index} (no translations): "${line}"`)}>
                      <LyricLine key={index} text={line} />
                    </div>
                  )
                })}
              </motion.div>
              {lyrics.length === 0 && (
                <div className="text-neutral-400 text-center">Loading lyrics...</div>
              )}
            </>
          ) : (
            <div className="text-center py-16">
              <div className="text-neutral-400 mb-4">
                Purchase this song to view lyrics
              </div>
              <div className="text-sm text-neutral-500">
                Unlock with song credits or direct purchase
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Bottom action bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-neutral-800/80 backdrop-blur-lg border-t border-neutral-700">
        <div className="container mx-auto px-4 py-4">
          {!isConnected ? (
            <ConnectWalletSheet
              connectors={connectors}
              onConnect={(connector) => {
                console.log('🔌 Connecting with:', connector.name)
                connect({ connector })
              }}
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
            <>
              {/* Show MetaMask status if connected and using MetaMask */}
              {isConnected && !isPortoWallet && state.context.isMetaMaskSmartAccount && (
                <div className="mb-4">
                  <div className="bg-purple-900/20 rounded-lg p-4 border border-purple-800/30">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" />
                      <span className="text-sm font-medium text-purple-300">
                        MetaMask Smart Account Detected
                      </span>
                    </div>
                    <p className="text-xs text-purple-400">
                      Your purchase will include automatic session setup for gasless karaoke!
                    </p>
                  </div>
                </div>
              )}
              
              {/* Show upgrade prompt if using regular MetaMask */}
              {isConnected && !isPortoWallet && !state.context.isMetaMaskSmartAccount && (
                <div className="mb-4">
                  <MetaMaskIntegrationStatus />
                </div>
              )}
              
              {isPortoWallet && (
                <div className="space-y-2">
                  <div className="text-center text-sm text-purple-400">
                    ✨ Porto wallet detected
                  </div>
                  <PortoPurchaseButton
                    songId={song.id}
                    isNewUser={!hasExistingPurchases}
                    sessionSigs={state.context.sessionSigs}
                    onSuccess={(sessionId) => {
                      console.log('Porto purchase successful, session:', sessionId)
                      checkAccess()
                    }}
                    onError={(error) => {
                      console.error('Porto purchase failed:', error)
                    }}
                  />
                  <div className="text-center text-xs text-neutral-500">
                    Note: Porto integration is still in development
                  </div>
                </div>
              )}
              {!isPortoWallet && (
                <AdaptivePurchaseSlider
                  onPurchaseCombo={() => {
                    console.log('🔵 Purchase combo clicked, context:', {
                      isMetaMaskSmartAccount: state.context.isMetaMaskSmartAccount,
                      isPortoWallet: state.context.isPortoWallet,
                      currentState: state.value
                    });
                    buttonState.action?.();
                  }}
                  onPurchaseSongs={() => {
                    console.log('🔵 Purchase songs clicked, context:', {
                      isMetaMaskSmartAccount: state.context.isMetaMaskSmartAccount,
                      isPortoWallet: state.context.isPortoWallet,
                      currentState: state.value
                    });
                    buttonState.action?.();
                  }}
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
                    onClick={() => {
                      console.log('🔵 Purchase button clicked directly, context:', {
                        isMetaMaskSmartAccount: state.context.isMetaMaskSmartAccount,
                        isPortoWallet: state.context.isPortoWallet,
                        currentState: state.value
                      });
                    }}
                  >
                    {buttonState.text}
                  </Button>
                </AdaptivePurchaseSlider>
              )}
            </>
          ) : buttonState.text === 'Download' ? (
            <Button 
              className="w-full" 
              size="lg"
              onClick={() => buttonState.action?.()}
              disabled={buttonState.disabled}
            >
              {buttonState.disabled ? 'Decrypting...' : 'Download'}
            </Button>
          ) : isMetaMaskSessionActive ? (
            <div className="space-y-4">
              <div className="bg-purple-900/20 rounded-lg p-4 border border-purple-800/30">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" />
                  <span className="text-sm font-medium text-purple-300">
                    Gasless Session Active
                  </span>
                </div>
                <p className="text-xs text-purple-400">
                  Your karaoke will be gasless - no transaction popups!
                </p>
              </div>
              <Button 
                className="w-full" 
                size="lg"
                onClick={() => buttonState.action?.()}
                disabled={buttonState.disabled}
              >
                {buttonState.text}
              </Button>
            </div>
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