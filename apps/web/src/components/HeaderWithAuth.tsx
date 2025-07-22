import { CrownCross, Fire, CaretLeft } from '@phosphor-icons/react'
import { Button } from './ui/button'
import { IconButton } from './IconButton'
import { useNavigate } from 'react-router-dom'
import { useStreak } from '../hooks/useStreak'
import { useWalletAuth } from '../hooks/useWalletAuth'
import { LanguageSelector } from './LanguageSelector'
import { useTranslation } from 'react-i18next'

interface HeaderWithAuthProps {
  crownCount?: number
  fireCount?: number
  showBack?: boolean
  onBack?: () => void
  pageTitle?: string
}

export function HeaderWithAuth({ 
  crownCount = 5,
  showBack = false,
  onBack,
  pageTitle
}: HeaderWithAuthProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { address, isConnected, isConnecting, isDisconnecting, connect } = useWalletAuth()
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
              disabled={isConnecting || isDisconnecting}
            >
              {isConnected && address ? (
                formatAddress(address)
              ) : isConnecting ? (
                t('common.connecting')
              ) : isDisconnecting ? (
                t('common.disconnecting')
              ) : (
                t('common.connectWallet')
              )}
            </Button>
            <LanguageSelector />
          </div>
        </div>
      </div>
    </header>
  )
}