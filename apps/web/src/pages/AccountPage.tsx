import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAccount, useReadContract } from 'wagmi'
import { CrownCross, Fire } from '@phosphor-icons/react'
import { SimpleHeader } from '../components/SimpleHeader'
import { CreditsWidget } from '../components/CreditsWidget'
import { KARAOKE_CONTRACT_ADDRESS } from '../constants'
import { KARAOKE_SCHOOL_ABI } from '../contracts/abis/KaraokeSchool'
import { usePurchase } from '../hooks/usePurchase'

export function AccountPage() {
  const navigate = useNavigate()
  const { isConnected, address } = useAccount()
  const { balance, voiceCredits, songCredits } = usePurchase()
  
  // TODO: Implement streak calculation from IDB
  const streakDays = 0
  
  useEffect(() => {
    if (!isConnected || !address) {
      navigate('/')
    }
  }, [isConnected, address, navigate])
  
  if (!isConnected || !address) {
    return null
  }
  
  return (
    <div className="min-h-screen bg-neutral-900">
      <SimpleHeader />
      
      <div className="pt-24 px-6 pb-24">
        <div className="w-full max-w-2xl mx-auto">
          {/* Wallet Address */}
          <div className="mb-8">
            <p className="text-neutral-400 mb-2">Your Wallet Address</p>
            <p className="text-white font-mono break-all">{address}</p>
          </div>
          
          {/* Stats Row */}
          <div className="flex gap-4 mb-8">
            {/* Crown Count */}
            <div className="flex-1 bg-neutral-800 rounded-lg p-6">
              <div className="flex items-center gap-3">
                <CrownCross size={40} weight="fill" className="text-yellow-500" />
                <div>
                  <div className="text-3xl font-bold text-white">{voiceCredits}</div>
                  <div className="text-neutral-400">Crowns <span className="text-neutral-500 text-sm">(Coming Soon)</span></div>
                </div>
              </div>
            </div>
            
            {/* Streak */}
            <div className="flex-1 bg-neutral-800 rounded-lg p-6">
              <div className="flex items-center gap-3">
                <Fire size={40} weight="fill" className="text-orange-500" />
                <div>
                  <div className="text-3xl font-bold text-white">{streakDays}</div>
                  <div className="text-neutral-400">Day Streak</div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Credits Widget */}
          <CreditsWidget 
            balance={balance}
            voiceCredits={voiceCredits}
            songCredits={songCredits}
          />
        </div>
      </div>
    </div>
  )
}