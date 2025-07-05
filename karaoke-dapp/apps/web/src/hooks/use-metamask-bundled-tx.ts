import { useState, useCallback } from 'react'
import { useAccount } from 'wagmi'
import { encodeFunctionData, parseAbi } from 'viem'

export interface BundledCall {
  to: string
  value?: string
  data?: string
}

export function useMetaMaskBundledTx() {
  const { address } = useAccount()
  const [isExecuting, setIsExecuting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const checkCapabilities = useCallback(async () => {
    if (!address || !window.ethereum) return false
    
    try {
      const provider = window.ethereum as any
      const chainId = '0x14a34' // Base Sepolia
      
      const capabilities = await provider.request({
        method: 'wallet_getCapabilities',
        params: [address, [chainId]]
      })
      
      return capabilities?.[chainId]?.atomic?.status === 'supported'
    } catch {
      return false
    }
  }, [address])

  const executeBundledTransaction = useCallback(async (
    calls: BundledCall[],
    options?: {
      onSuccess?: (txHash: string) => void
      onError?: (error: Error) => void
    }
  ) => {
    if (!address || !window.ethereum) {
      const error = new Error('No wallet connected')
      options?.onError?.(error)
      setError(error.message)
      return
    }

    setIsExecuting(true)
    setError(null)

    try {
      const provider = window.ethereum as any
      const chainId = '0x14a34' // Base Sepolia
      
      // Check if MetaMask smart account is available
      const hasSmartAccount = await checkCapabilities()
      
      if (!hasSmartAccount) {
        throw new Error('MetaMask smart account not enabled')
      }

      // Execute bundled transaction
      const txHash = await provider.request({
        method: 'wallet_sendCalls',
        params: [{
          version: '2.0.0',
          chainId,
          from: address,
          calls,
          atomicRequired: true // All calls must succeed together
        }]
      })

      console.log('✅ Bundled transaction sent:', txHash)
      options?.onSuccess?.(txHash)
      
      return txHash
    } catch (err: any) {
      console.error('❌ Bundled transaction failed:', err)
      setError(err.message || 'Transaction failed')
      options?.onError?.(err)
      throw err
    } finally {
      setIsExecuting(false)
    }
  }, [address, checkCapabilities])

  // Helper to encode contract calls
  const encodeContractCall = useCallback((
    contractAddress: string,
    abi: any[],
    functionName: string,
    args: any[]
  ): BundledCall => {
    const data = encodeFunctionData({
      abi,
      functionName,
      args
    })

    return {
      to: contractAddress,
      value: '0x0',
      data
    }
  }, [])

  return {
    executeBundledTransaction,
    encodeContractCall,
    checkCapabilities,
    isExecuting,
    error
  }
}