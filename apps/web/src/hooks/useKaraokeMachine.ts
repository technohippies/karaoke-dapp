import { useMachine } from '@xstate/react'
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useSignTypedData } from 'wagmi'
import { useEffect, useCallback } from 'react'
import { karaokeMachine } from '../lib/karaokeMachine'
import { litProtocolService } from '../lib/litProtocol'
import { 
  KARAOKE_STORE_V5_ADDRESS, 
  KARAOKE_STORE_V5_ABI, 
  USDC_ADDRESS, 
  USDC_ABI, 
  COMBO_PRICE 
} from '../constants'
import { parseEventLogs } from 'viem'

export function useKaraokeMachine() {
  const [state, send] = useMachine(karaokeMachine)
  const { address, isConnected } = useAccount()
  const { signTypedDataAsync } = useSignTypedData()
  
  // Check if wallet is already connected on mount
  useEffect(() => {
    if (isConnected && address && state.matches('disconnected')) {
      send({ type: 'WALLET_CONNECTED', address })
    }
  }, [])
  
  // Contract reads
  const { data: credits, refetch: refetchCredits } = useReadContract({
    address: KARAOKE_STORE_V5_ADDRESS,
    abi: KARAOKE_STORE_V5_ABI,
    functionName: 'getUserCredits',
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
  
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: USDC_ADDRESS,
    abi: USDC_ABI,
    functionName: 'allowance',
    args: address ? [address, KARAOKE_STORE_V5_ADDRESS] : undefined,
    enabled: !!address,
  })
  
  const { data: activeSession, refetch: refetchSession } = useReadContract({
    address: KARAOKE_STORE_V5_ADDRESS,
    abi: KARAOKE_STORE_V5_ABI,
    functionName: 'getActiveSession',
    args: address ? [address] : undefined,
    enabled: !!address,
  })
  
  // Read unlock status for each song
  const { data: song1Unlocked, refetch: refetchSong1 } = useReadContract({
    address: KARAOKE_STORE_V5_ADDRESS,
    abi: KARAOKE_STORE_V5_ABI,
    functionName: 'hasUnlockedSong',
    args: address ? [address, 1n] : undefined,
    enabled: !!address,
  })
  
  const { data: song2Unlocked, refetch: refetchSong2 } = useReadContract({
    address: KARAOKE_STORE_V5_ADDRESS,
    abi: KARAOKE_STORE_V5_ABI,
    functionName: 'hasUnlockedSong',
    args: address ? [address, 2n] : undefined,
    enabled: !!address,
  })
  
  const { data: song3Unlocked, refetch: refetchSong3 } = useReadContract({
    address: KARAOKE_STORE_V5_ADDRESS,
    abi: KARAOKE_STORE_V5_ABI,
    functionName: 'hasUnlockedSong',
    args: address ? [address, 3n] : undefined,
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
    data: buyHash,
    isPending: isBuyPending,
    error: buyError
  } = useWriteContract()
  
  const { 
    writeContract: startSession, 
    data: sessionHash,
    isPending: isSessionPending,
    error: sessionError
  } = useWriteContract()
  
  const { 
    writeContract: endSession, 
    data: endHash,
    isPending: isEndPending,
    error: endError
  } = useWriteContract()
  
  const { 
    writeContract: unlockSong, 
    data: unlockHash,
    isPending: isUnlockPending,
    error: unlockError
  } = useWriteContract()
  
  // Wait for transactions
  const { isSuccess: isApproveSuccess } = useWaitForTransactionReceipt({ hash: approveHash })
  const { isSuccess: isBuySuccess } = useWaitForTransactionReceipt({ hash: buyHash })
  const { isSuccess: isSessionSuccess, data: sessionReceipt } = useWaitForTransactionReceipt({ hash: sessionHash })
  const { isSuccess: isEndSuccess } = useWaitForTransactionReceipt({ hash: endHash })
  const { isSuccess: isUnlockSuccess } = useWaitForTransactionReceipt({ hash: unlockHash })
  
  // Update machine when wallet connection changes
  useEffect(() => {
    if (isConnected && address) {
      if (state.matches('disconnected') || state.matches('connecting')) {
        send({ type: 'WALLET_CONNECTED', address })
      }
    } else if (!isConnected && !state.matches('disconnected')) {
      send({ type: 'WALLET_DISCONNECTED' })
    }
  }, [isConnected, address, send, state])
  
  // Update credits when loaded
  useEffect(() => {
    if (credits !== undefined && address) {
      const voiceCredits = Number(credits[0] || 0)
      const songCredits = Number(credits[1] || 0)
      
      send({ 
        type: 'CREDITS_LOADED', 
        voiceCredits,
        songCredits
      })
    }
  }, [credits, send, address])
  
  // Update USDC balance
  useEffect(() => {
    if (usdcBalance !== undefined) {
      const balance = (Number(usdcBalance) / 1_000_000).toFixed(2)
      send({ type: 'USDC_BALANCE_LOADED', balance })
    }
  }, [usdcBalance, send])
  
  // Update allowance
  useEffect(() => {
    if (allowance !== undefined) {
      const hasAllowance = allowance >= COMBO_PRICE
      send({ type: 'ALLOWANCE_LOADED', hasAllowance })
    }
  }, [allowance, send])
  
  // Update session info
  useEffect(() => {
    if (activeSession) {
      const [hasSession, sessionHash, amount, songId] = activeSession
      send({
        type: 'SESSION_LOADED',
        hasSession,
        amount: Number(amount),
        songId: Number(songId),
        sessionHash
      })
    }
  }, [activeSession, send])
  
  // Update unlock status
  useEffect(() => {
    if (song1Unlocked !== undefined && address) {
      send({ type: 'UNLOCK_STATUS_LOADED', songId: 1, isUnlocked: !!song1Unlocked })
    }
  }, [song1Unlocked, send, address])
  
  useEffect(() => {
    if (song2Unlocked !== undefined && address) {
      send({ type: 'UNLOCK_STATUS_LOADED', songId: 2, isUnlocked: !!song2Unlocked })
    }
  }, [song2Unlocked, send, address])
  
  useEffect(() => {
    if (song3Unlocked !== undefined && address) {
      send({ type: 'UNLOCK_STATUS_LOADED', songId: 3, isUnlocked: !!song3Unlocked })
    }
  }, [song3Unlocked, send, address])
  
  // Handle transaction submissions
  useEffect(() => {
    if (approveHash) {
      send({ type: 'TRANSACTION_SUBMITTED', hash: approveHash })
    }
  }, [approveHash, send])
  
  useEffect(() => {
    if (buyHash) {
      send({ type: 'TRANSACTION_SUBMITTED', hash: buyHash })
    }
  }, [buyHash, send])
  
  useEffect(() => {
    if (unlockHash) {
      send({ type: 'TRANSACTION_SUBMITTED', hash: unlockHash })
    }
  }, [unlockHash, send])
  
  useEffect(() => {
    if (sessionHash) {
      send({ type: 'TRANSACTION_SUBMITTED', hash: sessionHash })
    }
  }, [sessionHash, send])
  
  useEffect(() => {
    if (endHash) {
      send({ type: 'TRANSACTION_SUBMITTED', hash: endHash })
    }
  }, [endHash, send])
  
  // Handle write errors
  useEffect(() => {
    if (approveError) {
      send({ type: 'TRANSACTION_ERROR', error: approveError.message })
    }
  }, [approveError, send])
  
  useEffect(() => {
    if (buyError) {
      send({ type: 'TRANSACTION_ERROR', error: buyError.message })
    }
  }, [buyError, send])
  
  useEffect(() => {
    if (unlockError) {
      send({ type: 'TRANSACTION_ERROR', error: unlockError.message })
    }
  }, [unlockError, send])
  
  useEffect(() => {
    if (sessionError) {
      send({ type: 'TRANSACTION_ERROR', error: sessionError.message })
    }
  }, [sessionError, send])
  
  useEffect(() => {
    if (endError) {
      send({ type: 'TRANSACTION_ERROR', error: endError.message })
    }
  }, [endError, send])
  
  // Handle transaction success
  useEffect(() => {
    if (isApproveSuccess) {
      send({ type: 'TRANSACTION_SUCCESS' })
      refetchAllowance()
    }
  }, [isApproveSuccess, send, refetchAllowance])
  
  useEffect(() => {
    if (isBuySuccess) {
      send({ type: 'TRANSACTION_SUCCESS' })
      refetchCredits()
      refetchUsdcBalance()
    }
  }, [isBuySuccess, send, refetchCredits, refetchUsdcBalance])
  
  useEffect(() => {
    if (isUnlockSuccess) {
      send({ type: 'TRANSACTION_SUCCESS' })
      refetchCredits()
      refetchSong1()
      refetchSong2()
      refetchSong3()
    }
  }, [isUnlockSuccess, send, refetchCredits, refetchSong1, refetchSong2, refetchSong3])
  
  useEffect(() => {
    if (isSessionSuccess && sessionReceipt) {
      // Parse SessionStarted event to get session hash
      const logs = parseEventLogs({
        abi: KARAOKE_STORE_V5_ABI,
        logs: sessionReceipt.logs,
        eventName: 'SessionStarted'
      })
      
      if (logs.length > 0) {
        const sessionStartedEvent = logs[0]
        const sessionHash = sessionStartedEvent.args.sessionHash
        
        // Create session data and sign it
        const sessionData = {
          userAddress: address!,
          sessionHash,
          escrowAmount: state.context.selectedSong ? 5 : 0,
          songId: state.context.selectedSong?.id || 0,
          chainId: 84532, // Base Sepolia
          issuedAt: Math.floor(Date.now() / 1000),
          expiresAt: Math.floor(Date.now() / 1000) + 3600
        }
        
        send({ type: 'SESSION_STARTED', sessionData })
        send({ type: 'TRANSACTION_SUCCESS' })
        refetchSession()
      }
    }
  }, [isSessionSuccess, sessionReceipt, send, refetchSession, address, state.context.selectedSong])
  
  useEffect(() => {
    if (isEndSuccess) {
      send({ type: 'TRANSACTION_SUCCESS' })
      refetchSession()
      refetchCredits()
    }
  }, [isEndSuccess, send, refetchSession, refetchCredits])
  
  // Handle Lit Protocol grading
  const handleSubmitToLit = useCallback(async () => {
    if (!state.context.audioData || !state.context.sessionData || !address) {
      send({ type: 'ERROR', error: 'Missing audio data or session' })
      return
    }
    
    try {
      // Sign the session token
      const domain = {
        name: 'KaraokeTurbo',
        version: '1',
        chainId: 84532 // Base Sepolia
      }
      
      const types = {
        SessionToken: [
          { name: 'userAddress', type: 'address' },
          { name: 'sessionHash', type: 'bytes32' },
          { name: 'escrowAmount', type: 'uint256' },
          { name: 'songId', type: 'uint256' },
          { name: 'chainId', type: 'uint256' },
          { name: 'issuedAt', type: 'uint256' },
          { name: 'expiresAt', type: 'uint256' }
        ]
      }
      
      const tokenSignature = await signTypedDataAsync({
        domain: {
          ...domain,
          verifyingContract: KARAOKE_STORE_V5_ADDRESS
        },
        types,
        primaryType: 'SessionToken',
        message: state.context.sessionData
      })
      
      // Grade with Lit Protocol
      const result = await litProtocolService.gradeVoice(
        state.context.sessionData,
        tokenSignature,
        state.context.audioData,
        address
      )
      
      send({
        type: 'LIT_GRADING_COMPLETE',
        grade: result.grade,
        creditsUsed: result.creditsUsed,
        nonce: result.nonce,
        signature: result.signature
      })
    } catch (error) {
      console.error('Lit Protocol error:', error)
      send({ type: 'ERROR', error: error instanceof Error ? error.message : 'Failed to grade audio' })
    }
  }, [state.context, address, signTypedDataAsync, send])
  
  // Listen for SUBMIT_TO_LIT event
  useEffect(() => {
    if (state.matches('karaoke.processing')) {
      handleSubmitToLit()
    }
  }, [state.value, handleSubmitToLit])
  
  // Contract interaction functions
  const handleApproveUSDC = () => {
    approveUSDC({
      address: USDC_ADDRESS,
      abi: USDC_ABI,
      functionName: 'approve',
      args: [KARAOKE_STORE_V5_ADDRESS, COMBO_PRICE],
    })
  }
  
  const handleBuyCredits = () => {
    buyCombo({
      address: KARAOKE_STORE_V5_ADDRESS,
      abi: KARAOKE_STORE_V5_ABI,
      functionName: 'buyCombo',
    })
  }
  
  const handleUnlockSong = async (songId: number) => {
    unlockSong({
      address: KARAOKE_STORE_V5_ADDRESS,
      abi: KARAOKE_STORE_V5_ABI,
      functionName: 'unlockSong',
      args: [BigInt(songId)],
    })
  }
  
  const handleStartSession = (songId: number, creditAmount: number = 5) => {
    startSession({
      address: KARAOKE_STORE_V5_ADDRESS,
      abi: KARAOKE_STORE_V5_ABI,
      functionName: 'startSession',
      args: [BigInt(songId), BigInt(creditAmount)],
    })
  }
  
  const handleEndSession = () => {
    if (!state.context.gradeResult) {
      send({ type: 'ERROR', error: 'No grade result available' })
      return
    }
    
    endSession({
      address: KARAOKE_STORE_V5_ADDRESS,
      abi: KARAOKE_STORE_V5_ABI,
      functionName: 'endSessionWithSignature',
      args: [
        BigInt(state.context.gradeResult.creditsUsed),
        BigInt(state.context.gradeResult.grade),
        BigInt(state.context.gradeResult.nonce),
        state.context.gradeResult.signature as `0x${string}`
      ],
    })
  }
  
  return {
    state,
    send,
    context: state.context,
    
    // Transaction states
    isApprovePending,
    isBuyPending,
    isUnlockPending,
    isSessionPending,
    isEndPending,
    
    // Actions
    handleApproveUSDC,
    handleBuyCredits,
    handleUnlockSong,
    handleStartSession,
    handleEndSession,
    
    // Refetch functions
    refetchAll: () => {
      refetchCredits()
      refetchUsdcBalance()
      refetchAllowance()
      refetchSession()
      refetchSong1()
      refetchSong2()
      refetchSong3()
    }
  }
}