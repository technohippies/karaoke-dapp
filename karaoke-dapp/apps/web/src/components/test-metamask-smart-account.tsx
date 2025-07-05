import { useState } from 'react'
import { Button } from '@karaoke-dapp/ui'
import { useAccount } from 'wagmi'
import { parseEther } from 'viem'

export function TestMetaMaskSmartAccount() {
  const { address } = useAccount()
  const [testResults, setTestResults] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const addResult = (result: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${result}`])
  }

  const runTest = async () => {
    if (!address) {
      addResult('❌ No wallet connected')
      return
    }

    setIsLoading(true)
    setTestResults([])

    try {
      const provider = window.ethereum as any
      
      // Step 1: Check capabilities
      addResult('📋 Checking wallet capabilities...')
      const chainId = '0x14a34' // Base Sepolia
      const capabilities = await provider.request({
        method: 'wallet_getCapabilities',
        params: [address, [chainId]]
      })
      
      const hasAtomic = capabilities?.[chainId]?.atomic?.status === 'supported'
      addResult(`✅ Atomic capability detected: ${hasAtomic}`)
      
      if (!hasAtomic) {
        addResult('❌ MetaMask smart account not enabled')
        return
      }

      // Step 2: Test wallet_sendCalls with simple ETH transfers
      addResult('🚀 Testing wallet_sendCalls...')
      
      // Create a test batch with simple ETH transfers (no data)
      // MetaMask doesn't allow data when sending to EOAs
      const testCalls = [
        {
          to: address, // Send to self
          value: '0x0' // 0 ETH
          // No data field - just a simple transfer
        },
        {
          to: '0x0000000000000000000000000000000000000001', // Precompile address
          value: '0x0' // 0 ETH
          // No data field
        }
      ]

      try {
        const response = await provider.request({
          method: 'wallet_sendCalls',
          params: [{
            version: '2.0.0', // EIP-5792 requires version 2.0.0
            chainId,
            from: address,
            calls: testCalls,
            atomicRequired: true // All calls must succeed together
          }]
        })
        
        // Log the full response to see what we're getting
        console.log('wallet_sendCalls response:', response)
        addResult(`📦 Response type: ${typeof response}`)
        addResult(`📦 Response: ${JSON.stringify(response, null, 2)}`)
        
        // Extract bundle ID from response
        const bundleId = response.id || response
        addResult(`✅ Batch transaction sent!`)
        addResult(`📦 Bundle ID: ${bundleId}`)
        
        // Try to get the bundle status
        try {
          addResult('⏳ Checking bundle status...')
          
          // Wait a bit for the bundle to be processed
          await new Promise(resolve => setTimeout(resolve, 2000))
          
          const status = await provider.request({
            method: 'wallet_getCallsStatus',
            params: [bundleId]
          })
          
          console.log('Bundle status:', status)
          addResult(`📊 Bundle status: ${JSON.stringify(status, null, 2)}`)
          
          // Check status code (100 = pending, 200 = confirmed)
          if (status?.status === 100) {
            addResult('⏳ Transaction is pending...')
            
            // Keep checking status until confirmed
            let attempts = 0
            while (attempts < 30 && status?.status === 100) {
              await new Promise(resolve => setTimeout(resolve, 2000))
              
              const updatedStatus = await provider.request({
                method: 'wallet_getCallsStatus',
                params: [bundleId]
              })
              
              console.log(`Status check ${attempts + 1}:`, updatedStatus)
              
              if (updatedStatus?.status === 200) {
                addResult('✅ Transaction confirmed!')
                if (updatedStatus.receipts && updatedStatus.receipts.length > 0) {
                  const txHash = updatedStatus.receipts[0].transactionHash
                  addResult(`📝 Transaction hash: ${txHash}`)
                  addResult(`🔗 View on explorer: https://sepolia.basescan.org/tx/${txHash}`)
                }
                break
              }
              
              attempts++
            }
            
            if (status?.status === 100) {
              addResult('⏱️ Transaction is taking longer than expected')
              addResult('Check your MetaMask activity tab for status')
            }
          } else if (status?.status === 200) {
            addResult('✅ Transaction already confirmed!')
            if (status.receipts && status.receipts.length > 0) {
              const txHash = status.receipts[0].transactionHash
              addResult(`📝 Transaction hash: ${txHash}`)
              addResult(`🔗 View on explorer: https://sepolia.basescan.org/tx/${txHash}`)
            }
          }
          
        } catch (statusError: any) {
          console.log('Could not get bundle status:', statusError)
          addResult('⚠️ Could not fetch bundle status')
          addResult('✅ But the bundle was submitted successfully!')
          addResult('Check your MetaMask activity tab to see the transaction')
        }
        
      } catch (sendError: any) {
        if (sendError.message?.includes('wallet_sendCalls')) {
          addResult('❌ wallet_sendCalls not supported - MetaMask smart account may not be fully enabled')
        } else {
          addResult(`❌ Error sending batch: ${sendError.message}`)
        }
        console.error('Send error:', sendError)
      }

    } catch (error: any) {
      addResult(`❌ Test failed: ${error.message}`)
      console.error('Test error:', error)
    } finally {
      setIsLoading(false)
    }
  }


  return (
    <div className="bg-neutral-800 rounded-lg p-6 space-y-4">
      <h3 className="text-xl font-bold text-white">MetaMask Smart Account Test</h3>
      
      <div className="text-sm text-neutral-400">
        This test will verify that MetaMask smart account is properly enabled and can execute bundled transactions.
      </div>

      <Button
        onClick={runTest}
        disabled={isLoading || !address}
        className="w-full"
      >
        {isLoading ? 'Testing...' : 'Run Basic Test'}
      </Button>

      {testResults.length > 0 && (
        <div className="bg-black/20 rounded p-4 space-y-1">
          {testResults.map((result, index) => (
            <div key={index} className="text-sm font-mono text-neutral-300">
              {result}
            </div>
          ))}
        </div>
      )}

      <div className="text-xs text-neutral-500 space-y-2">
        <p>Note: This test sends 2 zero-value transactions to verify batch functionality.</p>
        <p className="text-purple-400">
          ✨ With MetaMask Smart Account enabled, the karaoke app can:
        </p>
        <ul className="list-disc list-inside text-neutral-400 ml-2">
          <li>Bundle multiple transactions into one</li>
          <li>Create session keys for gasless singing</li>
          <li>Automatically deduct voice credits during karaoke</li>
          <li>No more wallet popups while singing!</li>
        </ul>
      </div>
    </div>
  )
}