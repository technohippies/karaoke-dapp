import { useKaraokeMachineContext } from '../contexts/KaraokeMachineContext'
import './CreditPurchase.css'

export function CreditPurchase() {
  const { state, context, handleApproveUSDC, handleBuyCredits, isApprovePending, isBuyPending } = useKaraokeMachineContext()
  
  const needsApproval = !context.hasUsdcAllowance
  const usdcBalance = parseFloat(context.usdcBalance)
  const hasEnoughUsdc = usdcBalance >= 3.00
  
  return (
    <div className="credit-purchase">
      <h2>Get Started with Karaoke Credits</h2>
      
      <div className="credit-info">
        <div className="credit-card">
          <h3>🎤 Voice Credits</h3>
          <p className="credit-amount">{context.voiceCredits}</p>
          <p className="credit-desc">For karaoke sessions</p>
        </div>
        
        <div className="credit-card">
          <h3>🎵 Song Credits</h3>
          <p className="credit-amount">{context.songCredits}</p>
          <p className="credit-desc">To unlock songs</p>
        </div>
      </div>
      
      <div className="purchase-section">
        <div className="combo-offer">
          <h3>Starter Combo</h3>
          <p className="combo-price">$3.00 USDC</p>
          <ul className="combo-contents">
            <li>10 Voice Credits</li>
            <li>3 Song Credits</li>
            <li>Unlock any 3 songs</li>
            <li>2 full karaoke sessions</li>
          </ul>
        </div>
        
        <div className="balance-info">
          <p>Your USDC Balance: <strong>${context.usdcBalance}</strong></p>
          {!hasEnoughUsdc && (
            <p className="warning">You need at least $3.00 USDC to purchase</p>
          )}
        </div>
        
        {needsApproval ? (
          <button 
            onClick={handleApproveUSDC}
            disabled={isApprovePending || !hasEnoughUsdc}
          >
            {isApprovePending ? 'Approving...' : 'Approve USDC'}
          </button>
        ) : (
          <button 
            onClick={handleBuyCredits}
            disabled={isBuyPending || !hasEnoughUsdc}
          >
            {isBuyPending ? 'Purchasing...' : 'Buy Credits'}
          </button>
        )}
      </div>
    </div>
  )
}