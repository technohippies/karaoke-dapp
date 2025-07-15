import { usePurchase } from '../hooks/usePurchase'
import { Header } from '../components/Header'
import { Spinner } from '../components/ui/spinner'
import { Button } from '../components/ui/button'
import { useNavigate } from 'react-router-dom'

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

  const handleLogin = () => {
    console.log('Connect wallet clicked')
  }

  const handleAccount = () => {
    console.log('Account clicked')
  }

  return (
    <div className="min-h-screen bg-neutral-900 relative overflow-hidden">
      {/* Content */}
      <div className="relative z-10 h-screen flex flex-col">
        <Header 
          isLoggedIn={isConnected}
          address={address}
          onLogin={handleLogin}
          onAccount={handleAccount}
          crownCount={voiceCredits}
          fireCount={songCredits}
          showBack={true}
          onBack={() => navigate('/')}
        />
        
        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          <div className="w-full max-w-2xl mx-auto px-6 pt-8 pb-24">
        <h1 className="text-2xl font-bold text-white mb-6">Pricing</h1>
      
      {isFirstPurchase && (
        <div className="max-w-2xl mx-auto mb-16">
          <div className="rounded-2xl p-8 border-2 border-blue-500 bg-blue-500/10">
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
            )}
          </div>
        </div>
      )}

      {!isFirstPurchase && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-16">
          {/* Voice Pack */}
          <div className="rounded-2xl p-8 border border-gray-600 bg-gray-800/50">
            <h3 className="text-2xl font-bold mb-2 text-white">Voice Pack</h3>
            <div className="text-4xl font-bold text-green-400 mb-2">$1</div>
            <ul className="space-y-2 text-gray-300 mb-6">
              <li>50 Voice Credits</li>
            </ul>
            
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
          </div>

          {/* Song Pack */}
          <div className="rounded-2xl p-8 border border-gray-600 bg-gray-800/50">
            <h3 className="text-2xl font-bold mb-2 text-white">Song Pack</h3>
            <div className="text-4xl font-bold text-purple-400 mb-2">$2</div>
            <ul className="space-y-2 text-gray-300 mb-6">
              <li>5 Song Credits</li>
            </ul>
            
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
          </div>
        </div>
      )}

      {/* Wallet Info */}
      {isConnected && (
        <div className="max-w-md mx-auto bg-gray-800 rounded-lg p-4">
          <h3 className="font-semibold mb-2">Wallet Info</h3>
          <div className="space-y-1 text-sm">
            <p>USDC Balance: <span className="font-mono">${balance}</span></p>
            <p>Voice Credits: <span className="font-mono">{voiceCredits}</span></p>
            <p>Song Credits: <span className="font-mono">{songCredits}</span></p>
          </div>
        </div>
      )}

      {/* FAQ */}
      <div className="max-w-2xl mx-auto mt-16">
        <h2 className="text-2xl font-bold mb-8 text-center">FAQ</h2>
        <div className="space-y-6">
          <div>
            <h3 className="font-semibold mb-2">What are Voice Credits?</h3>
            <p className="text-gray-400">Voice Credits are used during karaoke sessions for AI voice grading and feedback.</p>
          </div>
          <div>
            <h3 className="font-semibold mb-2">What are Song Credits?</h3>
            <p className="text-gray-400">Song Credits unlock individual songs, giving you access to lyrics and backing tracks.</p>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Why the Starter Pack?</h3>
            <p className="text-gray-400">New users get the best value with 100 Voice Credits + 10 Song Credits for just $3.</p>
          </div>
        </div>
      </div>
          </div>
        </div>
      </div>
    </div>
  )
}