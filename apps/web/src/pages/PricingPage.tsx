import { usePurchase } from '../hooks/usePurchase'
import { HeaderWithAuth } from '../components/HeaderWithAuth'
import { Spinner } from '../components/ui/spinner'
import { Button } from '../components/ui/button'
import { useNavigate } from 'react-router-dom'
import { ChainSwitcher } from '../components/ChainSwitcher'
import { CreditsWidget } from '../components/CreditsWidget'
import { PurchaseSuccessBanner } from '../components/PurchaseSuccessBanner'
import { BASE_SEPOLIA_CHAIN_ID, BASE_MAINNET_CHAIN_ID } from '../constants'
import { useTranslation } from 'react-i18next'

export function PricingPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const {
    isConnected,
    address,
    isApproving,
    isPurchasing,
    hasCountry,
    balance,
    voiceCredits,
    songCredits,
    isFirstPurchase,
    lastPurchase,
    handleBuyCombo,
    handleBuyVoice,
    handleBuySong,
  } = usePurchase()


  return (
    <div className="min-h-screen bg-neutral-900 relative overflow-hidden">
      {/* Content */}
      <div className="relative z-10 h-screen flex flex-col">
        <HeaderWithAuth 
          crownCount={0}
          fireCount={0}
          showBack={true}
          onBack={() => navigate('/')}
        />
        
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
          <div className="rounded-lg p-6 bg-neutral-800 border border-neutral-700">
            <h3 className="text-2xl font-bold mb-2 text-white">{t('pricing.starterPack')}</h3>
            <div className="text-4xl font-bold text-blue-400 mb-2">$3 <span className="text-sm text-gray-400">($ETH on Base)</span></div>
            <ul className="space-y-2 text-gray-300 mb-6">
              <li>100 {t('pricing.voiceCredits')}</li>
              <li>10 {t('pricing.songCredits')}</li>
            </ul>
            
            {!isConnected ? (
              <Button className="w-full bg-white text-black py-3 px-6" disabled>
                {t('pricing.connectToPurchase')}
              </Button>
            ) : (
              <ChainSwitcher requiredChainId={BASE_SEPOLIA_CHAIN_ID} className="w-full">
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
          </div>
        </div>
      ) : (
        <>
          {/* Credits Widget - shown above purchase options for existing users */}
          {isConnected && (
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
            <div className="text-4xl font-bold text-green-400 mb-2">$1 <span className="text-sm text-gray-400">($ETH on Base)</span></div>
            <ul className="space-y-2 text-gray-300 mb-6">
              <li>50 {t('pricing.voiceCredits')}</li>
            </ul>
            
            <ChainSwitcher requiredChainId={BASE_MAINNET_CHAIN_ID} className="w-full">
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
            <div className="text-4xl font-bold text-purple-400 mb-2">$2 <span className="text-sm text-gray-400">($ETH on Base)</span></div>
            <ul className="space-y-2 text-gray-300 mb-6">
              <li>5 {t('pricing.songCredits')}</li>
            </ul>
            
            <ChainSwitcher requiredChainId={BASE_MAINNET_CHAIN_ID} className="w-full">
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
      {isFirstPurchase && isConnected && (
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
            <p className="text-neutral-50 text-md">{t('faq.howDoesItWork.answer')}</p>
          </div>
          <div>
            <h3 className="font-semibold mb-2 text-white text-lg">{t('faq.whatAreSongCredits.question')}</h3>
            <p className="text-neutral-50 text-md">{t('faq.whatAreSongCredits.answer')}</p>
          </div>
          <div>
            <h3 className="font-semibold mb-2 text-white text-lg">{t('faq.whatAreVoiceCredits.question')}</h3>
            <p className="text-neutral-50 text-md">{t('faq.whatAreVoiceCredits.answer')}</p>
          </div>
          <div>
            <h3 className="font-semibold mb-2 text-white text-lg">{t('faq.whyPayGas.question')}</h3>
            <p className="text-neutral-50 text-md">{t('faq.whyPayGas.answer')}</p>
          </div>
          <div>
            <h3 className="font-semibold mb-2 text-white text-lg">{t('faq.isThisNew.question')}</h3>
            <p className="text-neutral-50 text-md">{t('faq.isThisNew.answer')}</p>
          </div>
          <div>
            <h3 className="font-semibold mb-2 text-white text-lg">{t('faq.whereDoesMoneyGo.question')}</h3>
            <p className="text-neutral-50 text-md whitespace-pre-line">{t('faq.whereDoesMoneyGo.answer')}</p>
          </div>
          <div>
            <h3 className="font-semibold mb-2 text-white text-lg">{t('faq.moreComingSoon.question')}</h3>
            <p className="text-neutral-50 text-md">{t('faq.moreComingSoon.answer')}</p>
          </div>
          <div>
            <h3 className="font-semibold mb-2 text-white text-lg">{t('faq.justEnglish.question')}</h3>
            <p className="text-neutral-50 text-md">{t('faq.justEnglish.answer')}</p>
          </div>
          <div>
            <h3 className="font-semibold mb-2 text-white text-lg">{t('faq.isOpenSource.question')}</h3>
            <p className="text-neutral-50 text-md">
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