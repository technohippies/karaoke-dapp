import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { HomePage } from './pages/homepage'
import { SongDetailPage } from './pages/song-detail'
import { KaraokePage } from './pages/karaoke'

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        
        {/* Song routes with nice slugs */}
        <Route path="/song/:songSlug" element={<SongDetailPage />} />
        <Route path="/s/:songId/:songSlug?" element={<SongDetailPage />} />
        
        {/* Karaoke routes */}
        <Route path="/karaoke/:songSlug" element={<KaraokePage />} />
        <Route path="/k/:songId/:songSlug?" element={<KaraokePage />} />
        
        {/* Future routes */}
        <Route path="/account" element={<div>Account page coming soon</div>} />
        <Route path="/search" element={<div>Search page coming soon</div>} />
        <Route path="/leaderboard" element={<div>Leaderboard coming soon</div>} />
      </Routes>
    </Router>
  )
}