import { useConnect } from 'wagmi'
import './ConnectWallet.css'

export function ConnectWallet() {
  const { connectors, connect } = useConnect()
  
  return (
    <div className="connect-wallet">
      <h2>Welcome to Karaoke Turbo!</h2>
      <p>Connect your wallet to get started</p>
      
      <div className="wallet-options">
        {connectors.map((connector) => (
          <button
            key={connector.id}
            onClick={() => connect({ connector })}
            className="wallet-button"
          >
            Connect with {connector.name}
          </button>
        ))}
      </div>
    </div>
  )
}