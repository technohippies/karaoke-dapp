import { useEffect } from 'react'
import { useConnect } from 'wagmi'
import { litProtocolService } from './lib/litProtocol'
import { useKaraokeMachineContext } from './contexts/KaraokeMachineContext'
import { ConnectWallet } from './components/ConnectWallet'
import { CreditPurchase } from './components/CreditPurchase'
import { SongSelection } from './components/SongSelection'
import { KaraokeSession } from './components/KaraokeSession'
import './App.css'

// Wildcard capacity delegation auth sig - works for ANY wallet address
const CAPACITY_DELEGATION_AUTH_SIG = {
  sig: "0xc4100824146920b590969df03a40c879d667307c8ef04897d183509a552f00865984d0562a36a26df40b806b72167321a5bb3492f49bae6e5917ea55bbd7a2421b",
  derivedVia: "web3.eth.personal.sign",
  signedMessage: "localhost wants you to sign in with your Ethereum account:\n0x0C6433789d14050aF47198B2751f6689731Ca79C\n\nThis is a test statement.  You can put anything you want here. I further authorize the stated URI to perform the following actions on my behalf: (1) 'Auth': 'Auth' for 'lit-ratelimitincrease://235258'.\n\nURI: lit:capability:delegation\nVersion: 1\nChain ID: 1\nNonce: 0x407060c7d34ab59697984f6a9048844d2633219e43823b6649a3f4c0df6c05c7\nIssued At: 2025-07-13T09:38:48.199Z\nExpiration Time: 2025-07-20T09:38:48.194Z\nResources:\n- urn:recap:eyJhdHQiOnsibGl0LXJhdGVsaW1pdGluY3JlYXNlOi8vMjM1MjU4Ijp7IkF1dGgvQXV0aCI6W3sibmZ0X2lkIjpbIjIzNTI1OCJdLCJ1c2VzIjoiMTAwMDAifV19fSwicHJmIjpbXX0",
  address: "0x0C6433789d14050aF47198B2751f6689731Ca79C"
}

console.log('📋 Capacity delegation auth sig loaded:', {
  hasAuthSig: !!CAPACITY_DELEGATION_AUTH_SIG,
  address: CAPACITY_DELEGATION_AUTH_SIG.address,
  nftId: '235258'
})

// This is a wildcard delegation - it works for ANY wallet address
// Created without specifying delegateeAddresses, allowing universal access

function App() {
  const { state, context } = useKaraokeMachineContext()
  const { connectors } = useConnect()
  
  
  
  // Initialize Lit Protocol on mount
  useEffect(() => {
    const initLit = async () => {
      try {
        // Set capacity delegation first, before connecting
        litProtocolService.setCapacityDelegation(CAPACITY_DELEGATION_AUTH_SIG)
        await litProtocolService.connect()
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
          <div key="selectSong">
            {console.log('🎵 Rendering SongSelection component')}
            <SongSelection />
          </div>
        )}
        
        {state.matches('unlockingSong') && (
          <div className="loading" key="unlockingSong">
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
        
        {(() => {
          const isKaraoke = state.matches('karaoke')
          if (isKaraoke) {
            return (
              <div key="karaoke">
                <KaraokeSession />
              </div>
            )
          }
          return null
        })()}
        
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