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
  
  // Debug state transitions
  useEffect(() => {
    console.log('🎭 State changed to:', state.value)
    if (state.matches('karaoke')) {
      console.log('✅ We are in karaoke state!')
    }
    if (state.matches('selectSong')) {
      console.log('⚠️ We are back in selectSong state!')
    }
  }, [state.value])
  
  // Check if wallet is already connected on mount
  useEffect(() => {
    if (isConnected && address && state.matches('disconnected')) {
      send({ type: 'WALLET_CONNECTED', address })
    }
  }, [])
  
  // Contract reads - V0.6.0 has separate functions
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
  
  const refetchCredits = () => {
    refetchVoiceCredits()
    refetchSongCredits()
  }
  
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
  
  // First, get the active session ID for the user
  const { 
    data: activeSessionId, 
    error: sessionIdError,
    isLoading: sessionIdLoading,
    refetch: refetchSessionId 
  } = useReadContract({
    address: KARAOKE_STORE_V5_ADDRESS,
    abi: KARAOKE_STORE_V5_ABI,
    functionName: 'activeUserSession',
    args: address ? [address] : undefined,
    enabled: !!address,
  })
  
  // Then, get the session details if there's an active session
  const { 
    data: sessionDetails, 
    error: sessionError,
    isLoading: sessionLoading,
    refetch: refetchSessionDetails 
  } = useReadContract({
    address: KARAOKE_STORE_V5_ADDRESS,
    abi: KARAOKE_STORE_V5_ABI,
    functionName: 'sessions',
    args: activeSessionId && activeSessionId !== '0x0000000000000000000000000000000000000000000000000000000000000000' ? [activeSessionId] : undefined,
    enabled: !!activeSessionId && activeSessionId !== '0x0000000000000000000000000000000000000000000000000000000000000000',
  })
  
  const refetchSession = () => {
    refetchSessionId()
    refetchSessionDetails()
  }
  
  // Log active session data
  useEffect(() => {
    console.log('🔍 Active session query:', {
      sessionId: activeSessionId,
      sessionDetails,
      sessionIdError,
      sessionError,
      loading: sessionIdLoading || sessionLoading,
      address,
      contractAddress: KARAOKE_STORE_V5_ADDRESS
    })
  }, [activeSessionId, sessionDetails, sessionIdError, sessionError, sessionIdLoading, sessionLoading, address])
  
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
    error: sessionWriteError
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
    console.log('💰 Credits check:', { voiceCreditsData, songCreditsData, address })
    if (voiceCreditsData !== undefined && songCreditsData !== undefined && address) {
      const voiceCredits = Number(voiceCreditsData || 0)
      const songCredits = Number(songCreditsData || 0)
      
      // Always send if we're in loadingData state, or if credits changed
      if (state.matches('loadingData') || state.context.voiceCredits !== voiceCredits || state.context.songCredits !== songCredits) {
        console.log('💰 Sending credits:', { voice: voiceCredits, song: songCredits, inLoadingData: state.matches('loadingData') })
        send({ 
          type: 'CREDITS_LOADED', 
          voiceCredits,
          songCredits
        })
      }
    }
  }, [voiceCreditsData, songCreditsData, send, address, state.context.voiceCredits, state.context.songCredits, state])
  
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
    console.log('🔎 Session check:', { activeSessionId, sessionDetails, address })
    
    if (activeSessionId && activeSessionId !== '0x0000000000000000000000000000000000000000000000000000000000000000' && sessionDetails && address) {
      console.log('📄 Active session found!', { 
        sessionId: activeSessionId,
        sessionDetails,
        address 
      })
      
      // Extract session data from the struct
      // Session struct has: user, songId, escrowAmount, creditsUsed, linesProcessed, startTime, finalized
      const hasSession = !sessionDetails.finalized // If not finalized, session is active
      const amount = Number(sessionDetails.escrowAmount || 0)
      const songId = Number(sessionDetails.songId || 0)
      
      if (hasSession) {
        send({
          type: 'SESSION_LOADED',
          hasSession: true,
          amount,
          songId,
          sessionHash: activeSessionId,
          userAddress: address
        })
      } else {
        console.log('📄 Session exists but is finalized')
      }
    } else if (activeSessionId === '0x0000000000000000000000000000000000000000000000000000000000000000') {
      console.log('📄 No active session (zero session ID)')
    }
  }, [activeSessionId, sessionDetails, send, address])
  
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
      console.log('🔓 Unlock transaction submitted:', unlockHash)
      send({ type: 'TRANSACTION_SUBMITTED', hash: unlockHash })
    }
  }, [unlockHash, send])
  
  useEffect(() => {
    if (sessionHash) {
      console.log('🎬 Session transaction submitted:', sessionHash)
      send({ type: 'TRANSACTION_SUBMITTED', hash: sessionHash })
    }
  }, [sessionHash, send])
  
  useEffect(() => {
    if (endHash) {
      console.log('✅ End session transaction submitted:', endHash)
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
      console.error('❌ Unlock error:', unlockError)
      send({ type: 'TRANSACTION_ERROR', error: unlockError.message })
    }
  }, [unlockError, send])
  
  useEffect(() => {
    if (sessionWriteError) {
      console.error('❌ Session error:', sessionWriteError)
      send({ type: 'TRANSACTION_ERROR', error: sessionWriteError.message })
    }
  }, [sessionWriteError, send])
  
  useEffect(() => {
    if (endError) {
      console.error('❌ End session error:', endError)
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
    if (isUnlockSuccess && unlockHash) {
      console.log('✅ Unlock transaction successful!')
      console.log('📋 TX Hash:', unlockHash)
      console.log('🔗 View on Base Sepolia:', `https://sepolia.basescan.org/tx/${unlockHash}`)
      send({ type: 'TRANSACTION_SUCCESS' })
      refetchCredits()
      refetchSong1()
      refetchSong2()
      refetchSong3()
    }
  }, [isUnlockSuccess, unlockHash, send, refetchCredits, refetchSong1, refetchSong2, refetchSong3])
  
  useEffect(() => {
    if (isSessionSuccess && sessionReceipt) {
      console.log('🎯 Session transaction successful!', { 
        hash: sessionHash,
        receipt: sessionReceipt,
        currentState: state.value 
      })
      
      // Log all events in the receipt
      console.log('📜 All logs in receipt:', sessionReceipt.logs)
      if (sessionReceipt.logs.length > 0) {
        sessionReceipt.logs.forEach((log, index) => {
          console.log(`📝 Log ${index}:`, {
            address: log.address,
            topics: log.topics,
            data: log.data
          })
        })
      }
      
      // Try parsing without specifying event name to see all events
      try {
        const allEvents = parseEventLogs({
          abi: KARAOKE_STORE_V5_ABI,
          logs: sessionReceipt.logs
        })
        console.log('🔍 All parsed events:', allEvents)
      } catch (e) {
        console.error('Error parsing all events:', e)
      }
      
      // Parse SessionStarted event to get session hash
      const logs = parseEventLogs({
        abi: KARAOKE_STORE_V5_ABI,
        logs: sessionReceipt.logs,
        eventName: 'SessionStarted'
      })
      
      console.log('📋 Parsed SessionStarted logs:', logs)
      
      if (logs.length > 0) {
        const sessionStartedEvent = logs[0]
        const eventSessionHash = sessionStartedEvent.args.sessionHash
        
        console.log('🔑 Session hash from event:', eventSessionHash)
        
        // Create session data and sign it
        const sessionData = {
          userAddress: address!,
          sessionHash: eventSessionHash,
          escrowAmount: state.context.selectedSong ? 5 : 0,
          songId: state.context.selectedSong?.id || 0,
          chainId: 84532, // Base Sepolia
          issuedAt: Math.floor(Date.now() / 1000),
          expiresAt: Math.floor(Date.now() / 1000) + 3600
        }
        
        console.log('📤 Sending SESSION_STARTED event with data:', sessionData)
        send({ type: 'SESSION_STARTED', sessionData })
        send({ type: 'TRANSACTION_SUCCESS' })
        refetchSession()
      } else {
        console.warn('⚠️ No SessionStarted event found, but transaction succeeded. Creating session data from tx hash.')
        
        // Create session data using transaction hash as session hash
        const sessionData = {
          userAddress: address!,
          sessionHash: sessionHash as string,
          escrowAmount: state.context.selectedSong ? 5 : 0,
          songId: state.context.selectedSong?.id || 0,
          chainId: 84532, // Base Sepolia
          issuedAt: Math.floor(Date.now() / 1000),
          expiresAt: Math.floor(Date.now() / 1000) + 3600
        }
        
        console.log('📤 Sending SESSION_STARTED event with tx-based data:', sessionData)
        send({ type: 'SESSION_STARTED', sessionData })
        send({ type: 'TRANSACTION_SUCCESS' })
        refetchSession()
      }
    }
  }, [isSessionSuccess, sessionReceipt, send, refetchSession, address, state.context.selectedSong, sessionHash])
  
  useEffect(() => {
    if (isEndSuccess) {
      console.log('✅ End session transaction successful!')
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
      
      console.log('📝 Signing session data:', state.context.sessionData)
      
      const tokenSignature = await signTypedDataAsync({
        domain: {
          ...domain,
          verifyingContract: KARAOKE_STORE_V5_ADDRESS
        },
        types,
        primaryType: 'SessionToken',
        message: {
          ...state.context.sessionData,
          chainId: 84532 // Ensure chainId is included
        }
      })
      
      // Grade with Lit Protocol
      const result = await litProtocolService.gradeVoice(
        state.context.sessionData,
        tokenSignature,
        state.context.audioData
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
    console.log('🔐 Approving USDC...', KARAOKE_STORE_V5_ADDRESS, COMBO_PRICE)
    approveUSDC({
      address: USDC_ADDRESS,
      abi: USDC_ABI,
      functionName: 'approve',
      args: [KARAOKE_STORE_V5_ADDRESS, COMBO_PRICE],
    })
  }
  
  const handleBuyCredits = () => {
    console.log('💳 Buying combo pack...')
    buyCombo({
      address: KARAOKE_STORE_V5_ADDRESS,
      abi: KARAOKE_STORE_V5_ABI,
      functionName: 'buyCombopack',
    })
  }
  
  const handleUnlockSong = async (songId: number) => {
    console.log('🔓 Calling unlockSong for song:', songId)
    
    // Get the encrypted content hash from the selected song
    const selectedSong = state.context.selectedSong
    let encryptedContentHash = '0x0000000000000000000000000000000000000000000000000000000000000000' // default
    
    if (selectedSong && selectedSong.stems && selectedSong.stems.midi) {
      // Convert the MIDI CID/hash to bytes32
      // For now, we'll use a placeholder approach - in production this would be the actual encrypted content identifier
      const encoder = new TextEncoder()
      const data = encoder.encode(selectedSong.stems.midi)
      const hashArray = new Uint8Array(32)
      hashArray.set(data.slice(0, 32))
      encryptedContentHash = '0x' + Array.from(hashArray).map(b => b.toString(16).padStart(2, '0')).join('')
    }
    
    console.log('🔓 Using encrypted content hash:', encryptedContentHash)
    
    unlockSong({
      address: KARAOKE_STORE_V5_ADDRESS,
      abi: KARAOKE_STORE_V5_ABI,
      functionName: 'unlockSong',
      args: [BigInt(songId), encryptedContentHash as `0x${string}`],
    })
  }
  
  const handleStartSession = useCallback((songId: number, creditAmount: number = 5) => {
    console.log('🎬 Starting session:', { songId, creditAmount, state: state.value })
    
    // Generate a random session key for this session
    const sessionKey = `0x${Array(40).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('')}` as `0x${string}`
    const delegationDuration = 3600 // 1 hour in seconds
    
    console.log('🔑 Using session key:', sessionKey)
    
    startSession({
      address: KARAOKE_STORE_V5_ADDRESS,
      abi: KARAOKE_STORE_V5_ABI,
      functionName: 'initializeSessionWithDelegation',
      args: [BigInt(songId), sessionKey, BigInt(creditAmount), BigInt(delegationDuration)],
      value: 0n // payable function but we're not sending ETH
    })
  }, [startSession, state.value])
  
  // Handle automatic unlock when entering unlockingSong state
  useEffect(() => {
    if (state.matches('unlockingSong') && state.context.selectedSong && !isUnlockPending && !unlockHash) {
      console.log('🔓 Auto-triggering unlock for song:', state.context.selectedSong.id)
      handleUnlockSong(state.context.selectedSong.id)
    }
  }, [state.matches('unlockingSong'), state.context.selectedSong?.id, isUnlockPending, unlockHash, handleUnlockSong])
  
  // Handle automatic session start when entering startingSession state
  useEffect(() => {
    if (state.matches('karaoke.startingSession') && state.context.selectedSong && !isSessionPending && !sessionHash) {
      console.log('🎬 Auto-triggering session start for song:', state.context.selectedSong.id)
      handleStartSession(state.context.selectedSong.id, 5)
    }
  }, [state, state.context.selectedSong, isSessionPending, sessionHash, handleStartSession])
  
  const handleEndSession = () => {
    console.log('🔚 handleEndSession called')
    
    if (!state.context.gradeResult) {
      console.error('❌ No grade result available')
      send({ type: 'ERROR', error: 'No grade result available' })
      return
    }
    
    console.log('📝 Ending session with:', {
      creditsUsed: state.context.gradeResult.creditsUsed,
      grade: state.context.gradeResult.grade,
      nonce: state.context.gradeResult.nonce,
      signature: state.context.gradeResult.signature
    })
    
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
    
    // Trigger state transition
    send({ type: 'END_SESSION' })
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