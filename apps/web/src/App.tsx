import { useEffect } from 'react'
import { useConnect } from 'wagmi'
import { litProtocolService } from './lib/litProtocol'
import { useKaraokeMachine } from './hooks/useKaraokeMachine'
import { ConnectWallet } from './components/ConnectWallet'
import { CreditPurchase } from './components/CreditPurchase'
import { SongSelection } from './components/SongSelection'
import { KaraokeSession } from './components/KaraokeSession'
import './App.css'

// Capacity delegation auth sig (from your .env or configuration)
const CAPACITY_DELEGATION_AUTH_SIG = {
  sig: "YOUR_DELEGATION_SIG",
  derivedVia: "web3.eth.personal.sign",
  signedMessage: "YOUR_SIGNED_MESSAGE",
  address: "YOUR_ADDRESS"
}

function App() {
  const { state, context } = useKaraokeMachine()
  const { connectors } = useConnect()
  
  // Initialize Lit Protocol on mount
  useEffect(() => {
    const initLit = async () => {
      try {
        await litProtocolService.connect()
        litProtocolService.setCapacityDelegation(CAPACITY_DELEGATION_AUTH_SIG)
        console.log('Lit Protocol connected')
      } catch (error) {
        console.error('Failed to connect to Lit Protocol:', error)
      }
    }
    
    initLit()
    
    return () => {
      litProtocolService.disconnect()
    }
  }, [])
  
  return (
    <div className="app">
      <header className="app-header">
        <h1>🎤 Karaoke Turbo</h1>
        <p>Powered by Lit Protocol PKP</p>
      </header>
      
      <main className="app-main">
        {state.matches('disconnected') && (
          <ConnectWallet />
        )}
        
        {state.matches('connecting') && (
          <div className="loading">
            <p>Connecting wallet...</p>
          </div>
        )}
        
        {state.matches('loadingData') && (
          <div className="loading">
            <p>Loading your data...</p>
          </div>
        )}
        
        {(state.matches('signup') || state.matches('buyCredits')) && (
          <CreditPurchase />
        )}
        
        {state.matches('approvingUsdc') && (
          <div className="loading">
            <p>Approving USDC...</p>
            {context.txHash && (
              <a 
                href={`https://sepolia.basescan.org/tx/${context.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                View transaction
              </a>
            )}
          </div>
        )}
        
        {state.matches('buyingCredits') && (
          <div className="loading">
            <p>Purchasing credits...</p>
            {context.txHash && (
              <a 
                href={`https://sepolia.basescan.org/tx/${context.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                View transaction
              </a>
            )}
          </div>
        )}
        
        {state.matches('selectSong') && (
          <SongSelection />
        )}
        
        {state.matches('unlockingSong') && (
          <div className="loading">
            <p>Unlocking song...</p>
            {context.txHash && (
              <a 
                href={`https://sepolia.basescan.org/tx/${context.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                View transaction
              </a>
            )}
          </div>
        )}
        
        {state.matches('karaoke') && (
          <KaraokeSession />
        )}
        
        {context.error && (
          <div className="error-banner">
            <p>Error: {context.error}</p>
            <button onClick={() => context.error = null}>Dismiss</button>
          </div>
        )}
      </main>
      
      <footer className="app-footer">
        {context.isConnected && (
          <div className="account-info">
            <p>Connected: {context.address?.slice(0, 6)}...{context.address?.slice(-4)}</p>
            <p>Voice Credits: {context.voiceCredits} | Song Credits: {context.songCredits}</p>
            <p>USDC Balance: ${context.usdcBalance}</p>
          </div>
        )}
      </footer>
    </div>
  )
}

export default App