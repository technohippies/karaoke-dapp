import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { wagmiConfig } from './wagmi'
import { HomePage } from './pages/homepage'
import { SongDetailPage } from './pages/song-detail'
import { KaraokePage } from './pages/karaoke'
import AccountPage from './pages/account'
import { ProgressPage } from './pages/progress'
import { useEffect } from 'react'
import { karaokeDataPipeline } from '@karaoke-dapp/services'

const queryClient = new QueryClient()

export default function App() {
  // Initialize data pipeline on app startup
  useEffect(() => {
    karaokeDataPipeline.initialize()
      .then(() => console.log('✅ Karaoke data pipeline initialized'))
      .catch(error => console.error('❌ Failed to initialize data pipeline:', error))
  }, [])
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        
        {/* Song routes: /artist/song */}
        <Route path="/:artist/:song" element={<SongDetailPage />} />
        <Route path="/:artist/:song/karaoke" element={<KaraokePage />} />
        
        {/* Future routes */}
        <Route path="/account" element={<AccountPage />} />
        <Route path="/progress" element={<ProgressPage />} />
        <Route path="/search" element={<div>Search page coming soon</div>} />
        <Route path="/leaderboard" element={<div>Leaderboard coming soon</div>} />
      </Routes>
        </Router>
      </QueryClientProvider>
    </WagmiProvider>
  )
}