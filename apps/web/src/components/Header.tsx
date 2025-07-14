import { useAccount } from 'wagmi'
import { useKaraokeMachineContext } from '../contexts/KaraokeMachineContext'
import { ConnectWallet } from './ConnectWallet'

export function Header() {
  const { isConnected, address } = useAccount()
  const { context } = useKaraokeMachineContext()

  return (
    <header style={{ 
      background: 'rgba(17, 24, 39, 0.5)', 
      borderBottom: '1px solid rgba(75, 85, 99, 0.3)',
      padding: '1rem 0'
    }}>
      <div style={{ 
        maxWidth: '1200px', 
        margin: '0 auto', 
        padding: '0 1rem',
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center' 
      }}>
        <h1 style={{ 
          fontSize: '1.5rem', 
          fontWeight: 'bold', 
          color: '#e879f9',
          margin: 0
        }}>
          Karaoke Turbo
        </h1>
        
        {!isConnected ? (
          <ConnectWallet />
        ) : (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '1.5rem' 
          }}>
            <div style={{ fontSize: '0.875rem' }}>
              <span style={{ color: '#9ca3af' }}>Voice:</span>
              <span style={{ color: 'white', marginLeft: '0.25rem' }}>{context.voiceCredits}</span>
            </div>
            <div style={{ fontSize: '0.875rem' }}>
              <span style={{ color: '#9ca3af' }}>Songs:</span>
              <span style={{ color: 'white', marginLeft: '0.25rem' }}>{context.songCredits}</span>
            </div>
            <div style={{ fontSize: '0.875rem' }}>
              <span style={{ color: '#9ca3af' }}>USDC:</span>
              <span style={{ color: 'white', marginLeft: '0.25rem' }}>${context.usdcBalance}</span>
            </div>
            <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
              {address?.slice(0, 6)}...{address?.slice(-4)}
            </div>
          </div>
        )}
      </div>
    </header>
  )
}