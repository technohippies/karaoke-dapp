import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { useWeb3Auth } from '@web3auth/modal/react'
import { useEffect } from 'react'

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
  
  // Wagmi hooks for both contexts (Web3Auth provides wagmi integration)
  const wagmiAccount = useAccount()
  const { connect: wagmiConnect, connectors } = useConnect()
  const { disconnect: wagmiDisconnect } = useDisconnect()
  
  // Web3Auth context for modal control
  const { web3Auth } = useWeb3Auth() || {}

  // Auto-connect for Farcaster Mini App
  useEffect(() => {
    if (miniApp && !wagmiAccount.isConnected && connectors.length > 0) {
      console.log('🔗 Auto-connecting Farcaster wallet...')
      wagmiConnect({ connector: connectors[0] })
    }
  }, [miniApp, wagmiAccount.isConnected, connectors, wagmiConnect])

  // Unified interface - Web3Auth uses wagmi under the hood
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
        // Regular app - trigger Web3Auth modal
        if (web3Auth) {
          try {
            await web3Auth.connect()
          } catch (error) {
            console.error('Web3Auth connection error:', error)
          }
        } else if (connectors.length > 0) {
          // Fallback to first wagmi connector
          wagmiConnect({ connector: connectors[0] })
        }
      }
    },
    disconnect: async () => {
      if (web3Auth && web3Auth.status === 'connected') {
        await web3Auth.logout()
      } else {
        wagmiDisconnect()
      }
    }
  }
}