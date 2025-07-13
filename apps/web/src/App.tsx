import { useEffect } from 'react'
import { useConnect } from 'wagmi'
import { litProtocolService } from './lib/litProtocol'
import { useKaraokeMachine } from './hooks/useKaraokeMachine'
import { ConnectWallet } from './components/ConnectWallet'
import { CreditPurchase } from './components/CreditPurchase'
import { SongSelection } from './components/SongSelection'
import { KaraokeSession } from './components/KaraokeSession'
import './App.css'

// Capacity delegation auth sig (from mint-capacity-credits output)
const CAPACITY_DELEGATION_AUTH_SIG = {
  sig: "0x84461c7b284521ee286df54e99c7d9adf603108774051ec9c3c4e0e83cd53434710e4bcfc819b1eb9170d442b283fa80dd71ddfd3008a427e914ee76cdc6ab3a1c",
  derivedVia: "web3.eth.personal.sign",
  signedMessage: "localhost wants you to sign in with your Ethereum account:\n0x0C6433789d14050aF47198B2751f6689731Ca79C\n\nThis is a test statement.  You can put anything you want here. I further authorize the stated URI to perform the following actions on my behalf: (1) 'Auth': 'Auth' for 'lit-ratelimitincrease://235258'.\n\nURI: lit:capability:delegation\nVersion: 1\nChain ID: 1\nNonce: 0x3b418e4eecd4f2a748edd3fbac2edc5a0c9d98e7f8703259b67e211a6a4aaa6f\nIssued At: 2025-07-12T17:13:39.744Z\nExpiration Time: 2025-07-19T00:00:00.000Z\nResources:\n- urn:recap:eyJhdHQiOnsibGl0LXJhdGVsaW1pdGluY3JlYXNlOi8vMjM1MjU4Ijp7IkF1dGgvQXV0aCI6W3siZGVsZWdhdGVfdG8iOltdLCJuZnRfaWQiOlsiMjM1MjU4Il0sInVzZXMiOiIxMDAwIn1dfX0sInByZiI6W119",
  address: "0x0C6433789d14050aF47198B2751f6689731Ca79C"
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