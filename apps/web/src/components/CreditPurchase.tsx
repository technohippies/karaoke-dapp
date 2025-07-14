import { useKaraokeMachineContext } from '../contexts/KaraokeMachineContext'
import './CreditPurchase.css'

export function CreditPurchase() {
  const { state, context, handleApproveUSDC, handleBuyCredits, isApprovePending, isBuyPending } = useKaraokeMachineContext()
  
  const needsApproval = !context.hasUsdcAllowance
  const usdcBalance = parseFloat(context.usdcBalance)
  const hasEnoughUsdc = usdcBalance >= 3.00
  
  console.log('💰 CreditPurchase state:', {
    needsApproval,
    hasUsdcAllowance: context.hasUsdcAllowance,
    usdcBalance,
    hasEnoughUsdc,
    isApprovePending,
    isBuyPending
  })
  
  return (
    <div className="credit-purchase">
      
      <div className="purchase-section">
        <div className="combo-offer">
          <h3>Starter Combo</h3>
          <p className="combo-price">$3.00 USDC</p>
          <ul className="combo-contents">
            <li>100 Voice Credits</li>
            <li>2 Song Credits</li>
            <li>Unlock any 2 songs</li>
            <li>Multiple karaoke sessions</li>
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
            onClick={() => {
              console.log('🔐 Approve USDC clicked')
              handleApproveUSDC()
            }}
            disabled={isApprovePending || !hasEnoughUsdc}
          >
            {isApprovePending ? 'Approving...' : 'Approve USDC'}
          </button>
        ) : (
          <button 
            onClick={() => {
              console.log('💳 Buy Credits clicked')
              handleBuyCredits()
            }}
            disabled={isBuyPending || !hasEnoughUsdc}
          >
            {isBuyPending ? 'Purchasing...' : 'Buy Credits'}
          </button>
        )}
      </div>
    </div>
  )
}