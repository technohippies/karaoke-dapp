import { useEffect, useState } from 'react'
import { useAccount } from 'wagmi'
import { Check, X, CircleNotch } from '@phosphor-icons/react'

export function MetaMaskIntegrationStatus() {
  const { address, connector } = useAccount()
  const [status, setStatus] = useState<{
    isMetaMask: boolean
    hasSmartAccount: boolean
    isChecking: boolean
  }>({
    isMetaMask: false,
    hasSmartAccount: false,
    isChecking: true
  })

  useEffect(() => {
    const checkStatus = async () => {
      if (!address) {
        setStatus({ isMetaMask: false, hasSmartAccount: false, isChecking: false })
        return
      }

      try {
        const provider = window.ethereum as any
        const isMetaMask = provider?.isMetaMask === true
        
        if (!isMetaMask) {
          setStatus({ isMetaMask: false, hasSmartAccount: false, isChecking: false })
          return
        }

        // Check for smart account
        const chainId = '0x14a34' // Base Sepolia
        const capabilities = await provider.request({
          method: 'wallet_getCapabilities',
          params: [address, [chainId]]
        })
        
        const hasSmartAccount = capabilities?.[chainId]?.atomic?.status === 'supported'
        
        setStatus({ isMetaMask: true, hasSmartAccount, isChecking: false })
      } catch (error) {
        console.error('Error checking MetaMask status:', error)
        setStatus({ isMetaMask: false, hasSmartAccount: false, isChecking: false })
      }
    }

    checkStatus()
  }, [address])

  if (status.isChecking) {
    return (
      <div className="bg-neutral-800/50 rounded-lg p-4 flex items-center gap-3">
        <CircleNotch className="animate-spin" size={20} />
        <span className="text-sm text-neutral-400">Checking wallet capabilities...</span>
      </div>
    )
  }

  if (!address) {
    return null
  }

  return (
    <div className="bg-neutral-800/50 rounded-lg p-4 space-y-3">
      <h4 className="text-sm font-semibold text-white">Wallet Status</h4>
      
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          {status.isMetaMask ? (
            <Check className="text-green-400" size={16} />
          ) : (
            <X className="text-red-400" size={16} />
          )}
          <span className="text-sm text-neutral-300">
            MetaMask {status.isMetaMask ? 'detected' : 'not detected'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {status.hasSmartAccount ? (
            <Check className="text-green-400" size={16} />
          ) : (
            <X className="text-red-400" size={16} />
          )}
          <span className="text-sm text-neutral-300">
            Smart Account {status.hasSmartAccount ? 'enabled' : 'not enabled'}
          </span>
        </div>
      </div>

      {status.isMetaMask && status.hasSmartAccount && (
        <div className="mt-3 p-3 bg-purple-900/20 rounded border border-purple-800/30">
          <p className="text-xs text-purple-300">
            🎉 Your wallet supports bundled transactions! This enables:
          </p>
          <ul className="mt-2 text-xs text-purple-400 list-disc list-inside">
            <li>Gasless karaoke sessions</li>
            <li>Automatic voice credit deduction</li>
            <li>No popups while singing</li>
          </ul>
        </div>
      )}

      {status.isMetaMask && !status.hasSmartAccount && (
        <div className="mt-3 p-3 bg-yellow-900/20 rounded border border-yellow-800/30">
          <p className="text-xs text-yellow-300">
            ⚠️ Enable MetaMask Smart Account for the best experience
          </p>
          <p className="text-xs text-yellow-400 mt-1">
            Go to MetaMask Settings → Experimental → Enable Smart Transactions
          </p>
        </div>
      )}
    </div>
  )
}