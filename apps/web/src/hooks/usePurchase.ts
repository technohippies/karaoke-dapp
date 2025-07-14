import { useState, useEffect } from 'react'
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { KARAOKE_STORE_V5_ADDRESS, KARAOKE_STORE_V5_ABI, USDC_ADDRESS, USDC_ABI, COMBO_PRICE } from '../constants'

export function usePurchase() {
  const { address, isConnected } = useAccount()
  const [isApproving, setIsApproving] = useState(false)
  const [isPurchasing, setIsPurchasing] = useState(false)

  // Read contract data
  const { data: usdcBalance, refetch: refetchBalance } = useReadContract({
    address: USDC_ADDRESS,
    abi: USDC_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
  })

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: USDC_ADDRESS,
    abi: USDC_ABI,
    functionName: 'allowance',
    args: address ? [address, KARAOKE_STORE_V5_ADDRESS] : undefined,
  })

  const { data: voiceCredits, refetch: refetchVoiceCredits } = useReadContract({
    address: KARAOKE_STORE_V5_ADDRESS,
    abi: KARAOKE_STORE_V5_ABI,
    functionName: 'voiceCredits',
    args: address ? [address] : undefined,
  })

  const { data: songCredits, refetch: refetchSongCredits } = useReadContract({
    address: KARAOKE_STORE_V5_ADDRESS,
    abi: KARAOKE_STORE_V5_ABI,
    functionName: 'songCredits',
    args: address ? [address] : undefined,
  })

  // Write contracts
  const { writeContract: approveUSDC, data: approveHash } = useWriteContract()
  const { writeContract: buyCombo, data: buyHash } = useWriteContract()
  const { writeContract: buyVoice, data: buyVoiceHash } = useWriteContract()
  const { writeContract: buySong, data: buySongHash } = useWriteContract()

  // Wait for transactions
  const { isSuccess: isApproveSuccess } = useWaitForTransactionReceipt({ hash: approveHash })
  const { isSuccess: isBuySuccess } = useWaitForTransactionReceipt({ hash: buyHash })
  const { isSuccess: isBuyVoiceSuccess } = useWaitForTransactionReceipt({ hash: buyVoiceHash })
  const { isSuccess: isBuySongSuccess } = useWaitForTransactionReceipt({ hash: buySongHash })

  // Computed values
  const balance = usdcBalance ? (Number(usdcBalance) / 1_000_000).toFixed(2) : '0.00'
  const hasAllowance = Number(allowance || 0) >= Number(COMBO_PRICE)
  const isFirstPurchase = Number(voiceCredits || 0) === 0 && Number(songCredits || 0) === 0

  // Debug logging
  console.log('🔍 Raw contract data:', { 
    voiceCredits, 
    songCredits, 
    usdcBalance,
    allowance 
  })

  // Handle approve success
  useEffect(() => {
    if (isApproveSuccess) {
      console.log('✅ Approval successful!')
      setIsApproving(false)
      refetchAllowance()
    }
  }, [isApproveSuccess, refetchAllowance])

  // Handle purchase success
  useEffect(() => {
    if (isBuySuccess || isBuyVoiceSuccess || isBuySongSuccess) {
      console.log('✅ Purchase successful!')
      setIsPurchasing(false)
      refetchBalance()
      refetchVoiceCredits()
      refetchSongCredits()
      refetchAllowance()
    }
  }, [isBuySuccess, isBuyVoiceSuccess, isBuySongSuccess, refetchBalance, refetchVoiceCredits, refetchSongCredits, refetchAllowance])

  const handleApprove = () => {
    if (!address) return
    console.log('🔐 Approving USDC...')
    setIsApproving(true)
    approveUSDC({
      address: USDC_ADDRESS,
      abi: USDC_ABI,
      functionName: 'approve',
      args: [KARAOKE_STORE_V5_ADDRESS, COMBO_PRICE],
    })
  }

  const handlePurchaseCombo = () => {
    if (!address) return
    console.log('💳 Purchasing combo...')
    setIsPurchasing(true)
    buyCombo({
      address: KARAOKE_STORE_V5_ADDRESS,
      abi: KARAOKE_STORE_V5_ABI,
      functionName: 'buyCombopack',
    })
  }

  const handlePurchaseVoice = () => {
    if (!address) return
    console.log('💳 Purchasing voice pack...')
    setIsPurchasing(true)
    buyVoice({
      address: KARAOKE_STORE_V5_ADDRESS,
      abi: KARAOKE_STORE_V5_ABI,
      functionName: 'buyVoicePack',
    })
  }

  const handlePurchaseSong = () => {
    if (!address) return
    console.log('💳 Purchasing song pack...')
    setIsPurchasing(true)
    buySong({
      address: KARAOKE_STORE_V5_ADDRESS,
      abi: KARAOKE_STORE_V5_ABI,
      functionName: 'buySongPack',
    })
  }

  return {
    // State
    isConnected,
    address,
    isApproving,
    isPurchasing,
    
    // Data
    balance,
    voiceCredits: Number(voiceCredits || 0),
    songCredits: Number(songCredits || 0),
    hasAllowance,
    isFirstPurchase,
    
    // Actions
    handleApprove,
    handlePurchaseCombo,
    handlePurchaseVoice,
    handlePurchaseSong,
  }
}