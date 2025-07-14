import React from 'react'
import { Crown, Fire } from '@phosphor-icons/react'
import { Button } from './ui/button'

interface HeaderProps {
  isLoggedIn?: boolean
  address?: string
  onLogin?: () => void
  onAccount?: () => void
  crownCount?: number
  fireCount?: number
}

export function Header({ 
  isLoggedIn = false, 
  address = '0x742d35Cc6634C0532925a3b8D',
  onLogin,
  onAccount,
  crownCount = 5,
  fireCount = 12
}: HeaderProps) {
  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-3)}`
  }

  return (
    <header className="w-full bg-neutral-900 border-b border-neutral-700 px-6 py-4 h-16">
      <div className="flex items-center justify-between h-full">
        {/* Left side - Crown and Fire icons */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 flex items-center justify-center">
              <Crown weight="fill" size={24} color="#EAB308" />
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

        {/* Right side - Login/Account button */}
        <div>
          {isLoggedIn ? (
            <Button 
              variant="outline" 
              onClick={onAccount}
            >
              {formatAddress(address)}
            </Button>
          ) : (
            <Button variant="outline" onClick={onLogin}>
              Connect Wallet
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}