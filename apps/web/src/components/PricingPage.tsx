import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useAccount } from 'wagmi'
import { Check, Question } from '@phosphor-icons/react'
import { Button } from './ui/button'
import { Header } from './Header'

interface PricingPageProps {
  // Machine state
  isFirstPurchase?: boolean
  hasWallet?: boolean
  selectedType?: 'combo' | 'voice' | 'song' | null
  isLoading?: boolean
  error?: string | null
  
  // Pricing
  comboPrice?: number
  voiceCreditsPrice?: number
  songCreditsPrice?: number
  
  // Credits
  voiceCredits?: number
  songCredits?: number
  
  // USDC
  usdcBalance?: string
  
  // Actions
  onSelectCombo?: () => void
  onSelectVoiceCredits?: () => void
  onSelectSongCredits?: () => void
  onPurchase?: () => void
  onConnectWallet?: () => void
  onClearError?: () => void
}

export function PricingPage({
  isFirstPurchase = true,
  hasWallet = false,
  selectedType = null,
  isLoading = false,
  error = null,
  comboPrice = 3.0,
  voiceCreditsPrice = 1.0,
  songCreditsPrice = 2.0,
  voiceCredits = 0,
  songCredits = 0,
  usdcBalance = '0.00',
  onSelectCombo,
  onSelectVoiceCredits,
  onSelectSongCredits,
  onPurchase,
  onConnectWallet,
  onClearError
}: PricingPageProps) {
  const navigate = useNavigate()
  const { isConnected, address } = useAccount()

  const handleLogin = () => {
    console.log('Connect wallet clicked')
  }

  const handleAccount = () => {
    console.log('Account clicked')
  }
  
  const comboFeatures = [
    '100 Voice Credits',
    '10 Song Credits'
  ]
  
  const faqItems = [
    {
      question: 'What are Voice Credits?',
      answer: 'Voice Credits let you record and get AI feedback on your singing. Each line uses 1 credit.'
    },
    {
      question: 'What are Song Credits?',
      answer: 'Song Credits unlock songs permanently. Once unlocked, you can practice that song anytime.'
    },
    {
      question: 'Can I buy credits separately?',
      answer: 'Yes! After your first purchase, you can buy Voice Credits or Song Credits individually as needed.'
    }
  ]

  return (
    <div className="min-h-screen bg-neutral-900">
      <Header 
        isLoggedIn={isConnected}
        address={address}
        onLogin={handleLogin}
        onAccount={handleAccount}
        crownCount={0}
        fireCount={0}
        showBack={true}
        onBack={() => navigate('/')}
      />
      
      <div className="w-full max-w-4xl mx-auto px-6 py-8">
        

        {/* Error Message */}
        {error && (
          <div className="bg-red-900/20 border border-red-700 rounded-lg p-4 mb-8 flex items-center justify-between">
            <span className="text-red-300">{error}</span>
            <button 
              onClick={onClearError}
              className="text-red-400 hover:text-red-300 transition-colors"
            >
              ×
            </button>
          </div>
        )}

        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4 text-white">
            Pricing
          </h1>
        </div>

        {/* First Purchase - Single Combo Pack */}
        {isFirstPurchase ? (
          <div className="max-w-2xl mx-auto mb-16">
            <div className="rounded-2xl p-8 border-2 border-blue-500 bg-blue-500/10">
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold mb-2 text-white">Starter Pack</h3>
                <div className="text-4xl font-bold text-blue-400 mb-2">
                  ${comboPrice}
                </div>
              </div>

              <div className="space-y-3 mb-8">
                {comboFeatures.map((feature, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <Check size={20} className="text-green-400 flex-shrink-0" />
                    <span className="text-neutral-300">{feature}</span>
                  </div>
                ))}
              </div>


              {!hasWallet ? (
                <Button 
                  onClick={onConnectWallet}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 text-lg rounded-xl"
                >
                  Connect Wallet to Purchase
                </Button>
              ) : (
                <Button 
                  onClick={() => {
                    onSelectCombo?.()
                    onPurchase?.()
                  }}
                  disabled={isLoading}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-neutral-700 text-white py-4 text-lg rounded-xl"
                >
                  {isLoading ? 'Processing...' : 'Buy'}
                </Button>
              )}
            </div>
          </div>
        ) : (
          /* Returning User - Individual Options */
          <div className="grid md:grid-cols-2 gap-8 mb-16">
            
            {/* Voice Credits */}
            <div className={`
              rounded-2xl p-8 border-2 transition-all
              ${selectedType === 'voice' 
                ? 'border-blue-500 bg-blue-500/10' 
                : 'border-neutral-700 bg-neutral-800'
              }
            `}>
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold mb-2 text-white">Voice Credits</h3>
                <div className="text-4xl font-bold text-neutral-300 mb-2">
                  ${voiceCreditsPrice}
                </div>
                <p className="text-neutral-400">For 50 voice credits</p>
              </div>

              <div className="space-y-3 mb-8">
                <div className="flex items-center gap-3">
                  <Check size={20} className="text-green-400 flex-shrink-0" />
                  <span className="text-neutral-300">Record & get AI feedback</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check size={20} className="text-green-400 flex-shrink-0" />
                  <span className="text-neutral-300">Line-by-line analysis</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check size={20} className="text-green-400 flex-shrink-0" />
                  <span className="text-neutral-300">Vocal improvement tips</span>
                </div>
              </div>

              <div className="flex items-center justify-center gap-2 text-sm text-neutral-400 mb-6">
                <span>50 Voice Credits</span>
              </div>

              {!hasWallet ? (
                <Button 
                  onClick={onConnectWallet}
                  variant="outline"
                  className="w-full"
                >
                  Connect Wallet
                </Button>
              ) : (
                <Button 
                  onClick={() => {
                    onSelectVoiceCredits?.()
                    onPurchase?.()
                  }}
                  disabled={isLoading && selectedType === 'voice'}
                  variant={selectedType === 'voice' ? 'default' : 'outline'}
                  className="w-full"
                >
                  {isLoading && selectedType === 'voice' ? 'Processing...' : 'Purchase Voice Credits'}
                </Button>
              )}
            </div>

            {/* Song Credits */}
            <div className={`
              rounded-2xl p-8 border-2 transition-all
              ${selectedType === 'song' 
                ? 'border-blue-500 bg-blue-500/10' 
                : 'border-neutral-700 bg-neutral-800'
              }
            `}>
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold mb-2 text-white">Song Credits</h3>
                <div className="text-4xl font-bold text-neutral-300 mb-2">
                  ${songCreditsPrice}
                </div>
                <p className="text-neutral-400">For 5 song credits</p>
              </div>

              <div className="space-y-3 mb-8">
                <div className="flex items-center gap-3">
                  <Check size={20} className="text-green-400 flex-shrink-0" />
                  <span className="text-neutral-300">Unlock any song permanently</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check size={20} className="text-green-400 flex-shrink-0" />
                  <span className="text-neutral-300">Access MIDI & lyrics</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check size={20} className="text-green-400 flex-shrink-0" />
                  <span className="text-neutral-300">Practice anytime</span>
                </div>
              </div>

              <div className="flex items-center justify-center gap-2 text-sm text-neutral-400 mb-6">
                <span>5 Song Credits</span>
              </div>

              {!hasWallet ? (
                <Button 
                  onClick={onConnectWallet}
                  variant="outline"
                  className="w-full"
                >
                  Connect Wallet
                </Button>
              ) : (
                <Button 
                  onClick={() => {
                    onSelectSongCredits?.()
                    onPurchase?.()
                  }}
                  disabled={isLoading && selectedType === 'song'}
                  variant={selectedType === 'song' ? 'default' : 'outline'}
                  className="w-full"
                >
                  {isLoading && selectedType === 'song' ? 'Processing...' : 'Purchase Song Credits'}
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Wallet Info Display */}
        {hasWallet && (
          <div className="max-w-2xl mx-auto mb-16">
            <div className="bg-neutral-800 rounded-lg p-6 border border-neutral-700">
              <h3 className="text-lg font-semibold text-white mb-4">Wallet Info</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-neutral-400">USDC Balance:</span>
                  <span className="text-white font-medium">${usdcBalance}</span>
                </div>
                {(voiceCredits > 0 || songCredits > 0) && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-400">Voice Credits:</span>
                      <span className="text-white font-medium">{voiceCredits}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-400">Song Credits:</span>
                      <span className="text-white font-medium">{songCredits}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* FAQ */}
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold mb-8 text-white">FAQ</h2>
          <div className="space-y-6">
            {faqItems.map((item, index) => (
              <div key={index} className="bg-neutral-800 rounded-lg p-6">
                <div className="flex items-start gap-3 mb-3">
                  <Question size={20} className="text-blue-400 mt-1 flex-shrink-0" />
                  <h3 className="font-semibold text-lg text-white">{item.question}</h3>
                </div>
                <p className="text-neutral-400 ml-8">{item.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}