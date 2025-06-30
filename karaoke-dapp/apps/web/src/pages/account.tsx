import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@karaoke-dapp/ui'

export default function AccountPage() {
  const { address, isConnected } = useAccount()
  const { connect, connectors } = useConnect()
  const { disconnect } = useDisconnect()
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-neutral-900">
      <PageHeader 
        title="Account" 
        onBack={() => navigate(-1)}
      />
      <div className="flex min-h-[calc(100vh-73px)] items-center justify-center px-4">
        <div className="w-full max-w-md space-y-8 text-center">
        
        {isConnected ? (
          <div className="space-y-4">
            <p className="font-mono text-sm text-neutral-400">
              {address}
            </p>
            <button
              onClick={() => disconnect()}
              className="rounded-lg bg-red-600 px-6 py-3 text-white hover:bg-red-700"
            >
              Disconnect
            </button>
            <p className="text-xs text-neutral-500 mt-4">
              Porto account management opens automatically when needed
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-neutral-400">Connect your wallet to continue</p>
            <button
              onClick={() => connect({ connector: connectors[0] })}
              className="w-full rounded-lg bg-blue-600 px-6 py-3 text-white hover:bg-blue-700"
            >
              Connect with Porto
            </button>
          </div>
        )}
        </div>
      </div>
    </div>
  )
}