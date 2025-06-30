import { Header, MediaRow, Button } from "@karaoke-dapp/ui"
import { Disc } from "@phosphor-icons/react"
import { useNavigate } from "react-router-dom"
import { useEffect, useState } from "react"
import { DatabaseService, type Song } from "@karaoke-dapp/services/browser"
import { useAccount } from "wagmi"

export function HomePage() {
  const navigate = useNavigate()
  const { address, isConnected } = useAccount()
  const [songs, setSongs] = useState<Song[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const dbService = new DatabaseService()
  
  useEffect(() => {
    async function fetchSongs() {
      try {
        setLoading(true)
        const fetchedSongs = await dbService.getSongs()
        setSongs(fetchedSongs)
        setError(null)
      } catch (err) {
        console.error('Failed to fetch songs:', err)
        setError('Failed to load songs')
      } finally {
        setLoading(false)
      }
    }
    
    fetchSongs()
  }, [])
  
  const handleAccountClick = () => {
    navigate('/account')
  }
  
  const handleSongClick = (song: Song) => {
    // Use artist/song URL structure
    const artistSlug = song.artist.toLowerCase().replace(/\s+/g, '-')
    const songSlug = song.title.toLowerCase().replace(/\s+/g, '-')
    navigate(`/${artistSlug}/${songSlug}`)
  }
  
  return (
    <div className="min-h-screen bg-neutral-900">
      <Header 
        onAccountClick={handleAccountClick} 
        isConnected={isConnected}
        address={address}
      />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 to-pink-900/20" />
        <div className="relative w-full max-w-4xl mx-auto px-4 py-20">
          <div className="text-center space-y-6">
            <h1 className="text-5xl md:text-6xl font-bold text-white">
              Sing. Learn. Earn.
            </h1>
            <p className="text-xl text-neutral-300">
              Master languages through karaoke with AI-powered feedback
            </p>
          </div>
        </div>
      </section>
      
      {/* Song List */}
      <section className="w-full max-w-4xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold text-white mb-6">Available Songs</h2>
        
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center gap-2 text-neutral-400">
              <Disc className="animate-spin" size={20} />
              <span>Loading songs...</span>
            </div>
          </div>
        )}
        
        {error && (
          <div className="text-center py-12">
            <p className="text-red-400 mb-4">{error}</p>
            <Button 
              variant="secondary" 
              onClick={() => window.location.reload()}
            >
              Try Again
            </Button>
          </div>
        )}
        
        {!loading && !error && songs.length === 0 && (
          <div className="text-center py-12">
            <p className="text-neutral-400">No songs available yet.</p>
          </div>
        )}
        
        {!loading && !error && songs.length > 0 && (
          <>
            <div className="space-y-2">
              {songs.map((song) => (
                <MediaRow
                  key={song.id}
                  title={song.title}
                  subtitle={song.artist}
                  image={dbService.getArtworkUrl(song)}
                  onClick={() => handleSongClick(song)}
                />
              ))}
            </div>
            
            {songs.length > 6 && (
              <div className="mt-8 text-center">
                <Button variant="secondary">
                  View All Songs
                </Button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  )
}