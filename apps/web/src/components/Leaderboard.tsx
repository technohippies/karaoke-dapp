
import { useTranslation } from 'react-i18next'
import { CrownCross } from '@phosphor-icons/react'

interface LeaderboardEntry {
  rank: number
  address: string
  username?: string
  avatar?: string
  score: number
}

interface LeaderboardProps {
  entries: LeaderboardEntry[]
  className?: string
}

export function Leaderboard({ entries, className = "" }: LeaderboardProps) {
  const { t } = useTranslation()
  
  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  // Show coming soon state
  if (entries.length === 0) {
    return (
      <div className={`text-center py-16 ${className}`}>
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-neutral-800 rounded-full flex items-center justify-center">
            <CrownCross size={28} className="text-neutral-400" />
          </div>
        </div>
        <h3 className="text-xl font-bold text-white">
          {t('leaderboard.comingSoon')}
        </h3>
      </div>
    )
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {entries.map((entry) => (
        <div key={`${entry.rank}-${entry.address}`} className="w-full flex items-center p-4 rounded-lg bg-neutral-800">
          {/* Rank number */}
          <div className="flex-shrink-0 w-8 text-center mr-3">
            <span className="text-xl font-bold text-neutral-300">
              {entry.rank}
            </span>
          </div>
          
          {/* Avatar */}
          <div className="flex-shrink-0 mr-3">
            {entry.avatar ? (
              <img 
                src={entry.avatar} 
                alt="" 
                className="w-12 h-12 object-cover rounded-md bg-neutral-800"
              />
            ) : (
              <div className="w-12 h-12 rounded-md bg-neutral-700">
              </div>
            )}
          </div>
          
          {/* Username */}
          <div className="flex-1 min-w-0 mr-3">
            <div className="font-medium text-white truncate">
              {entry.username || formatAddress(entry.address)}
            </div>
          </div>
          
          {/* Score */}
          <div className="flex-shrink-0 min-w-16 text-right text-neutral-300 font-semibold">
            {entry.score.toLocaleString()}
          </div>
        </div>
      ))}
    </div>
  )
}