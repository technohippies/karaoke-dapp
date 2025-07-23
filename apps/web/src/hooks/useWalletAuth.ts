import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { useEffect } from 'react'
import { useConnectModal } from '@rainbow-me/rainbowkit'

// Check if we're in a Farcaster Mini App context
export const isMiniApp = () => {
  if (typeof window === 'undefined') return false
  
  const url = new URL(window.location.href)
  return (
    url.searchParams.get('miniApp') === 'true' ||
    url.pathname.startsWith('/mini')
  )
}

export function useWalletAuth() {
  const miniApp = isMiniApp()
  
  // Wagmi hooks for all contexts
  const wagmiAccount = useAccount()
  const { connect: wagmiConnect, connectors } = useConnect()
  const { disconnect: wagmiDisconnect } = useDisconnect()
  
  // RainbowKit modal hook for non-mini app context
  const { openConnectModal } = useConnectModal()

  // Auto-connect for Farcaster Mini App
  useEffect(() => {
    if (miniApp && !wagmiAccount.isConnected && connectors.length > 0) {
      console.log('🔗 Auto-connecting Farcaster wallet...')
      wagmiConnect({ connector: connectors[0] })
    }
  }, [miniApp, wagmiAccount.isConnected, connectors, wagmiConnect])

  // Unified interface
  return {
    address: wagmiAccount.address,
    isConnected: wagmiAccount.isConnected,
    isConnecting: wagmiAccount.isConnecting,
    isDisconnecting: false,
    userInfo: null,
    connect: async () => {
      if (miniApp) {
        // Farcaster mini app - use first connector
        if (connectors.length > 0) {
          wagmiConnect({ connector: connectors[0] })
        }
      } else {
        // Regular app - trigger RainbowKit modal
        if (openConnectModal) {
          openConnectModal()
        }
      }
    },
    disconnect: async () => {
      wagmiDisconnect()
    }
  }
}