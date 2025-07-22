import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { useEffect } from 'react'

// Check if we're in a Farcaster Mini App context
export const isMiniApp = () => {
  if (typeof window === 'undefined') return false
  
  const url = new URL(window.location.href)
  return (
    url.searchParams.get('miniApp') === 'true' ||
    window.location.hostname === 'karaoke.school' ||
    window.location.hostname === 'karaokeschool.school'
  )
}

export function useWalletAuth() {
  // Always use wagmi hooks - they work in both contexts
  const wagmiAccount = useAccount()
  const { connect: wagmiConnect, connectors } = useConnect()
  const { disconnect: wagmiDisconnect } = useDisconnect()

  // Auto-connect for Farcaster Mini App
  useEffect(() => {
    if (isMiniApp() && !wagmiAccount.isConnected && connectors.length > 0) {
      console.log('🔗 Auto-connecting Farcaster wallet...')
      wagmiConnect({ connector: connectors[0] })
    }
  }, [wagmiAccount.isConnected, connectors, wagmiConnect])

  // Unified interface
  return {
    address: wagmiAccount.address,
    isConnected: wagmiAccount.isConnected,
    isConnecting: wagmiAccount.isConnecting,
    isDisconnecting: false,
    userInfo: null,
    connect: () => {
      if (connectors.length > 0) {
        wagmiConnect({ connector: connectors[0] })
      }
    },
    disconnect: wagmiDisconnect
  }
}