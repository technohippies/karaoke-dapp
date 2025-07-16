import React from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Web3AuthProvider } from '@web3auth/modal/react'
import { WagmiProvider } from '@web3auth/modal/react/wagmi'
import web3AuthContextConfig from './config/web3auth.config'
import App from './App'
import './i18n' // Initialize i18n
import './index.css'

const queryClient = new QueryClient()

const root = createRoot(document.getElementById('root')!)
root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <Web3AuthProvider config={web3AuthContextConfig}>
        <WagmiProvider>
          <App />
        </WagmiProvider>
      </Web3AuthProvider>
    </QueryClientProvider>
  </React.StrictMode>
)