import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { tablelandService, type Song } from '../services/tableland'
import { useKaraokeMachineContext } from '../contexts/KaraokeMachineContext'
import { Header } from '../components/Header'
import { ConnectWallet } from '../components/ConnectWallet'
import { CreditPurchase } from '../components/CreditPurchase'
import { KaraokeSession } from '../components/KaraokeSession'

export function SongPage() {
  const { songId } = useParams<{ songId: string }>()
  const navigate = useNavigate()
  const { state, context, send } = useKaraokeMachineContext()
  const [song, setSong] = useState<Song | null>(null)
  const [loading, setLoading] = useState(true)
  
  // Debug logging - removed to reduce noise

  useEffect(() => {
    if (!songId) {
      navigate('/')
      return
    }
    loadSong(parseInt(songId))
  }, [songId, navigate])

  // Auto-select song when loaded and in selectSong state (only if no active session)
  useEffect(() => {
    if (song && state.matches('selectSong') && !context.hasActiveSession) {
      console.log('🎵 Auto-selecting song:', song.title, 'Current state:', state.value)
      send({ type: 'SELECT_SONG', song })
    }
  }, [song, state.value, send, context.hasActiveSession])

  const loadSong = async (id: number) => {
    try {
      const songData = await tablelandService.getSongById(id)
      if (!songData) {
        navigate('/')
        return
      }
      setSong(songData)
    } catch (error) {
      console.error('Failed to load song:', error)
      navigate('/')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-pink-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading song...</div>
      </div>
    )
  }

  if (!song) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-pink-900">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <button
          onClick={() => navigate('/')}
          className="mb-6 text-gray-300 hover:text-white transition-colors"
        >
          ← Back
        </button>

        <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-8">
          <h1 className="text-4xl font-bold text-white mb-2">{song.title}</h1>
          <p className="text-2xl text-gray-300 mb-4">{song.artist}</p>
          <p className="text-gray-400 mb-6">
            Duration: {Math.floor(song.duration / 60)}:{(song.duration % 60).toString().padStart(2, '0')}
          </p>

          {/* State Machine UI */}
          {state.matches('disconnected') && (
            <ConnectWallet />
          )}
          
          {state.matches('connecting') && (
            <div className="text-white">Connecting wallet...</div>
          )}
          
          {state.matches('loadingData') && (
            <div className="text-white">Loading your data...</div>
          )}
          
          {(state.matches('signup') || state.matches('buyCredits')) && (
            <CreditPurchase />
          )}
          
          {state.matches('approvingUsdc') && (
            <div className="text-white">Approving USDC...</div>
          )}
          
          {state.matches('buyingCredits') && (
            <div className="text-white">Purchasing credits...</div>
          )}
          
          {state.matches('selectSong') && (
            <div className="text-white">
              {context.songCredits === 0 ? (
                <div>
                  <p className="mb-4">You need song credits to unlock this song.</p>
                  <button
                    onClick={() => send({ type: 'BUY_CREDITS' })}
                    style={{ background: '#10b981', color: 'white', padding: '0.5rem 1rem', borderRadius: '0.25rem', border: 'none' }}
                  >
                    Buy Credits (3 USDC)
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    send({ type: 'SELECT_SONG', song })
                    send({ type: 'UNLOCK_SONG', songId: parseInt(songId!) })
                  }}
                  style={{ background: '#3b82f6', color: 'white', padding: '0.5rem 1rem', borderRadius: '0.25rem', border: 'none' }}
                >
                  Unlock Song (1 Credit)
                </button>
              )}
            </div>
          )}
          
          {state.matches('unlockingSong') && (
            <div className="text-white">Unlocking song...</div>
          )}
          
          {(state.matches('karaoke') || state.matches({ karaoke: 'recording' }) || state.matches({ karaoke: 'idle' })) && (
            <KaraokeSession />
          )}
          
          {context.error && (
            <div style={{ color: '#f87171', marginTop: '1rem' }}>
              Error: {context.error}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}