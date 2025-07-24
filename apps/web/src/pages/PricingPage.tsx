import { usePurchase } from '../hooks/usePurchase'
import { SimpleHeader } from '../components/SimpleHeader'
import { Spinner } from '../components/ui/spinner'
import { Button } from '../components/ui/button'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ChainSwitcher } from '../components/ChainSwitcher'
import { CreditsWidget } from '../components/CreditsWidget'
import { PurchaseSuccessBanner } from '../components/PurchaseSuccessBanner'
import { defaultChainId } from '../config/networks.config'
import { useTranslation } from 'react-i18next'
import { useWalletAuth } from '../hooks/useWalletAuth'

export function PricingPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { t } = useTranslation()
  const walletAuth = useWalletAuth()
  const {
    isConnected,
    isApproving,
    isPurchasing,
    balance,
    voiceCredits,
    songCredits,
    isFirstPurchase,
    lastPurchase,
    handleBuyCombo,
    handleBuyVoice,
    handleBuySong,
  } = usePurchase()

  // No longer using URL params for navigation


  return (
    <div className="min-h-screen bg-neutral-900 relative overflow-hidden">
      {/* Content */}
      <div className="relative z-10 h-screen flex flex-col">
        <SimpleHeader />
        
        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          <div className="w-full max-w-2xl mx-auto px-6 pt-8 pb-24">
      
      {/* Purchase Success Banner */}
      <PurchaseSuccessBanner 
        lastPurchase={lastPurchase}
        voiceCredits={voiceCredits}
        songCredits={songCredits}
      />
      
      {/* Purchase Options */}
      {isFirstPurchase ? (
        // Starter Pack for new users
        <div className="mb-8">
          <div className="rounded-lg p-8 bg-neutral-800 border border-neutral-700 text-center">
            <h3 className="text-3xl font-bold mb-6 text-white">{t('pricing.starterPack')}</h3>
            <div className="text-4xl font-bold text-blue-400 mb-6">$7 <span className="text-sm text-neutral-400 font-medium">$USDC Base</span></div>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="rounded-lg p-4 text-center border border-neutral-700">
                <div className="text-2xl font-bold text-white">3</div>
                <div className="text-neutral-400 text-sm font-medium mt-1">Songs</div>
              </div>
              <div className="rounded-lg p-4 text-center border border-neutral-700">
                <div className="text-2xl font-bold text-white">2k</div>
                <div className="text-neutral-400 text-sm font-medium mt-1">{t('pricing.voiceCredits')}</div>
              </div>
            </div>
            
            {!isConnected ? (
              <Button className="w-full bg-white text-black py-3 px-6" disabled>
                {t('pricing.connectToPurchase')}
              </Button>
            ) : (
              <ChainSwitcher requiredChainId={defaultChainId} className="w-full">
                <Button 
                  onClick={handleBuyCombo}
                  disabled={isApproving || isPurchasing}
                  className="w-full bg-blue-500 hover:bg-blue-600 py-3 px-6 flex items-center justify-center gap-2"
                >
                  {isApproving ? (
                    <>
                      <Spinner size="sm" />
                      <span>{t('pricing.approving')}</span>
                    </>
                  ) : isPurchasing ? (
                    <>
                      <Spinner size="sm" />
                      <span>{t('pricing.purchasing')}</span>
                    </>
                  ) : (
                    t('pricing.buy')
                  )}
                </Button>
              </ChainSwitcher>
            )}
            
            {/* USDC Balance */}
            {isConnected && (
              <div className="mt-4 text-center">
                <p className="text-neutral-400 text-sm">
                  Balance: <span className="text-white font-semibold">${balance}</span> $USDC Base
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* Credits Widget - shown above purchase options for existing users */}
          {isConnected && (voiceCredits > 0 || songCredits > 0) && (
            <div className="mb-8">
              <CreditsWidget 
                balance={balance}
                voiceCredits={voiceCredits}
                songCredits={songCredits}
                hidePricingButton={true}
              />
            </div>
          )}
          
          {/* Additional packs for existing users */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Voice Pack */}
          <div className="rounded-lg p-6 bg-neutral-800 border border-neutral-700">
            <h3 className="text-2xl font-bold mb-2 text-white">{t('pricing.voicePack')}</h3>
            <div className="text-4xl font-bold text-green-400 mb-2">$4 <span className="text-sm text-neutral-400 font-medium">$USDC Base</span></div>
            <ul className="space-y-2 text-gray-300 mb-6">
              <li>2k {t('pricing.voiceCredits')}</li>
            </ul>
            
            <ChainSwitcher requiredChainId={defaultChainId} className="w-full">
              <Button 
                onClick={handleBuyVoice}
                disabled={isApproving || isPurchasing || !isConnected}
                className="w-full bg-green-500 hover:bg-green-600 py-3 px-6 flex items-center justify-center gap-2"
              >
                {isApproving ? (
                  <>
                    <Spinner size="sm" />
                    <span>Approving...</span>
                  </>
                ) : isPurchasing ? (
                  <>
                    <Spinner size="sm" />
                    <span>Purchasing...</span>
                  </>
                ) : (
                  'Buy'
                )}
              </Button>
            </ChainSwitcher>
          </div>

          {/* Song Pack */}
          <div className="rounded-lg p-6 bg-neutral-800 border border-neutral-700">
            <h3 className="text-2xl font-bold mb-2 text-white">{t('pricing.songPack')}</h3>
            <div className="text-4xl font-bold text-purple-400 mb-2">$3 <span className="text-sm text-neutral-400 font-medium">$USDC Base</span></div>
            <ul className="space-y-2 text-gray-300 mb-6">
              <li>3 Songs</li>
            </ul>
            
            <ChainSwitcher requiredChainId={defaultChainId} className="w-full">
              <Button 
                onClick={handleBuySong}
                disabled={isApproving || isPurchasing || !isConnected}
                className="w-full bg-purple-500 hover:bg-purple-600 py-3 px-6 flex items-center justify-center gap-2"
              >
                {isApproving ? (
                  <>
                    <Spinner size="sm" />
                    <span>Approving...</span>
                  </>
                ) : isPurchasing ? (
                  <>
                    <Spinner size="sm" />
                    <span>Purchasing...</span>
                  </>
                ) : (
                  'Buy'
                )}
              </Button>
            </ChainSwitcher>
          </div>
        </div>
        </>
      )}

      {/* Credits Widget - shown below starter pack for first time users */}
      {isFirstPurchase && isConnected && (voiceCredits > 0 || songCredits > 0) && (
        <CreditsWidget 
          balance={balance}
          voiceCredits={voiceCredits}
          songCredits={songCredits}
          hidePricingButton={true}
        />
      )}

      {/* FAQ */}
      <div className="mt-12">
        <h2 className="text-2xl font-bold mb-8 text-center text-white">{t('faq.title')}</h2>
        <div className="space-y-6">
          <div>
            <h3 className="font-semibold mb-2 text-white text-lg">{t('faq.howDoesItWork.question')}</h3>
            <p className="text-neutral-50 text-base">{t('faq.howDoesItWork.answer')}</p>
          </div>
          <div>
            <h3 className="font-semibold mb-2 text-white text-lg">{t('faq.whatAreSongCredits.question')}</h3>
            <p className="text-neutral-50 text-base">{t('faq.whatAreSongCredits.answer')}</p>
          </div>
          <div>
            <h3 className="font-semibold mb-2 text-white text-lg">{t('faq.whatAreVoiceCredits.question')}</h3>
            <p className="text-neutral-50 text-base">{t('faq.whatAreVoiceCredits.answer')}</p>
          </div>
          <div>
            <h3 className="font-semibold mb-2 text-white text-lg">{t('faq.whyPayGas.question')}</h3>
            <p className="text-neutral-50 text-base">{t('faq.whyPayGas.answer')}</p>
          </div>
          <div>
            <h3 className="font-semibold mb-2 text-white text-lg">{t('faq.isThisNew.question')}</h3>
            <p className="text-neutral-50 text-base">{t('faq.isThisNew.answer')}</p>
          </div>
          <div>
            <h3 className="font-semibold mb-2 text-white text-lg">{t('faq.moreComingSoon.question')}</h3>
            <p className="text-neutral-50 text-base">{t('faq.moreComingSoon.answer')}</p>
          </div>
          <div>
            <h3 className="font-semibold mb-2 text-white text-lg">{t('faq.justEnglish.question')}</h3>
            <p className="text-neutral-50 text-base">{t('faq.justEnglish.answer')}</p>
          </div>
          <div>
            <h3 className="font-semibold mb-2 text-white text-lg">{t('faq.isOpenSource.question')}</h3>
            <p className="text-neutral-50 text-base">
              {t('faq.isOpenSource.answer')}{' '}
              <a href="https://github.com/technohippies/karaoke-dapp" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline">
                GitHub
              </a>{' '}
              and{' '}
              <a href="https://app.radicle.xyz/nodes/rosa.radicle.xyz/rad:zjAPSYMsctUsESkgc9XqTgcstWUH" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline">
                Radicle.xyz
              </a>.
            </p>
          </div>
        </div>
      </div>
          </div>
        </div>
      </div>
    </div>
  )
}