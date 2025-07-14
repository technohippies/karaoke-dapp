import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { tablelandService, type Song } from '../services/tableland'
import { Header } from '../components/Header'

export function HomePage() {
  const [songs, setSongs] = useState<Song[]>([])
  const [loading, setLoading] = useState(true)

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-pink-900">
      <Header />
      <div className="container mx-auto px-4 py-8">
        
        {loading ? (
          <div className="text-center text-white">Loading songs...</div>
        ) : songs.length === 0 ? (
          <div className="text-center text-gray-400">No songs available</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {songs.map((song) => (
              <Link
                key={song.id}
                to={`/s/${song.id}`}
                className="block bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 hover:bg-gray-700/50 transition-all"
              >
                <h2 className="text-xl font-semibold text-white mb-1">{song.title}</h2>
                <p className="text-gray-400">{song.artist}</p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}