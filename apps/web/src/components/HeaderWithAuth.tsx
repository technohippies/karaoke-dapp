import { CrownCross, Fire, CaretLeft } from '@phosphor-icons/react'
import { Button } from './ui/button'
import { IconButton } from './IconButton'
import { useWeb3AuthConnect, useWeb3AuthDisconnect, useWeb3AuthUser } from '@web3auth/modal/react'
import { useAccount } from 'wagmi'
import { useNavigate } from 'react-router-dom'
import { useStreak } from '../hooks/useStreak'
import { LanguageSelector } from './LanguageSelector'

interface HeaderWithAuthProps {
  crownCount?: number
  fireCount?: number
  showBack?: boolean
  onBack?: () => void
  pageTitle?: string
}

export function HeaderWithAuth({ 
  crownCount = 5,
  fireCount = 12,
  showBack = false,
  onBack,
  pageTitle
}: HeaderWithAuthProps) {
  const navigate = useNavigate()
  const { address, isConnected } = useAccount()
  const { connect, loading: connectLoading } = useWeb3AuthConnect()
  const { disconnect, loading: disconnectLoading } = useWeb3AuthDisconnect()
  const { userInfo } = useWeb3AuthUser()
  const { currentStreak } = useStreak()
  
  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-3)}`
  }

  const handleAuth = () => {
    if (isConnected) {
      navigate('/account')
    } else {
      connect()
    }
  }

  return (
    <header className="w-full bg-neutral-900 border-b border-neutral-700 h-16">
      <div className="w-full max-w-2xl mx-auto px-6 py-4 flex items-center justify-between h-full">
        {/* Left side - Back button and optional title */}
        <div className="flex items-center gap-4">
          {showBack && (
            <IconButton variant="ghost" onClick={onBack}>
              <CaretLeft size={20} weight="regular" />
            </IconButton>
          )}
          {pageTitle && (
            <h1 className="text-lg font-semibold text-white truncate">
              {pageTitle}
            </h1>
          )}
        </div>

        {/* Right side - Crown/Fire icons and Login/Account button */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 flex items-center justify-center">
                <CrownCross weight="fill" size={24} color="#EAB308" />
              </div>
              <span className="text-neutral-300 font-bold text-sm">{crownCount}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 flex items-center justify-center">
                <Fire weight="fill" size={24} color="#EF4444" />
              </div>
              <span className="text-neutral-300 font-bold text-sm">{currentStreak}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              onClick={handleAuth}
              disabled={connectLoading || disconnectLoading}
            >
              {isConnected && address ? (
                userInfo?.name || formatAddress(address)
              ) : connectLoading ? (
                'Connecting...'
              ) : disconnectLoading ? (
                'Disconnecting...'
              ) : (
                'Connect'
              )}
            </Button>
            <LanguageSelector />
          </div>
        </div>
      </div>
    </header>
  )
}