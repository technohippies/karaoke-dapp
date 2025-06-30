import { useEffect, useState } from "react"
import { Header, LyricLine, LyricSheet, Button, PurchaseSlider, DownloadSlider } from "@karaoke-dapp/ui"
import { useNavigate, useParams } from "react-router-dom"
import { DatabaseService, type Song } from "@karaoke-dapp/services/browser"
import { motion } from "motion/react"
import { useSongMachine } from "../machines"
import { useAccount } from "wagmi"

interface LRCLIBResponse {
  id: number
  trackName: string
  artistName: string
  albumName: string
  duration: number
  instrumental: boolean
  plainLyrics: string
  syncedLyrics: string
}

export function SongDetailPage() {
  const navigate = useNavigate()
  const { songId } = useParams()
  const { isConnected } = useAccount()
  const [song, setSong] = useState<Song | null>(null)
  const [lyrics, setLyrics] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const dbService = new DatabaseService()
  
  // Initialize the song state machine
  const {
    checkAccess,
    getButtonState,
    isCheckingAccess,
    error: machineError
  } = useSongMachine(songId ? parseInt(songId) : 0)
  
  useEffect(() => {
    async function loadSongAndLyrics() {
      if (!songId) return
      
      try {
        setLoading(true)
        
        // Load song data from Tableland
        const songData = await dbService.getSongById(parseInt(songId))
        if (!songData) {
          setError('Song not found')
          return
        }
        setSong(songData)
        
        // Fetch lyrics from LRCLIB
        const lyricsResponse = await fetch(
          `https://lrclib.net/api/get?track_name=${encodeURIComponent(songData.title)}&artist_name=${encodeURIComponent(songData.artist)}&duration=${songData.duration}`
        )
        
        if (lyricsResponse.ok) {
          const lyricsData: LRCLIBResponse = await lyricsResponse.json()
          // Split plain lyrics into lines and filter out empty lines
          const lyricsLines = lyricsData.plainLyrics
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0)
          setLyrics(lyricsLines)
        } else {
          setLyrics(['Lyrics not available'])
        }
        
      } catch (err) {
        console.error('Failed to load song or lyrics:', err)
        setError('Failed to load song data')
      } finally {
        setLoading(false)
      }
    }
    
    loadSongAndLyrics()
  }, [songId])
  
  // Check access when connected
  useEffect(() => {
    if (isConnected && songId) {
      checkAccess()
    }
  }, [isConnected, songId, checkAccess])
  
  const handleAccountClick = () => {
    navigate('/account')
  }
  
  const buttonState = getButtonState()
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

  if (error || !song) {
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
    <div className="min-h-screen bg-neutral-900 text-white flex flex-col">
      <Header onAccountClick={handleAccountClick} />
      
      {/* Main content area */}
      <div className="flex-1 pb-20">
        {/* Hero section with full-width background image */}
        <motion.div 
          className="relative w-full h-96 bg-cover bg-center"
          style={{
            backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.3), rgba(0,0,0,0.7)), url('${dbService.getArtworkUrl(song, 'f')}')`
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
              visible: {
                transition: {
                  staggerChildren: 0.1
                }
              }
            }}
          >
            {lyrics.map((line, index) => (
              <motion.div
                key={index}
                variants={{
                  hidden: { y: 20, opacity: 0 },
                  visible: { y: 0, opacity: 1 }
                }}
                transition={{ duration: 0.5 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <LyricSheet lyricText={line}>
                  <LyricLine
                    text={line}
                    className="text-base"
                  />
                </LyricSheet>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Sticky footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-neutral-900 border-t border-neutral-800 p-4">
        <div className="max-w-4xl mx-auto">
          {!isConnected ? (
            <Button 
              className="w-full" 
              size="lg"
              onClick={() => {
                // Trigger wallet connection
                navigate('/account')
              }}
            >
              Connect Wallet to Purchase
            </Button>
          ) : machineError ? (
            <div className="text-center text-red-400 mb-2">
              {machineError}
              <Button 
                className="w-full mt-2" 
                size="lg"
                onClick={() => buttonState.action?.()}
              >
                Retry
              </Button>
            </div>
          ) : buttonState.text === 'Purchase' ? (
            <PurchaseSlider
              songTitle={song.title}
              price={10}
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
            <DownloadSlider
              songTitle={song.title}
              onDownload={() => buttonState.action?.()}
              isDecrypting={buttonState.disabled}
            >
              <Button 
                className="w-full" 
                size="lg"
                variant="secondary"
                disabled={buttonState.disabled}
              >
                {buttonState.text}
              </Button>
            </DownloadSlider>
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