import { useWeb3AuthConnect } from '@web3auth/modal/react'
import './ConnectWallet.css'

export function ConnectWallet() {
  const { connect, isConnected, connectorName, loading, error } = useWeb3AuthConnect()
  
  return (
    <div className="connect-wallet">
      <h2>Welcome to Karaoke Quest!</h2>
      <p>Connect to get started - use social login or your wallet</p>
      
      <div className="wallet-options">
        <button
          onClick={() => connect()}
          className="wallet-button"
          disabled={loading || isConnected}
        >
          {loading ? 'Connecting...' : 'Connect with Web3Auth'}
        </button>
        
        {error && (
          <p className="error-message">{error.message}</p>
        )}
        
        {isConnected && connectorName && (
          <p className="success-message">Connected via {connectorName}</p>
        )}
      </div>
    </div>
  )
}