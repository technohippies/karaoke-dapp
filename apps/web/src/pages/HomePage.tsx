import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAccount } from 'wagmi'
import { useTranslation } from 'react-i18next'
import { useWeb3AuthConnect } from '@web3auth/modal/react'
import { tablelandService, type Song } from '../services/database/tableland/TablelandReadService'
import { Header } from '../components/Header'
import { ListItem } from '../components/ListItem'
import { StudyStats } from '../components/StudyStats'
import { useDirectIDB } from '../hooks/useDirectIDB'

export function HomePage() {
  const [songs, setSongs] = useState<Song[]>([])
  const [loading, setLoading] = useState(true)
  const { isConnected, address } = useAccount()
  const navigate = useNavigate()
  const { getUserStats, isReady: isDBReady } = useDirectIDB()
  const [srsStats, setSrsStats] = useState({ new: 0, learning: 0, due: 0 })
  const { t, i18n } = useTranslation()
  const { connect } = useWeb3AuthConnect()
  
  // Log current language for debugging
  useEffect(() => {
    console.log('Current language:', i18n.language)
    console.log('Browser language:', navigator.language)
    console.log('Available languages:', i18n.languages)
    console.log('Translation test - Songs:', t('home.songs'))
    console.log('Translation test - NEW:', t('home.study.new'))
  }, [i18n.language, t])

  useEffect(() => {
    loadSongs()
    if (isDBReady && address) {
      loadSRSStats()
    }
  }, [address, isDBReady])
  
  const loadSRSStats = async () => {
    if (!address) return
    
    try {
      const stats = await getUserStats()
      console.log('🏠 HomePage SRS stats loaded:', stats)
      // Calculate new, learning, and due based on SRS states
      // State 0 = New, State 1 = Learning, State 2/3 = Review (due if due_date <= now)
      setSrsStats({
        new: stats.newCards || 0,
        learning: stats.learningCards || 0,
        due: stats.cardsToReview || 0
      })
    } catch (error) {
      console.error('Failed to load SRS stats:', error)
    }
  }

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

  const handleLogin = async () => {
    try {
      await connect()
    } catch (error) {
      console.error('Failed to connect wallet:', error)
    }
  }

  const handleAccount = () => {
    navigate('/account')
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
          newCount={srsStats.new}
          learningCount={srsStats.learning}
          dueCount={srsStats.due}
          onStudy={() => {
            if (srsStats.due > 0) {
              navigate('/study')
            }
          }}
        />
        
        <h1 className="text-2xl font-bold text-white mb-6 mt-8">{t('home.songs')}</h1>
        
        {loading ? (
          <div className="text-center text-white">{t('home.loadingSongs')}</div>
        ) : songs.length === 0 ? (
          <div className="text-center text-neutral-400">{t('home.noSongs')}</div>
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