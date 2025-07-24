import React from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import i18n from './i18n/config' // Initialize i18n
import './index.css'
import { SpinnerWithScarlett } from './components/ui/spinner-with-scarlett'
import { WalletProvider } from './components/WalletProvider'

// Check if running as a Farcaster Mini App - ONLY via query param or path
const url = new URL(window.location.href)
const isMiniApp = url.pathname.startsWith('/mini') || url.searchParams.get('miniApp') === 'true'

// Dynamically import Farcaster SDK if running as Mini App
if (isMiniApp) {
  import('@farcaster/miniapp-sdk').then(({ sdk }) => {
    // Store SDK globally for use in components
    window.farcasterSDK = sdk
    console.log('🎯 Farcaster Mini App SDK loaded')
  }).catch(err => {
    console.error('Failed to load Farcaster SDK:', err)
  })
}

// Clear localStorage language cache for testing (remove this in production)
// localStorage.removeItem('i18nextLng')

// Version info for debugging - automatically pulled from package.json
const APP_VERSION = import.meta.env.VITE_APP_VERSION || 'development'
console.log(`📦 App Version: ${APP_VERSION}`)
console.log('🎯 Is Mini App:', isMiniApp)

// Log language detection info
console.log('🌐 Initial language detection:', {
  browserLanguage: navigator.language,
  browserLanguages: navigator.languages,
  detectedLanguage: i18n.language,
  availableLanguages: Object.keys(i18n.store.data),
  localStorageLanguage: localStorage.getItem('i18nextLng')
})

const queryClient = new QueryClient()

const root = createRoot(document.getElementById('root')!)
root.render(
  <React.Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-neutral-900"><SpinnerWithScarlett size="lg" /></div>}>
    <QueryClientProvider client={queryClient}>
      <WalletProvider isMiniApp={isMiniApp}>
        <App />
      </WalletProvider>
    </QueryClientProvider>
  </React.Suspense>
)