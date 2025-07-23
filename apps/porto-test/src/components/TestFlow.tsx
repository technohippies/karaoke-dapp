import { useState } from 'react'
import { useAccount, useChainId, useSendCalls, useWaitForTransactionReceipt, useReadContract, usePublicClient } from 'wagmi'
import { parseUnits, encodeFunctionData, type Address } from 'viem'
import { useLitProtocol } from '../hooks/useLitProtocol'

// Simple ERC20 ABI for approve and balanceOf
const erc20Abi = [
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    outputs: [{ type: 'bool' }]
  },
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'account', type: 'address' }
    ],
    outputs: [{ type: 'uint256' }]
  }
] as const

// Proxy ABI to check implementation
const proxyAbi = [
  {
    name: 'getProxyInfo',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      { name: 'impl', type: 'address' },
      { name: 'adm', type: 'address' }
    ]
  }
] as const

// Karaoke contract ABI (relevant parts)
const karaokeAbi = [
  {
    name: 'buyCombopack',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'country', type: 'string' }
    ],
    outputs: []
  },
  {
    name: 'songCredits',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: '', type: 'address' }
    ],
    outputs: [
      { name: '', type: 'uint256' }
    ]
  },
  {
    name: 'voiceCredits',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: '', type: 'address' }
    ],
    outputs: [
      { name: '', type: 'uint256' }
    ]
  },
  {
    name: 'COMBO_PRICE',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      { name: '', type: 'uint256' }
    ]
  }
] as const

