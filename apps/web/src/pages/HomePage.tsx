import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAccount } from 'wagmi'
import { tablelandService, type Song } from '../services/tableland'
import { Header } from '../components/Header'
import { ListItem } from '../components/ListItem'
import { StudyStats } from '../components/StudyStats'

export function HomePage() {
  const [songs, setSongs] = useState<Song[]>([])
  const [loading, setLoading] = useState(true)
  const { isConnected, address } = useAccount()

  useEffect(() => {
    loadSongs()
  }, [])

  const loadSongs = async () => {
    try {
      const songsData = await tablelandService.getSongs()
      setSongs(songsData)
    } catch (error) {
      console.error('Failed to load songs:', error)
    } finally {
      setLoading(false)
    }
  }

  // Get artwork URL from song - use Genius images constructed from artwork_hash
  const getArtworkUrl = (song: Song) => {
    if (song.song_art_image_thumbnail_url) {
      return song.song_art_image_thumbnail_url
    }
    if (song.song_art_image_url) {
      return song.song_art_image_url
    }
    if (song.artwork_hash?.id && song.artwork_hash?.ext && song.artwork_hash?.sizes) {
      // Use thumbnail format for homepage
      const size = song.artwork_hash.sizes.t || '300x300x1'
      return `https://images.genius.com/${song.artwork_hash.id}.${size}.${song.artwork_hash.ext}`
    }
    return null
  }

  const handleLogin = () => {
    // Handle wallet connection logic
    console.log('Connect wallet clicked')
  }

  const handleAccount = () => {
    // Handle account page navigation
    console.log('Account clicked')
  }

  return (
    <div className="min-h-screen bg-neutral-900">
      <Header 
        isLoggedIn={isConnected}
        address={address}
        onLogin={handleLogin}
        onAccount={handleAccount}
        crownCount={0}
        fireCount={0}
      />
      <div className="w-full max-w-2xl mx-auto px-6 py-8">
        <StudyStats
          newCount={15}
          learningCount={8}
          dueCount={23}
          onStudy={() => console.log('Study clicked')}
        />
        
        <h1 className="text-2xl font-bold text-white mb-6 mt-8">Songs</h1>
        
        {loading ? (
          <div className="text-center text-white">Loading songs...</div>
        ) : songs.length === 0 ? (
          <div className="text-center text-neutral-400">No songs available</div>
        ) : (
          <div className="space-y-3">
            {songs.map((song) => (
              <Link key={song.id} to={`/s/${song.id}`} className="block">
                <ListItem showChevron thumbnail={getArtworkUrl(song) || undefined}>
                  <div>
                    <div className="font-semibold text-white">{song.title}</div>
                    <div className="text-neutral-400 text-sm">{song.artist}</div>
                  </div>
                </ListItem>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}