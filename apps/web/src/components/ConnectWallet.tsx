import { useWalletAuth } from '../hooks/useWalletAuth'
import { Button } from './ui/button'
import './ConnectWallet.css'

export function ConnectWallet() {
  const { connect, isConnected, isConnecting } = useWalletAuth()
  
  return (
    <div className="connect-wallet">
      <h2>Welcome to Karaoke Quest!</h2>
      <p>Connect your wallet to get started</p>
      
      <div className="wallet-options">
        <Button
          onClick={() => connect()}
          variant="outline"
          disabled={isConnecting || isConnected}
        >
          {isConnecting ? 'Connecting...' : 'Connect Wallet'}
        </Button>
        
        {isConnected && (
          <p className="success-message">Connected successfully!</p>
        )}
      </div>
    </div>
  )
}