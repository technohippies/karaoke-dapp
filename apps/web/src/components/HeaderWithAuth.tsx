import { CrownCross, Fire, CaretLeft } from '@phosphor-icons/react'
import { IconButton } from './IconButton'
import { useStreak } from '../hooks/useStreak'
import { ConnectButton } from '@rainbow-me/rainbowkit'
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
  showBack = false,
  onBack,
  pageTitle
}: HeaderWithAuthProps) {
  const { currentStreak } = useStreak()

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
            <ConnectButton />
            <LanguageSelector />
          </div>
        </div>
      </div>
    </header>
  )
}