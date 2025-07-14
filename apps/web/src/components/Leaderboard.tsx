import React from 'react'

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
  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  const baseClasses = "w-full flex items-center gap-3 p-4 rounded-lg bg-neutral-800"

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