import { useState, useEffect } from 'react'
import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { parseUnits } from 'viem'
import { TestFlow } from './components/TestFlow'

function App() {
  const { address, isConnected, connector } = useAccount()
  const { connect, connectors, isPending, error: connectError } = useConnect()
  const { disconnect } = useDisconnect()
  const [testStep, setTestStep] = useState<'connect' | 'test'>('connect')

  // Log initial state
  console.log('App render - isConnected:', isConnected, 'address:', address)
  console.log('Connect state - isPending:', isPending, 'error:', connectError)
  
  useEffect(() => {
    console.log('Connectors updated:', connectors)
    console.log('Number of connectors:', connectors.length)
  }, [connectors])

  const handleConnect = () => {
    console.log('handleConnect called')
    console.log('Available connectors:', connectors.map(c => ({ 
      id: c.id, 
      name: c.name,
      type: c.type,
      uid: c.uid
    })))
    
    // Porto connector might have a different ID, let's find it by name or type
    const portoConnector = connectors.find(c => 
      c.id === 'porto' || 
      c.name === 'Porto' || 
      c.name?.toLowerCase().includes('porto') ||
      c.type === 'porto'
    )
    console.log('Porto connector found:', portoConnector)
    
    if (portoConnector) {
      console.log('Attempting to connect with Porto...')
      
      // Define permissions for USDC operations on Base Sepolia
      const usdcAddress = '0x036CbD53842c5426634e7929541eC2318f3dCF7e'
      const karaokeContract = '0x9908f93A794297093fA0d235B51Ffbd86FDe8d08' // Using PROXY (not deprecated contract)
      
      const permissions = () => ({
        expiry: Math.floor(Date.now() / 1000) + 60 * 60, // 1 hour
        permissions: [
          {
            type: 'erc20',
            data: {
              token: usdcAddress,
              allowance: parseUnits('3', 6), // Match actual contract price (3 USDC)
              interval: 60 * 60, // 1 hour
              spender: karaokeContract, // Allow spend by Karaoke contract
            }
          },
          {
            type: 'contract-call',
            data: {
              contract: karaokeContract,
              selector: '0x447acb07', // Correct selector for buyCombopack(string)
              valueLimit: 0n, // Nonpayable function
              interval: 60 * 60, // 1 hour
            }
          },
          {
            type: 'native-token',
            data: {
              chain: 84532, // Base Sepolia
            }
          }
        ]
      })
      
      console.log('Connecting with permissions:', permissions())
      
      connect({ 
        connector: portoConnector,
        capabilities: {
          grantPermissions: permissions()
        }
      })
    } else {
      console.error('Porto connector not found! Available IDs:', connectors.map(c => c.id))
    }
  }

  return (
    <div className="container">
      <h1>Porto + Lit Protocol Integration Test</h1>
      
      {testStep === 'connect' && (
        <>
          <h2>Step 1: Connect Porto Wallet</h2>
          {!isConnected ? (
            <div>
              <button 
                className="button" 
                onClick={() => {
                  console.log('Button clicked!')
                  handleConnect()
                }}
                disabled={isPending}
              >
                {isPending ? 'Connecting...' : 'Connect with Porto'}
              </button>
              {connectError && (
                <div className="error">Error: {connectError.message}</div>
              )}
            </div>
          ) : (
            <div>
              <div className="status">
                <p>Connected with: {connector?.name}</p>
                <p>Address: {address}</p>
              </div>
              <button 
                className="button" 
                onClick={() => setTestStep('test')}
              >
                Proceed to Test
              </button>
              <button 
                className="button" 
                onClick={() => disconnect()}
                style={{ marginLeft: '1rem', backgroundColor: '#f44336' }}
              >
                Disconnect
              </button>
            </div>
          )}
        </>
      )}

      {testStep === 'test' && isConnected && (
        <>
          <button 
            className="button" 
            onClick={() => setTestStep('connect')}
            style={{ marginBottom: '2rem' }}
          >
            ← Back
          </button>
          <TestFlow />
        </>
      )}
    </div>
  )
}

export default App