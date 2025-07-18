import { useEffect, useState } from 'react'
import { CheckCircle, X } from 'lucide-react'

interface PurchaseSuccessBannerProps {
  lastPurchase: { type: 'combo' | 'voice' | 'song', timestamp: number } | null
  voiceCredits: number
  songCredits: number
}

export function PurchaseSuccessBanner({ lastPurchase, voiceCredits, songCredits }: PurchaseSuccessBannerProps) {
  const [show, setShow] = useState(false)
  
  useEffect(() => {
    if (lastPurchase && Date.now() - lastPurchase.timestamp < 10000) { // Show for 10 seconds after purchase
      setShow(true)
      const timer = setTimeout(() => setShow(false), 10000)
      return () => clearTimeout(timer)
    }
  }, [lastPurchase])
  
  if (!show || !lastPurchase) return null
  
  const getMessage = () => {
    switch (lastPurchase.type) {
      case 'combo':
        return `🎉 Purchase successful! You now have ${voiceCredits} voice credits and ${songCredits} song credits`
      case 'voice':
        return `🎉 Voice pack purchased! You now have ${voiceCredits} voice credits`
      case 'song':
        return `🎉 Song pack purchased! You now have ${songCredits} song credits`
    }
  }
  
  return (
    <div className="bg-green-600 text-white px-4 py-3 mb-6 rounded-lg flex items-center justify-between animate-in slide-in-from-top-2 duration-300">
      <div className="flex items-center gap-3">
        <CheckCircle size={20} className="flex-shrink-0" />
        <p className="text-sm font-medium">{getMessage()}</p>
      </div>
      <button 
        onClick={() => setShow(false)}
        className="p-1 hover:bg-green-700 rounded transition-colors"
      >
        <X size={16} />
      </button>
    </div>
  )
}