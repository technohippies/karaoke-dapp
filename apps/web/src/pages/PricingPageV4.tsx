import { usePurchaseV4 } from '../hooks/usePurchaseV4'
import { SimpleHeader } from '../components/SimpleHeader'
import { Spinner } from '../components/ui/spinner'
import { Button } from '../components/ui/button'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { PurchaseSuccessBanner } from '../components/PurchaseSuccessBanner'
import { defaultChainId } from '../config/networks.config'
import { useTranslation } from 'react-i18next'
import { useWalletAuth } from '../hooks/useWalletAuth'
import { COMBO_PRICE_ETH_DISPLAY, VOICE_PACK_PRICE_ETH_DISPLAY, SONG_PACK_PRICE_ETH_DISPLAY } from '../constants/pricingV4'

export function PricingPageV4() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { t } = useTranslation()
  const walletAuth = useWalletAuth()
  const {
    isConnected,
    isPurchasing,
    voiceCredits,
    songCredits,
    isFirstPurchase,
    lastPurchase,
    handleBuyCombo,
    handleBuyVoice,
    handleBuySong,
  } = usePurchaseV4()

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
      {lastPurchase && (
        <PurchaseSuccessBanner 
          purchaseType={lastPurchase.type}
          timestamp={lastPurchase.timestamp}
        />
      )}
      
      <div className="space-y-8">
        {/* Starter Pack - Only show for first-time buyers */}
        {isFirstPurchase && (
        <div className="rounded-lg p-8 bg-neutral-800 border border-neutral-700 text-center">
          <h3 className="text-3xl font-bold mb-6 text-white">{t('pricing.starterPack')}</h3>
          <div className="text-4xl font-bold text-blue-400 mb-6">{COMBO_PRICE_ETH_DISPLAY} <span className="text-sm text-neutral-400 font-medium">$ETH (Base)</span></div>
          <div className="grid grid-cols-2 gap-4 mb-6 mt-6">
            <div className="rounded-lg p-4 text-center border border-neutral-700">
              <p className="text-3xl font-bold text-yellow-400">3</p>
              <p className="text-sm text-neutral-400">{t('pricing.songs')}</p>
            </div>
            <div className="rounded-lg p-4 text-center border border-neutral-700">
              <p className="text-3xl font-bold text-green-400">2K</p>
              <p className="text-sm text-neutral-400">{t('pricing.voiceCredits')}</p>
            </div>
          </div>
          
          {/* Buy Button */}
          {!isConnected ? (
            <Button 
              onClick={() => walletAuth.connect()} 
              variant="default"
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 rounded-lg"
            >
              {t('common.login')}
            </Button>
          ) : (
            <Button 
              onClick={handleBuyCombo}
              disabled={isPurchasing}
              variant="default"
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 rounded-lg disabled:opacity-50"
            >
              {isPurchasing ? (
                <span className="flex items-center justify-center">
                  <Spinner className="mr-2" />
                  {t('pricing.purchasing')}
                </span>
              ) : (
                t('pricing.buyNow')
              )}
            </Button>
          )}
        </div>
        )}

        {/* More Credits - Only show when NOT showing starter pack */}
        {!isFirstPurchase && (
        <div className="mt-12">
          <h3 className="text-2xl font-bold mb-6 text-white">{t('pricing.buyMore')}</h3>
          <div className="grid md:grid-cols-2 gap-6">
            
            {/* Voice Pack */}
            <div className="rounded-lg p-6 bg-neutral-800 border border-neutral-700">
              <h3 className="text-2xl font-bold mb-2 text-white">{t('pricing.voiceCredits')}</h3>
              <div className="text-4xl font-bold text-green-400 mb-2">{VOICE_PACK_PRICE_ETH_DISPLAY} <span className="text-sm text-neutral-400 font-medium">$ETH (Base)</span></div>
              <ul className="space-y-2 text-gray-300 mb-6">
                <li>2k {t('pricing.voiceCredits')}</li>
              </ul>
              {!isConnected ? (
                <Button 
                  onClick={() => walletAuth.connect()} 
                  variant="default"
                  className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-2 rounded-lg"
                >
                  {t('common.login')}
                </Button>
              ) : (
                <Button 
                  onClick={handleBuyVoice}
                  disabled={isPurchasing}
                  variant="default"
                  className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-2 rounded-lg disabled:opacity-50"
                >
                  {isPurchasing ? (
                    <span className="flex items-center justify-center">
                      <Spinner className="mr-2" />
                      {t('pricing.purchasing')}
                    </span>
                  ) : (
                    t('pricing.buyNow')
                  )}
                </Button>
              )}
            </div>
            
            {/* Song Pack */}
            <div className="rounded-lg p-6 bg-neutral-800 border border-neutral-700">
              <h3 className="text-2xl font-bold mb-2 text-white">{t('pricing.songs')}</h3>
              <div className="text-4xl font-bold text-purple-400 mb-2">{SONG_PACK_PRICE_ETH_DISPLAY} <span className="text-sm text-neutral-400 font-medium">$ETH (Base)</span></div>
              <ul className="space-y-2 text-gray-300 mb-6">
                <li>3 Songs</li>
              </ul>
              {!isConnected ? (
                <Button 
                  onClick={() => walletAuth.connect()} 
                  variant="default"
                  className="w-full bg-purple-500 hover:bg-purple-600 text-white font-bold py-2 rounded-lg"
                >
                  {t('common.login')}
                </Button>
              ) : (
                <Button 
                  onClick={handleBuySong}
                  disabled={isPurchasing}
                  variant="default"
                  className="w-full bg-purple-500 hover:bg-purple-600 text-white font-bold py-2 rounded-lg disabled:opacity-50"
                >
                  {isPurchasing ? (
                    <span className="flex items-center justify-center">
                      <Spinner className="mr-2" />
                      {t('pricing.purchasing')}
                    </span>
                  ) : (
                    t('pricing.buyNow')
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
        )}
      </div>
      
      {/* FAQ */}
      <div className="mt-12">
        <h2 className="text-2xl font-bold mb-8 text-white">{t('faq.title')}</h2>
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