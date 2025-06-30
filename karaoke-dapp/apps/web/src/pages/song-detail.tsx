import { useEffect, useState } from "react"
import { Header, LyricLine, Button, PurchaseSlider, ConnectWalletSheet } from "@karaoke-dapp/ui"
import { useParams } from "react-router-dom"
import { DatabaseService, type Song } from "@karaoke-dapp/services/browser"
import { motion } from "motion/react"
import { useSongMachine } from "../machines"
import { useAccount, useConnect } from "wagmi"
import { LyricsService } from "../services/lyrics.service"


function SongDetailContent({ song }: { song: Song }) {
  const { isConnected } = useAccount()
  const { connectors, connect, status, error: connectError } = useConnect()
  const [lyrics, setLyrics] = useState<string[]>([])
  
  // Now we have the actual songId from the database
  const {
    checkAccess,
    getButtonState,
    isCheckingAccess,
    error: machineError
  } = useSongMachine(song.id)
  
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
        
        if (lyricsData && lyricsData.plainLyrics) {
          setLyrics(lyricsData.plainLyrics.split('\n').filter(line => line.trim()))
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
  
  const handleAccountClick = () => {
    // Account functionality
  }
  
  const buttonState = getButtonState()
  
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
    // Account functionality
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

  return <SongDetailContent song={songData} />
}