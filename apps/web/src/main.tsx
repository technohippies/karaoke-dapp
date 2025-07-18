import React from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Web3AuthProvider } from '@web3auth/modal/react'
import { WagmiProvider } from '@web3auth/modal/react/wagmi'
import web3AuthContextConfig from './config/web3auth.config'
import App from './App'
import i18n from './i18n' // Initialize i18n
import './index.css'
import { Spinner } from './components/ui/spinner'

// Clear localStorage language cache for testing (remove this in production)
// localStorage.removeItem('i18nextLng')

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
  <React.StrictMode>
    <React.Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-neutral-900"><Spinner size="lg" /></div>}>
      <QueryClientProvider client={queryClient}>
        <Web3AuthProvider config={web3AuthContextConfig}>
          <WagmiProvider>
            <App />
          </WagmiProvider>
        </Web3AuthProvider>
      </QueryClientProvider>
    </React.Suspense>
  </React.StrictMode>
)