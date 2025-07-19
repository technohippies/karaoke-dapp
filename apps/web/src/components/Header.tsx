import { CrownCross, Fire, CaretLeft } from '@phosphor-icons/react'
import { useTranslation } from 'react-i18next'
import { Button } from './ui/button'
import { IconButton } from './IconButton'
import { useWeb3AuthConnect, useWeb3AuthDisconnect } from '@web3auth/modal/react'
import { useAccount } from 'wagmi'
import { LanguageSelector } from './LanguageSelector'
import { useNavigate } from 'react-router-dom'

interface HeaderProps {
  isLoggedIn?: boolean
  address?: string
  onLogin?: () => void
  onAccount?: () => void
  crownCount?: number
  fireCount?: number
  showBack?: boolean
  onBack?: () => void
  pageTitle?: string
}

export function Header({ 
  isLoggedIn = false, 
  address = '0x742d35Cc6634C0532925a3b8D',
  onLogin,
  onAccount,
  crownCount = 5,
  fireCount = 12,
  showBack = false,
  onBack,
  pageTitle
}: HeaderProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  
  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-3)}`
  }
  
  const handleAccountClick = () => {
    if (onAccount) {
      onAccount()
    } else {
      navigate('/account')
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
              <span className="text-neutral-300 font-bold text-sm">{fireCount}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {isLoggedIn ? (
              <Button 
                variant="outline" 
                onClick={handleAccountClick}
              >
                {formatAddress(address)}
              </Button>
            ) : (
              <Button variant="outline" onClick={onLogin}>
                {t('common.connectWallet')}
              </Button>
            )}
            <LanguageSelector />
          </div>
        </div>
      </div>
    </header>
  )
}