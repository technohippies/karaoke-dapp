import { ReactNode } from 'react'
import { Web3AuthProvider } from '@web3auth/modal/react'
import { WagmiProvider } from '@web3auth/modal/react/wagmi'
import { WagmiProvider as WagmiProviderStandalone } from 'wagmi'
import web3AuthContextConfig from '../config/web3auth.config'
import { farcasterWagmiConfig } from '../config/wagmi-farcaster.config'

interface WalletProviderProps {
  children: ReactNode
  isMiniApp: boolean
}

export function WalletProvider({ children, isMiniApp }: WalletProviderProps) {
  if (isMiniApp) {
    return (
      <WagmiProviderStandalone config={farcasterWagmiConfig}>
        {children}
      </WagmiProviderStandalone>
    )
  }

  return (
    <Web3AuthProvider config={web3AuthContextConfig}>
      <WagmiProvider>
        {children}
      </WagmiProvider>
    </Web3AuthProvider>
  )
}