import { useState, useEffect } from 'react'
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { KARAOKE_CONTRACT_ADDRESS, USDC_ADDRESS, USDC_ABI } from '../constants'
import { COMBO_PRICE, VOICE_PACK_PRICE, SONG_PACK_PRICE } from '../constants/pricing'
import { KARAOKE_SCHOOL_ABI } from '../contracts/abis/KaraokeSchool'
import { useCountry } from './useCountry'

export function usePurchase() {
  const { address, isConnected } = useAccount()
  const { country, hasCountry } = useCountry()
  const [isApproving, setIsApproving] = useState(false)
  const [isPurchasing, setIsPurchasing] = useState(false)
  const [pendingPurchase, setPendingPurchase] = useState<'combo' | 'voice' | 'song' | null>(null)
  const [lastPurchase, setLastPurchase] = useState<{ type: 'combo' | 'voice' | 'song', timestamp: number } | null>(null)

  // Read contract data
  const { data: usdcBalance, refetch: refetchBalance } = useReadContract({
    address: USDC_ADDRESS,
    abi: USDC_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  })

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: USDC_ADDRESS,
    abi: USDC_ABI,
    functionName: 'allowance',
    args: address ? [address, KARAOKE_CONTRACT_ADDRESS] : undefined,
    query: { enabled: !!address },
  })

  const { data: voiceCredits, refetch: refetchVoiceCredits, isLoading: isLoadingVoiceCredits } = useReadContract({
    address: KARAOKE_CONTRACT_ADDRESS,
    abi: KARAOKE_SCHOOL_ABI,
    functionName: 'voiceCredits',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  })

  const { data: songCredits, refetch: refetchSongCredits } = useReadContract({
    address: KARAOKE_CONTRACT_ADDRESS,
    abi: KARAOKE_SCHOOL_ABI,
    functionName: 'songCredits',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
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
  const hasComboAllowance = Number(allowance || 0) >= Number(COMBO_PRICE)
  const hasVoiceAllowance = Number(allowance || 0) >= Number(VOICE_PACK_PRICE)
  const hasSongAllowance = Number(allowance || 0) >= Number(SONG_PACK_PRICE)
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
    if (isApproveSuccess && pendingPurchase) {
      console.log('✅ Approval successful!')
      setIsApproving(false)
      refetchAllowance()
      // Auto-trigger purchase after approval
      setTimeout(() => {
        if (pendingPurchase === 'combo') {
          handlePurchaseCombo()
        } else if (pendingPurchase === 'voice') {
          handlePurchaseVoice()
        } else if (pendingPurchase === 'song') {
          handlePurchaseSong()
        }
        setPendingPurchase(null)
      }, 1000)
    }
  }, [isApproveSuccess, pendingPurchase, refetchAllowance])

  // Handle purchase success
  useEffect(() => {
    if (isBuySuccess || isBuyVoiceSuccess || isBuySongSuccess) {
      const packType = isBuySuccess ? 'combo' : isBuyVoiceSuccess ? 'voice' : 'song'
      const txHash = isBuySuccess ? buyHash : isBuyVoiceSuccess ? buyVoiceHash : buySongHash
      
      console.log('✅ Purchase successful!', {
        packType,
        country: country || 'Unknown',
        txHash,
        timestamp: new Date().toISOString()
      })
      
      setIsPurchasing(false)
      setLastPurchase({ type: packType, timestamp: Date.now() })
      
      // Add delay before refetching to ensure blockchain state is updated
      setTimeout(() => {
        console.log('🔄 Refetching balances...')
        refetchBalance()
        refetchVoiceCredits()
        refetchSongCredits()
        refetchAllowance()
      }, 2000) // 2 second delay
    }
  }, [isBuySuccess, isBuyVoiceSuccess, isBuySongSuccess, buyHash, buyVoiceHash, buySongHash, country, refetchBalance, refetchVoiceCredits, refetchSongCredits, refetchAllowance])

  const handleApprove = (amount: bigint) => {
    if (!address) return
    console.log('🔐 Approving USDC...', {
      usdcAddress: USDC_ADDRESS,
      karaokeContract: KARAOKE_CONTRACT_ADDRESS,
      amount: amount.toString(),
      hasAddress: !!address,
    })
    setIsApproving(true)
    approveUSDC({
      address: USDC_ADDRESS,
      abi: USDC_ABI,
      functionName: 'approve',
      args: [KARAOKE_CONTRACT_ADDRESS, amount],
    })
  }

  const handlePurchaseCombo = () => {
    if (!address || !country) return
    console.log('💳 Purchasing combo...')
    setIsPurchasing(true)
    buyCombo({
      address: KARAOKE_CONTRACT_ADDRESS,
      abi: KARAOKE_SCHOOL_ABI,
      functionName: 'buyCombopack',
      args: [country],
    })
  }

  const handlePurchaseVoice = () => {
    if (!address || !country) return
    console.log('💳 Purchasing voice pack...')
    setIsPurchasing(true)
    buyVoice({
      address: KARAOKE_CONTRACT_ADDRESS,
      abi: KARAOKE_SCHOOL_ABI,
      functionName: 'buyVoicePack',
      args: [country],
    })
  }

  const handlePurchaseSong = () => {
    if (!address || !country) return
    console.log('💳 Purchasing song pack...')
    setIsPurchasing(true)
    buySong({
      address: KARAOKE_CONTRACT_ADDRESS,
      abi: KARAOKE_SCHOOL_ABI,
      functionName: 'buySongPack',
      args: [country],
    })
  }

  // Single-click purchase functions
  const handleBuyCombo = () => {
    if (!hasCountry) {
      console.warn('❌ Cannot purchase without country selection')
      return
    }
    if (!hasComboAllowance) {
      setPendingPurchase('combo')
      handleApprove(COMBO_PRICE)
    } else {
      handlePurchaseCombo()
    }
  }

  const handleBuyVoice = () => {
    if (!hasCountry) {
      console.warn('❌ Cannot purchase without country selection')
      return
    }
    if (!hasVoiceAllowance) {
      setPendingPurchase('voice')
      handleApprove(VOICE_PACK_PRICE)
    } else {
      handlePurchaseVoice()
    }
  }

  const handleBuySong = () => {
    if (!hasCountry) {
      console.warn('❌ Cannot purchase without country selection')
      return
    }
    if (!hasSongAllowance) {
      setPendingPurchase('song')
      handleApprove(SONG_PACK_PRICE)
    } else {
      handlePurchaseSong()
    }
  }

  return {
    // State
    isConnected,
    address,
    isApproving,
    isPurchasing,
    hasCountry,
    lastPurchase,
    isLoadingCredits: isLoadingVoiceCredits,
    
    // Data
    balance,
    voiceCredits: Number(voiceCredits || 0),
    songCredits: Number(songCredits || 0),
    hasComboAllowance,
    hasVoiceAllowance,
    hasSongAllowance,
    isFirstPurchase,
    
    // Actions (single-click)
    handleBuyCombo,
    handleBuyVoice,
    handleBuySong,
    
    // Low-level actions
    handleApprove,
    handlePurchaseCombo,
    handlePurchaseVoice,
    handlePurchaseSong,
  }
}