import { useState, useEffect } from 'react'
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { KARAOKE_CONTRACT_ADDRESS } from '../constants'
import { KARAOKE_SCHOOL_V4_ABI } from '../contracts/abis/KaraokeSchoolV4'
import { useCountry } from './useCountry'

// ETH prices (in wei)
export const COMBO_PRICE = 2000000000000000n // 0.002 ETH
export const VOICE_PACK_PRICE = 1100000000000000n // 0.0011 ETH  
export const SONG_PACK_PRICE = 800000000000000n // 0.0008 ETH

export function usePurchaseV4() {
  const { address, isConnected } = useAccount()
  const { country, hasCountry } = useCountry()
  const [isPurchasing, setIsPurchasing] = useState(false)
  const [lastPurchase, setLastPurchase] = useState<{ type: 'combo' | 'voice' | 'song', timestamp: number } | null>(null)

  // Read contract data
  const { data: voiceCredits, refetch: refetchVoiceCredits, isLoading: isLoadingVoiceCredits } = useReadContract({
    address: KARAOKE_CONTRACT_ADDRESS,
    abi: KARAOKE_SCHOOL_V4_ABI,
    functionName: 'voiceCredits',
    args: address ? [address] : undefined,
    query: { 
      enabled: !!address,
    },
  })

  const { data: songCredits, refetch: refetchSongCredits } = useReadContract({
    address: KARAOKE_CONTRACT_ADDRESS,
    abi: KARAOKE_SCHOOL_V4_ABI,
    functionName: 'songCredits',
    args: address ? [address] : undefined,
    query: { 
      enabled: !!address,
    },
  })

  // Write contracts
  const { writeContract: buyCombo, data: buyHash } = useWriteContract()
  const { writeContract: buyVoice, data: buyVoiceHash } = useWriteContract()
  const { writeContract: buySong, data: buySongHash } = useWriteContract()

  // Wait for transactions
  const { isSuccess: isBuySuccess } = useWaitForTransactionReceipt({ hash: buyHash })
  const { isSuccess: isBuyVoiceSuccess } = useWaitForTransactionReceipt({ hash: buyVoiceHash })
  const { isSuccess: isBuySongSuccess } = useWaitForTransactionReceipt({ hash: buySongHash })

  // Computed values
  const isFirstPurchase = Number(voiceCredits || 0) === 0 && Number(songCredits || 0) === 0

  // Debug logging
  useEffect(() => {
    console.log('🔍 Raw contract data:', { 
      voiceCredits, 
      songCredits,
    })
  }, [voiceCredits, songCredits])

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
        refetchVoiceCredits()
        refetchSongCredits()
      }, 2000) // 2 second delay
    }
  }, [isBuySuccess, isBuyVoiceSuccess, isBuySongSuccess, buyHash, buyVoiceHash, buySongHash, country, refetchVoiceCredits, refetchSongCredits])

  const handlePurchaseCombo = () => {
    if (!address || !country) return
    console.log('💳 Purchasing combo with ETH...')
    setIsPurchasing(true)
    buyCombo({
      address: KARAOKE_CONTRACT_ADDRESS,
      abi: KARAOKE_SCHOOL_V4_ABI,
      functionName: 'buyCombopack',
      args: [country],
      value: COMBO_PRICE,
      gas: 200000n,
    })
  }

  const handlePurchaseVoice = () => {
    if (!address || !country) return
    console.log('💳 Purchasing voice pack with ETH...')
    setIsPurchasing(true)
    buyVoice({
      address: KARAOKE_CONTRACT_ADDRESS,
      abi: KARAOKE_SCHOOL_V4_ABI,
      functionName: 'buyVoicePack',
      args: [country],
      value: VOICE_PACK_PRICE,
      gas: 200000n,
    })
  }

  const handlePurchaseSong = () => {
    if (!address || !country) return
    console.log('💳 Purchasing song pack with ETH...')
    setIsPurchasing(true)
    buySong({
      address: KARAOKE_CONTRACT_ADDRESS,
      abi: KARAOKE_SCHOOL_V4_ABI,
      functionName: 'buySongPack',
      args: [country],
      value: SONG_PACK_PRICE,
      gas: 200000n,
    })
  }

  // Single-click purchase functions (no approval needed for ETH)
  const handleBuyCombo = () => {
    if (!hasCountry) {
      console.warn('❌ Cannot purchase without country selection')
      return
    }
    handlePurchaseCombo()
  }

  const handleBuyVoice = () => {
    if (!hasCountry) {
      console.warn('❌ Cannot purchase without country selection')
      return
    }
    handlePurchaseVoice()
  }

  const handleBuySong = () => {
    if (!hasCountry) {
      console.warn('❌ Cannot purchase without country selection')
      return
    }
    handlePurchaseSong()
  }

  return {
    // State
    isConnected,
    address,
    isPurchasing,
    hasCountry,
    lastPurchase,
    isLoadingCredits: isLoadingVoiceCredits,
    
    // Refetch functions for manual sync
    refetchCredits: async () => {
      await Promise.all([
        refetchVoiceCredits(),
        refetchSongCredits(),
      ])
    },
    
    // Data
    voiceCredits: Number(voiceCredits || 0),
    songCredits: Number(songCredits || 0),
    isFirstPurchase,
    
    // Actions (single-click)
    handleBuyCombo,
    handleBuyVoice,
    handleBuySong,
  }
}