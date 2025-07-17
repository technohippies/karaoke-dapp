import { MusicNotes, MicrophoneStage } from '@phosphor-icons/react'
import { Button } from './ui/button'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

interface CreditsWidgetProps {
  balance: string
  voiceCredits: number
  songCredits: number
}

export function CreditsWidget({ balance, voiceCredits, songCredits }: CreditsWidgetProps) {
  const navigate = useNavigate()
  const { t } = useTranslation()
  
  return (
    <div className="bg-neutral-800 rounded-lg p-6 border border-neutral-700">
      <h3 className="text-xl font-semibold text-white mb-2">{t('account.credits.title')}</h3>
      <p className="text-neutral-400 mb-6">{t('account.credits.usdcBalance')}: <span className="text-white font-semibold">${balance}</span></p>
      
      {/* Credits Row */}
      <div className="flex gap-4 mb-6">
        {/* Voice Credits */}
        <div className="flex-1 bg-neutral-800 rounded-lg p-6 border border-neutral-700">
          <div className="flex items-center gap-3">
            <MicrophoneStage size={40} weight="regular" className="text-neutral-400" />
            <div>
              <div className="text-3xl font-bold text-white">{voiceCredits}</div>
              <div className="text-neutral-400">{t('account.credits.voice')}</div>
            </div>
          </div>
        </div>
        
        {/* Song Credits */}
        <div className="flex-1 bg-neutral-800 rounded-lg p-6 border border-neutral-700">
          <div className="flex items-center gap-3">
            <MusicNotes size={40} weight="regular" className="text-neutral-400" />
            <div>
              <div className="text-3xl font-bold text-white">{songCredits}</div>
              <div className="text-neutral-400">{t('account.credits.songs')}</div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Pricing Button */}
      <Button 
        onClick={() => navigate('/pricing')}
        className="w-full bg-blue-600 hover:bg-blue-700"
      >
        {t('account.credits.pricing')}
      </Button>
    </div>
  )
}