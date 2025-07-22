import { useWalletAuth } from '../hooks/useWalletAuth'
import './ConnectWallet.css'

export function ConnectWallet() {
  const { connect, isConnected, isConnecting } = useWalletAuth()
  
  return (
    <div className="connect-wallet">
      <h2>Welcome to Karaoke Quest!</h2>
      <p>Connect to get started - use social login or your wallet</p>
      
      <div className="wallet-options">
        <button
          onClick={() => connect()}
          className="wallet-button"
          disabled={isConnecting || isConnected}
        >
          {isConnecting ? 'Connecting...' : 'Connect Wallet'}
        </button>
        
        {isConnected && (
          <p className="success-message">Connected successfully!</p>
        )}
      </div>
    </div>
  )
}