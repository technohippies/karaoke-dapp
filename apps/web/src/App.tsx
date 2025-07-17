import { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, useParams } from 'react-router-dom'
import { litProtocolService } from './lib/litProtocol'
import { HomePage } from './pages/HomePage'
import { SongPage } from './pages/SongPage'
import { PricingPage } from './pages/PricingPage'
import { StudyPageV2 } from './pages/StudyPageV2'
import { AccountPage } from './pages/AccountPage'
import { DebugIDB } from './pages/DebugIDB'
import { IDBProvider } from './contexts/IDBContext'

// Helper component to redirect from old song URLs
function SongRedirect() {
  const { songId } = useParams()
  return <Navigate to={`/s/${songId}`} replace />
}

// Wildcard capacity delegation auth sig - works for ANY wallet address
const CAPACITY_DELEGATION_AUTH_SIG = {
  sig: "0xc4100824146920b590969df03a40c879d667307c8ef04897d183509a552f00865984d0562a36a26df40b806b72167321a5bb3492f49bae6e5917ea55bbd7a2421b",
  derivedVia: "web3.eth.personal.sign",
  signedMessage: "localhost wants you to sign in with your Ethereum account:\n0x0C6433789d14050aF47198B2751f6689731Ca79C\n\nThis is a test statement.  You can put anything you want here. I further authorize the stated URI to perform the following actions on my behalf: (1) 'Auth': 'Auth' for 'lit-ratelimitincrease://235258'.\n\nURI: lit:capability:delegation\nVersion: 1\nChain ID: 1\nNonce: 0x407060c7d34ab59697984f6a9048844d2633219e43823b6649a3f4c0df6c05c7\nIssued At: 2025-07-13T09:38:48.199Z\nExpiration Time: 2025-07-20T09:38:48.194Z\nResources:\n- urn:recap:eyJhdHQiOnsibGl0LXJhdGVsaW1pdGluY3JlYXNlOi8vMjM1MjU4Ijp7IkF1dGgvQXV0aCI6W3sibmZ0X2lkIjpbIjIzNTI1OCJdLCJ1c2VzIjoiMTAwMDAifV19fSwicHJmIjpbXX0",
  address: "0x0C6433789d14050aF47198B2751f6689731Ca79C"
}

function App() {
  // Initialize Lit Protocol on mount
  useEffect(() => {
    const initLit = async () => {
      try {
        // Don't use capacity delegation with datil-dev
        // litProtocolService.setCapacityDelegation(CAPACITY_DELEGATION_AUTH_SIG)
        await litProtocolService.connect()
        console.log('Lit Protocol connected')
      } catch (error) {
        console.error('Failed to connect to Lit Protocol:', error)
      }
    }
    
    initLit()
    
    return () => {
      litProtocolService.disconnect()
    }
  }, [])

  return (
    <IDBProvider>
      <Router>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/study" element={<StudyPageV2 />} />
          <Route path="/account" element={<AccountPage />} />
          <Route path="/debug" element={<DebugIDB />} />
          <Route path="/s/:songId" element={<SongPage />} />
          {/* Redirect old song URLs to new format */}
          <Route path="/song/:songId" element={<SongRedirect />} />
          {/* Catch all - redirect to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </IDBProvider>
  )
}

export default App