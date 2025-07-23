import { ConnectButton } from '@rainbow-me/rainbowkit'
import './ConnectWallet.css'

export function ConnectWallet() {
  return (
    <div className="connect-wallet">
      <h2>Welcome to Karaoke Quest!</h2>
      <p>Connect your wallet to get started</p>
      
      <div className="wallet-options">
        <ConnectButton />
      </div>
    </div>
  )
}