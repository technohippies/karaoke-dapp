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
import { useStreak } from '../hooks/useStreak'
import { SpinnerWithScarlett } from '../components/ui/spinner-with-scarlett'
import scarlettWelcome from '../assets/scarlett-welcome.png'
import doctorsWithoutBorders from '../assets/doctors-without-borders.png'

export function HomePage() {
  const [songs, setSongs] = useState<Song[]>([])
  const [loading, setLoading] = useState(true)
  const { isConnected, address } = useAccount()
  const navigate = useNavigate()
  const { getUserStats, isReady: isDBReady } = useDirectIDB()
  const { currentStreak } = useStreak()
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
        fireCount={currentStreak}
      />
      
      {/* Hero Section */}
      <div className="w-full md:max-w-2xl md:mx-auto md:px-6 md:py-4">
        <div className="relative w-full md:rounded-lg overflow-hidden">
          {/* Aspect ratio container that maintains image proportions */}
          <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
            <div 
              className="absolute inset-0 bg-cover bg-center bg-no-repeat"
              style={{ backgroundImage: `url(${scarlettWelcome})` }}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-neutral-900/50 via-neutral-900/30 to-neutral-900" />
            <div className="absolute inset-0 flex items-center justify-center px-6">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white text-center drop-shadow-2xl">
                {t('home.heroTitle')}
              </h1>
            </div>
          </div>
        </div>
      </div>
      
      {/* Donation Banner */}
      <div className="bg-[#CC0000] py-3 overflow-hidden">
        <style>{`
          @keyframes bannerScroll {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
          .donation-slider {
            display: flex;
            animation: bannerScroll 30s linear infinite;
            width: fit-content;
          }
          .donation-item {
            display: flex;
            align-items: center;
            gap: 30px;
            padding: 0 30px;
            white-space: nowrap;
          }
        `}</style>
        <div className="donation-slider">
          {/* Create two sets for seamless loop */}
          {[...Array(2)].map((_, setIndex) => (
            [...Array(6)].map((_, i) => (
              <div key={`${setIndex}-${i}`} className="donation-item">
                <span className="text-sm font-semibold text-white tracking-wide">
                  {t('countryDialog.donationShort')}
                </span>
                <img 
                  src={doctorsWithoutBorders}
                  alt="Doctors Without Borders"
                  className="h-5 w-auto"
                />
              </div>
            ))
          )).flat()}
        </div>
      </div>
      
      <div className="w-full max-w-2xl mx-auto px-6 py-4 pb-20">
        <h1 className="text-2xl font-bold text-white mb-4">{t('home.songs')}</h1>
        
        {loading ? (
          <div className="flex justify-center">
            <SpinnerWithScarlett size="lg" />
          </div>
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
        
        <div className="mt-8">
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
        </div>
      </div>
    </div>
  )
}