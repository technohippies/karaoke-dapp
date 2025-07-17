import { usePurchase } from '../hooks/usePurchase'
import { HeaderWithAuth } from '../components/HeaderWithAuth'
import { Spinner } from '../components/ui/spinner'
import { Button } from '../components/ui/button'
import { useNavigate } from 'react-router-dom'
import { ChainSwitcher } from '../components/ChainSwitcher'
import { CreditsWidget } from '../components/CreditsWidget'
import { BASE_SEPOLIA_CHAIN_ID, BASE_MAINNET_CHAIN_ID } from '../constants'

export function PricingPage() {
  const navigate = useNavigate()
  const {
    isConnected,
    address,
    isApproving,
    isPurchasing,
    balance,
    voiceCredits,
    songCredits,
    isFirstPurchase,
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
      
      {/* Purchase Options */}
      {isFirstPurchase ? (
        // Starter Pack for new users
        <div className="mb-8">
          <div className="rounded-lg p-6 bg-neutral-800 border border-neutral-700">
            <h3 className="text-2xl font-bold mb-2 text-white">Starter Pack</h3>
            <div className="text-4xl font-bold text-blue-400 mb-2">$3</div>
            <ul className="space-y-2 text-gray-300 mb-6">
              <li>100 Voice Credits</li>
              <li>10 Song Credits</li>
            </ul>
            
            {!isConnected ? (
              <Button className="w-full bg-white text-black py-3 px-6" disabled>
                Connect Wallet to Purchase
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
            )}
          </div>
        </div>
      ) : (
        // Additional packs for existing users
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Voice Pack */}
          <div className="rounded-lg p-6 bg-neutral-800 border border-neutral-700">
            <h3 className="text-2xl font-bold mb-2 text-white">Voice Pack</h3>
            <div className="text-4xl font-bold text-green-400 mb-2">$1</div>
            <ul className="space-y-2 text-gray-300 mb-6">
              <li>50 Voice Credits</li>
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
            <h3 className="text-2xl font-bold mb-2 text-white">Song Pack</h3>
            <div className="text-4xl font-bold text-purple-400 mb-2">$2</div>
            <ul className="space-y-2 text-gray-300 mb-6">
              <li>5 Song Credits</li>
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
      )}

      {/* Credits Widget */}
      {isConnected && (
        <CreditsWidget 
          balance={balance}
          voiceCredits={voiceCredits}
          songCredits={songCredits}
        />
      )}

      {/* FAQ */}
      <div className="mt-12">
        <h2 className="text-2xl font-bold mb-6 text-center text-white">FAQ</h2>
        <div className="space-y-4">
          <div className="bg-neutral-800 rounded-lg p-4 border border-neutral-700">
            <h3 className="font-semibold mb-2 text-white">What are Voice Credits?</h3>
            <p className="text-neutral-400 text-sm">Voice Credits are used during karaoke sessions for AI voice grading and feedback.</p>
          </div>
          <div className="bg-neutral-800 rounded-lg p-4 border border-neutral-700">
            <h3 className="font-semibold mb-2 text-white">What are Song Credits?</h3>
            <p className="text-neutral-400 text-sm">Song Credits unlock individual songs, giving you access to lyrics and backing tracks.</p>
          </div>
          <div className="bg-neutral-800 rounded-lg p-4 border border-neutral-700">
            <h3 className="font-semibold mb-2 text-white">Why the Starter Pack?</h3>
            <p className="text-neutral-400 text-sm">New users get the best value with 100 Voice Credits + 10 Song Credits for just $3.</p>
          </div>
        </div>
      </div>
          </div>
        </div>
      </div>
    </div>
  )
}