export function TestFlow() {
  const { address } = useAccount()
  const chainId = useChainId()
  const publicClient = usePublicClient()
  const { sendCalls, data: callsId, isPending: isSending, error: sendError } = useSendCalls()
  
  // Log sendCalls state
  console.log('TestFlow render - callsId:', callsId, 'isSending:', isSending, 'sendError:', sendError)
  
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: callsId as `0x${string}` | undefined
  })
  
  // Read the actual COMBO_PRICE from contract
  const { data: comboPrice } = useReadContract({
    address: import.meta.env.VITE_PURCHASE_CONTRACT_ADDRESS as Address,
    abi: karaokeAbi,
    functionName: 'COMBO_PRICE',
  })
  
  console.log('Combo price from contract:', comboPrice)
  
  // Check proxy implementation
  const { data: proxyInfo } = useReadContract({
    address: import.meta.env.VITE_PURCHASE_CONTRACT_ADDRESS as Address,
    abi: proxyAbi,
    functionName: 'getProxyInfo',
  })
  
  console.log('Proxy info (impl, admin):', proxyInfo)
  
  // Get USDC balance
  const { data: usdcBalance } = useReadContract({
    address: chainId === 8453 
      ? import.meta.env.VITE_USDC_ADDRESS_BASE 
      : import.meta.env.VITE_USDC_ADDRESS_BASE_SEPOLIA,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
  })
  
  console.log('USDC balance:', usdcBalance)
  
  const { 
    connect: connectLit, 
    disconnect: disconnectLit,
    decrypt,
    isConnecting: isLitConnecting,
    isConnected: isLitConnected,
    error: litError
  } = useLitProtocol()

  const [currentStep, setCurrentStep] = useState<'purchase' | 'lit-connect' | 'decrypt' | 'success'>('purchase')
  const [decryptedContent, setDecryptedContent] = useState<string>('')
  const [isDecrypting, setIsDecrypting] = useState(false)

  // Get addresses based on chain
  const usdcAddress = chainId === 8453 
    ? import.meta.env.VITE_USDC_ADDRESS_BASE 
    : import.meta.env.VITE_USDC_ADDRESS_BASE_SEPOLIA

  // Karaoke contract from env (this is the purchase contract)
  const purchaseContractAddress = import.meta.env.VITE_PURCHASE_CONTRACT_ADDRESS as Address
  // Use the same price as the web app constants (7 USDC)
  const price = parseUnits('7', 6)

  // Test encrypted content from env
  const testCiphertext = import.meta.env.VITE_TEST_CIPHERTEXT
  const testDataToEncryptHash = import.meta.env.VITE_TEST_DATA_TO_ENCRYPT_HASH

  const handlePurchase = async () => {
    if (!address) {
      console.error('No address connected')
      return
    }

    console.log('Starting purchase flow...')
    console.log('Address:', address)
    console.log('Chain ID:', chainId)
    console.log('USDC Address:', usdcAddress)
    console.log('Purchase Contract:', purchaseContractAddress)
    console.log('Price:', price.toString())

    try {
      // Prepare batch calls: approve USDC + buy combo pack
      const approveCallData = encodeFunctionData({
        abi: erc20Abi,
        functionName: 'approve',
        args: [purchaseContractAddress, price]
      })
      
      const buyCallData = encodeFunctionData({
        abi: karaokeAbi,
        functionName: 'buyCombopack',
        args: ['US'] // Matches main app's 2-letter ISO code
      })
      
      console.log('Approve call data:', approveCallData)
      console.log('Buy call data:', buyCallData)
      
      const calls = [
        {
          to: usdcAddress as Address,
          data: approveCallData,
          value: 0n
        },
        {
          to: purchaseContractAddress,
          data: buyCallData,
          value: 0n
        }
      ]

      console.log('Sending batched calls:', calls)

      // Simulate approve (should pass)
      if (publicClient) {
        console.log('Simulating approve call...')
        try {
          await publicClient.simulateContract({
            account: address,
            address: usdcAddress as Address,
            abi: erc20Abi,
            functionName: 'approve',
            args: [purchaseContractAddress, price]
          })
          console.log('Approve simulation OK')
        } catch (err: any) {
          console.error('Approve sim revert:', err.shortMessage || err.message)
        }

        console.log('Simulating buyCombopack call...')
        try {
          await publicClient.simulateContract({
            account: address,
            address: purchaseContractAddress,
            abi: karaokeAbi,
            functionName: 'buyCombopack',
            args: ['US']
          })
          console.log('Buy simulation OK')
        } catch (err: any) {
          console.error('Buy sim revert:', err.shortMessage || err.message)
          console.log('Note: Isolated buy sim may fail due to no allowance; batch should work')
        }
      }

      // Send the batch
      const result = await sendCalls({ 
        calls,
        chainId,
      })
      
      console.log('SendCalls result:', result)
    } catch (err) {
      console.error('Purchase failed:', err)
      console.error('Full error details:', err)
    }
  }

  const handleDecrypt = async () => {
    setIsDecrypting(true)
    try {
      // Use voiceCredits for combo pack verification
      const accessControlConditions = [
        {
          contractAddress: purchaseContractAddress,
          standardContractType: 'custom',
          chain: chainId === 8453 ? 'base' : 'baseSepolia',
          method: 'voiceCredits',
          parameters: [':userAddress'],
          returnValueTest: {
            comparator: '>=',
            value: '1'
          }
        }
      ]

      const decrypted = await decrypt({
        ciphertext: testCiphertext,
        dataToEncryptHash: testDataToEncryptHash,
        accessControlConditions
      })

      setDecryptedContent(decrypted)
      setCurrentStep('success')
    } catch (err) {
      console.error('Decryption failed:', err)
      alert(`Decryption failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setIsDecrypting(false)
    }
  }

  return (
    <div>
      <h2>Test Flow</h2>

      {/* Step 1: Purchase */}
      {currentStep === 'purchase' && (
        <div>
          <h3>Step 1: Purchase Combo Pack with USDC</h3>
          <p>This will approve {comboPrice ? Number(comboPrice) / 1e6 : 3} USDC and purchase a combo pack in a single transaction.</p>
          <p style={{ fontSize: '14px', color: '#666', marginTop: '8px' }}>
            Chain: {chainId === 84532 ? 'Base Sepolia' : 'Base Mainnet'} | 
            Contract: {purchaseContractAddress.slice(0, 6)}...{purchaseContractAddress.slice(-4)}
          </p>
          
          {sendError && sendError.message.includes('Error occurred while executing calls') && (
            <div className="error" style={{ marginBottom: '1rem' }}>
              <p><strong>Simulation failed</strong> - Porto detected the transaction may revert.</p>
              <p style={{ fontSize: '14px', marginTop: '8px' }}>
                Click "Confirm anyway" in the Porto popup to proceed. The batch transaction may succeed on-chain despite the simulation warning.
              </p>
            </div>
          )}
          
          <button 
            className="button"
            onClick={handlePurchase}
            disabled={isSending || isConfirming || !usdcBalance || usdcBalance < price}
          >
            {!usdcBalance || usdcBalance < price ? 
             `Insufficient USDC (need ${Number(price) / 1e6} USDC)` :
             isSending ? 'Check Porto prompt...' : 
             isConfirming ? 'Confirming...' : 
             `Purchase Combo Pack (${Number(price) / 1e6} USDC)`}
          </button>

          {sendError && !sendError.message.includes('Error occurred while executing calls') && (
            <div className="error">
              Error: {sendError.message}
              {sendError.message.includes('User rejected') && (
                <p style={{ fontSize: '14px', marginTop: '8px' }}>
                  Transaction was canceled. Click the button again to retry.
                </p>
              )}
            </div>
          )}

          {isConfirmed && (
            <div className="status" style={{ color: 'green' }}>
              ✓ Purchase successful! Transaction: {callsId}
              <br />
              <button 
                className="button" 
                onClick={() => setCurrentStep('lit-connect')}
                style={{ marginTop: '1rem' }}
              >
                Continue to Lit Connection
              </button>
            </div>
          )}
        </div>
      )}

      {/* Step 2: Connect to Lit */}
      {currentStep === 'lit-connect' && (
        <div>
          <h3>Step 2: Connect to Lit Protocol</h3>
          <p>This will establish a session with Lit nodes using your Porto wallet signature.</p>
          
          {!isLitConnected ? (
            <>
              <button 
                className="button"
                onClick={connectLit}
                disabled={isLitConnecting}
              >
                {isLitConnecting ? 'Connecting to Lit...' : 'Connect to Lit Protocol'}
              </button>
              
              {litError && (
                <div className="error">Error: {litError.message}</div>
              )}
            </>
          ) : (
            <div className="status" style={{ color: 'green' }}>
              ✓ Connected to Lit Protocol!
              <br />
              <button 
                className="button" 
                onClick={() => setCurrentStep('decrypt')}
                style={{ marginTop: '1rem' }}
              >
                Continue to Decryption
              </button>
            </div>
          )}
        </div>
      )}

      {/* Step 3: Decrypt */}
      {currentStep === 'decrypt' && (
        <div>
          <h3>Step 3: Decrypt Content</h3>
          <p>This will verify your purchase on-chain and decrypt the content.</p>
          
          <button 
            className="button"
            onClick={handleDecrypt}
            disabled={isDecrypting}
          >
            {isDecrypting ? 'Decrypting...' : 'Decrypt Content'}
          </button>
        </div>
      )}

      {/* Success */}
      {currentStep === 'success' && (
        <div>
          <h3>Success! 🎉</h3>
          <div className="status" style={{ color: 'green' }}>
            <p>Content successfully decrypted:</p>
            <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {decryptedContent}
            </pre>
          </div>
          
          <button 
            className="button"
            onClick={() => {
              disconnectLit()
              setCurrentStep('purchase')
              setDecryptedContent('')
            }}
            style={{ marginTop: '1rem' }}
          >
            Start Over
          </button>
        </div>
      )}
    </div>
  )
}