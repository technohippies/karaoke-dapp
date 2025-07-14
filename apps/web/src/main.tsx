import React from 'react'
import { createRoot } from 'react-dom/client'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { wagmiConfig } from './wagmiConfig'
import { KaraokeMachineProvider } from './contexts/KaraokeMachineContext'
import App from './App'
import './index.css'

const queryClient = new QueryClient()

const root = createRoot(document.getElementById('root')!)
root.render(
  <React.StrictMode>
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <KaraokeMachineProvider>
          <App />
        </KaraokeMachineProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </React.StrictMode>
)