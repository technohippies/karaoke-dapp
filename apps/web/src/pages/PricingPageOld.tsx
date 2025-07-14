import React from 'react'
import { useMachine } from '@xstate/react'
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { useEffect } from 'react'
import { PricingPage as PricingPageComponent } from '../components/PricingPage'
import { pricingMachine } from '../machines/pricingMachine'
import { 
  KARAOKE_STORE_V5_ADDRESS, 
  KARAOKE_STORE_V5_ABI, 
  USDC_ADDRESS, 
  USDC_ABI, 
  COMBO_PRICE 
} from '../constants'

export function PricingPage() {
  const [state, send] = useMachine(pricingMachine)
  const { address, isConnected } = useAccount()
  
  // Check user's purchase history to determine if first purchase
  const { data: voiceCreditsData, refetch: refetchVoiceCredits } = useReadContract({
    address: KARAOKE_STORE_V5_ADDRESS,
    abi: KARAOKE_STORE_V5_ABI,
    functionName: 'voiceCredits',
    args: address ? [address] : undefined,
    enabled: !!address,
  })
  
  const { data: songCreditsData, refetch: refetchSongCredits } = useReadContract({
    address: KARAOKE_STORE_V5_ADDRESS,
    abi: KARAOKE_STORE_V5_ABI,
    functionName: 'songCredits',
    args: address ? [address] : undefined,
    enabled: !!address,
  })
  
  const { data: usdcBalance, refetch: refetchUsdcBalance } = useReadContract({
    address: USDC_ADDRESS,
    abi: USDC_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    enabled: !!address,
  })
  
  const { data: allowance } = useReadContract({
    address: USDC_ADDRESS,
    abi: USDC_ABI,
    functionName: 'allowance',
    args: address ? [address, KARAOKE_STORE_V5_ADDRESS] : undefined,
    enabled: !!address,
  })
  
  // Contract writes
  const { 
    writeContract: approveUSDC, 
    data: approveHash,
    isPending: isApprovePending,
    error: approveError
  } = useWriteContract()
  
  const { 
    writeContract: buyCombo, 
    data: buyComboHash,
    isPending: isBuyComboLoading,
    error: buyComboError
  } = useWriteContract()
  
  const { 
    writeContract: buyVoice, 
    data: buyVoiceHash,
    isPending: isBuyVoiceLoading,
    error: buyVoiceError
  } = useWriteContract()
  
  const { 
    writeContract: buySong, 
    data: buySongHash,
    isPending: isBuySongLoading,
    error: buySongError
  } = useWriteContract()
  
  // Wait for transactions
  const { isSuccess: isApproveSuccess } = useWaitForTransactionReceipt({ hash: approveHash })
  const { isSuccess: isBuyComboSuccess } = useWaitForTransactionReceipt({ hash: buyComboHash })
  const { isSuccess: isBuyVoiceSuccess } = useWaitForTransactionReceipt({ hash: buyVoiceHash })
  const { isSuccess: isBuySongSuccess } = useWaitForTransactionReceipt({ hash: buySongHash })
  
  // Update machine when wallet connection changes
  useEffect(() => {
    if (isConnected && address && usdcBalance !== undefined && allowance !== undefined) {
      const hasAllowance = Number(allowance) >= Number(COMBO_PRICE)
      const balance = (Number(usdcBalance) / 1_000_000).toFixed(2)
      const voiceCredits = Number(voiceCreditsData || 0)
      const songCredits = Number(songCreditsData || 0)
      const isFirstPurchase = voiceCredits === 0 && songCredits === 0
      
      console.log('🔗 Sending WALLET_CONNECTED:', { hasAllowance, balance, isFirstPurchase, voiceCreditsData, songCreditsData })
      send({ 
        type: 'WALLET_CONNECTED', 
        hasAllowance, 
        balance, 
        isFirstPurchase 
      })
    } else if (!isConnected) {
      send({ type: 'WALLET_DISCONNECTED' })
    }
  }, [isConnected, address, voiceCreditsData, songCreditsData, usdcBalance, allowance, send])
  
  // Handle transaction submissions
  useEffect(() => {
    if (approveHash) {
      send({ type: 'TRANSACTION_SUBMITTED', hash: approveHash })
    }
  }, [approveHash, send])
  
  useEffect(() => {
    if (buyComboHash || buyVoiceHash || buySongHash) {
      const hash = buyComboHash || buyVoiceHash || buySongHash
      send({ type: 'TRANSACTION_SUBMITTED', hash })
    }
  }, [buyComboHash, buyVoiceHash, buySongHash, send])
  
  // Handle transaction success
  useEffect(() => {
    if (isApproveSuccess) {
      send({ type: 'TRANSACTION_SUCCESS' })
    }
  }, [isApproveSuccess, send])
  
  useEffect(() => {
    if (isBuyComboSuccess || isBuyVoiceSuccess || isBuySongSuccess) {
      console.log('✅ Purchase successful! Refetching balances and credits...')
      send({ type: 'TRANSACTION_SUCCESS' })
      // Refetch credits AND USDC balance after successful purchase
      refetchVoiceCredits()
      refetchSongCredits()
      refetchUsdcBalance()
      console.log('📊 Refetched all balances and credits')
    }
  }, [isBuyComboSuccess, isBuyVoiceSuccess, isBuySongSuccess, send, refetchVoiceCredits, refetchSongCredits, refetchUsdcBalance])
  
  // Handle errors
  useEffect(() => {
    const error = approveError || buyComboError || buyVoiceError || buySongError
    if (error) {
      console.error('❌ Transaction error:', error)
      send({ type: 'TRANSACTION_ERROR', error: error.message })
    }
  }, [approveError, buyComboError, buyVoiceError, buySongError, send])
  
  // Log transaction states
  useEffect(() => {
    console.log('💳 Transaction states:', {
      isBuyComboLoading,
      isBuyVoiceLoading, 
      isBuySongLoading,
      buyComboHash,
      buyVoiceHash,
      buySongHash
    })
  }, [isBuyComboLoading, isBuyVoiceLoading, isBuySongLoading, buyComboHash, buyVoiceHash, buySongHash])
  
  // Log credits data
  useEffect(() => {
    console.log('💰 Credits data:', {
      address,
      voiceCreditsData,
      songCreditsData,
      isConnected
    })
  }, [address, voiceCreditsData, songCreditsData, isConnected])
  
  // Log machine state
  useEffect(() => {
    console.log('🎭 Pricing machine state:', {
      state: state.value,
      context: state.context
    })
  }, [state.value, state.context])
  
  // Log USDC data
  useEffect(() => {
    const usdcBalanceFormatted = usdcBalance ? (Number(usdcBalance) / 1_000_000).toFixed(2) : '0.00'
    const allowanceFormatted = allowance ? (Number(allowance) / 1_000_000).toFixed(2) : '0.00'
    console.log('💵 USDC data:', {
      balance: `${usdcBalanceFormatted} USDC`,
      allowance: `${allowanceFormatted} USDC`,
      needsApproval: !allowance || Number(allowance) < Number(COMBO_PRICE),
      comboPrice: (Number(COMBO_PRICE) / 1_000_000).toFixed(2) + ' USDC'
    })
  }, [usdcBalance, allowance])
  
  // Action handlers
  const handleConnectWallet = () => {
    // This would trigger wallet connection modal
    console.log('Connect wallet triggered')
  }
  
  const handleApproveUSDC = () => {
    console.log('🔐 handleApproveUSDC called, calling approveUSDC with:', {
      address: USDC_ADDRESS,
      spender: KARAOKE_STORE_V5_ADDRESS,
      amount: COMBO_PRICE
    })
    approveUSDC({
      address: USDC_ADDRESS,
      abi: USDC_ABI,
      functionName: 'approve',
      args: [KARAOKE_STORE_V5_ADDRESS, COMBO_PRICE],
    })
  }
  
  const handleSelectCombo = () => {
    send({ type: 'SELECT_COMBO' })
  }
  
  const handleSelectVoiceCredits = () => {
    send({ type: 'SELECT_VOICE_CREDITS' })
  }
  
  const handleSelectSongCredits = () => {
    send({ type: 'SELECT_SONG_CREDITS' })
  }
  
  const handlePurchase = () => {
    console.log('🛒 handlePurchase called', { 
      selectedType: state.context.selectedType, 
      state: state.value,
      hasAllowance: state.context.hasAllowance
    })
    
    // Check if we need approval first
    if (!state.context.hasAllowance) {
      console.log('🛒 Need approval first, calling handleApproveUSDC')
      handleApproveUSDC()
      return
    }
    
    if (state.context.selectedType === 'combo') {
      console.log('🛒 Calling buyCombo')
      buyCombo({
        address: KARAOKE_STORE_V5_ADDRESS,
        abi: KARAOKE_STORE_V5_ABI,
        functionName: 'buyCombopack',
      })
    } else if (state.context.selectedType === 'voice') {
      console.log('🛒 Calling buyVoice')
      buyVoice({
        address: KARAOKE_STORE_V5_ADDRESS,
        abi: KARAOKE_STORE_V5_ABI,
        functionName: 'buyVoicePack',
      })
    } else if (state.context.selectedType === 'song') {
      console.log('🛒 Calling buySong')
      buySong({
        address: KARAOKE_STORE_V5_ADDRESS,
        abi: KARAOKE_STORE_V5_ABI,
        functionName: 'buySongPack',
      })
    }
    
    console.log('🛒 Sending PURCHASE event')
    send({ type: 'PURCHASE' })
  }
  
  const handleClearError = () => {
    send({ type: 'CLEAR_ERROR' })
  }
  
  // Determine loading state
  const isLoading = state.matches('approving') || state.matches('purchasing') || 
                   isApprovePending || isBuyComboLoading || isBuyVoiceLoading || isBuySongLoading
                   
  // Always use handlePurchase - it will handle approval internally
  console.log('🔘 Purchase button will call: handlePurchase')
  
  return (
    <PricingPageComponent
      isFirstPurchase={state.context.isFirstPurchase}
      hasWallet={state.context.hasWallet}
      selectedType={state.context.selectedType}
      isLoading={isLoading}
      error={state.context.error}
      comboPrice={state.context.comboPrice}
      voiceCreditsPrice={state.context.voiceCreditsPrice}
      songCreditsPrice={state.context.songCreditsPrice}
      voiceCredits={Number(voiceCreditsData || 0)}
      songCredits={Number(songCreditsData || 0)}
      usdcBalance={usdcBalance ? (Number(usdcBalance) / 1_000_000).toFixed(2) : '0.00'}
      onConnectWallet={handleConnectWallet}
      onSelectCombo={handleSelectCombo}
      onSelectVoiceCredits={handleSelectVoiceCredits}
      onSelectSongCredits={handleSelectSongCredits}
      onPurchase={handlePurchase}
      onClearError={handleClearError}
    />
  )
}