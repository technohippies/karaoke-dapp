import { useEffect, useState } from "react"
import { Header, LyricLine, LyricSheet } from "@karaoke-dapp/ui"
import { useNavigate, useParams } from "react-router-dom"
import { DatabaseService, type Song } from "@karaoke-dapp/services/browser"
import { motion } from "motion/react"

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
  const [song, setSong] = useState<Song | null>(null)
  const [lyrics, setLyrics] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const dbService = new DatabaseService()
  
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
    <div className="min-h-screen bg-neutral-900 text-white">
      <Header onAccountClick={handleAccountClick} />
      
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
  )
}