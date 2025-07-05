import { fromPromise } from 'xstate'
import { readContract } from 'wagmi/actions'
import { wagmiConfig } from '../../wagmi'
import { getConnectorClient } from 'wagmi/actions'
import { portoSessionService } from '@karaoke-dapp/services'
import { sessionKaraokeService } from '../../services/session-karaoke.service'
import type { SongContext } from '../types'
import type { Hex } from 'viem'

// V0.3.0 contract address
const KARAOKE_STORE_V030 = '0xfb593e79CDFd4F1d8c9F1f0d6Ff75623bba42728' as const

// Check if user is connected via Porto
export const checkPortoConnection = fromPromise(async () => {
  try {
    const client = await getConnectorClient(wagmiConfig)
    
    // Check if the connected wallet is using Porto connector
    const connectorName = (client as any)?.connector?.name
    const isPortoConnector = connectorName === 'Porto'
    
    // Also check if window.ethereum has Porto properties
    const hasPortoProvider = window?.ethereum?.isPorto === true
    
    const isPorto = isPortoConnector || hasPortoProvider
    
    console.log('🔍 Porto connection check:', { 
      isPorto,
      isPortoConnector,
      hasPortoProvider,
      connectorName,
      hasClient: !!client,
      hasEthereum: !!window?.ethereum,
      isPortoFlag: window?.ethereum?.isPorto 
    })
    
    return isPorto
  } catch (error) {
    console.log('Porto detection error:', error)
    return false
  }
})

// Purchase with Porto and initialize session
export const purchaseWithPortoSession = fromPromise(async ({ input }: { input: SongContext & { isNewUser: boolean } }) => {
  const context = input
  
  if (!context.userAddress) {
    throw new Error('No user address')
  }
  
  console.log('🚀 Starting Porto purchase + session flow...')
  
  try {
    // Use the Porto purchase service (this is a mock - you'd use the actual hook)
    const purchaseService = {
      purchaseAndStartSession: async () => {
        // Porto integration happens in the component (usePortoKaraoke hook)
        // This is just a placeholder that throws to indicate component-level integration is needed
        throw new Error('Porto sendCalls integration needed - implement in component')
      }
    }
    
    const result = await purchaseService.purchaseAndStartSession() as any
    
    // Extract session ID from transaction logs
    // In real implementation, you'd parse the SessionStarted event
    const sessionId = '0x' + crypto.randomUUID().replace(/-/g, '') as Hex
    
    // Store session in Porto service
    portoSessionService.storeSession(
      sessionId,
      result.sessionKeyAddress,
      result.sessionKeyPrivate,
      context.userAddress as `0x${string}`,
      context.songId,
      100 // maxCredits
    )
    
    console.log('✅ Porto session created:', {
      sessionId,
      sessionKey: result.sessionKeyAddress,
      bundled: result.bundled
    })
    
    return {
      success: true,
      sessionId,
      sessionKeyAddress: result.sessionKeyAddress,
      transactionHash: result.transactionHash
    }
  } catch (error: any) {
    console.error('❌ Porto purchase failed:', error)
    throw error
  }
})

// Initialize session for existing song owner
export const initializePortoSession = fromPromise(async ({ input }: { input: SongContext }) => {
  const context = input
  
  if (!context.userAddress) {
    throw new Error('No user address')
  }
  
  console.log('🎤 Initializing Porto session for karaoke...')
  
  try {
    // Check for existing active session
    const existingSession = portoSessionService.getActiveSession(context.songId)
    if (existingSession) {
      console.log('♻️ Reusing existing session:', existingSession.sessionId)
      
      // Initialize karaoke service with existing session
      sessionKaraokeService.initialize({
        session: existingSession,
        sessionSigs: context.sessionSigs
      })
      
      return {
        sessionId: existingSession.sessionId,
        sessionKey: existingSession.sessionKey,
        reused: true
      }
    }
    
    // Generate new session key
    const sessionKeyData = await portoSessionService.generateSessionKey()
    
    // Get voice credits to determine max credits
    const voiceCredits = await readContract(wagmiConfig, {
      address: KARAOKE_STORE_V030,
      abi: [{
        name: 'getVoiceCredits',
        type: 'function',
        inputs: [{ name: 'user', type: 'address' }],
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view'
      }],
      functionName: 'getVoiceCredits',
      args: [context.userAddress as `0x${string}`]
    })
    
    // Note: This would be implemented in the component using the hook
    throw new Error('Porto session initialization needs component integration')
    
  } catch (error: any) {
    console.error('❌ Porto session init failed:', error)
    throw error
  }
})

// Process karaoke line with Porto session (NO USER SIGNATURE!)
export const processLineWithPortoSession = fromPromise(async ({ 
  input 
}: { 
  input: {
    lineIndex: number
    audioBase64: string
    expectedText: string
  }
}) => {
  console.log(`🎵 Processing line ${input.lineIndex} with Porto session...`)
  
  try {
    const result = await sessionKaraokeService.processLineSegment(
      input.lineIndex,
      input.audioBase64,
      input.expectedText
    )
    
    console.log(`✅ Line ${input.lineIndex} processed gaslessly!`, {
      accuracy: result.accuracy,
      credits: result.creditsUsed,
      tx: result.transactionHash
    })
    
    return result
  } catch (error: any) {
    console.error(`❌ Failed to process line ${input.lineIndex}:`, error)
    throw error
  }
})

// Get Porto session progress
export const getPortoSessionProgress = fromPromise(async () => {
  const progress = sessionKaraokeService.getProgress()
  
  if (!progress) {
    throw new Error('No active Porto session')
  }
  
  return progress
})

// Finalize Porto session
export const finalizePortoSession = fromPromise(async () => {
  console.log('🏁 Finalizing Porto session...')
  
  try {
    const txHash = await sessionKaraokeService.finalizeSession()
    
    console.log('✅ Porto session finalized:', txHash)
    
    return {
      success: true,
      transactionHash: txHash
    }
  } catch (error: any) {
    console.error('❌ Failed to finalize session:', error)
    throw error
  }
})

// Export all Porto services
export const portoServices = {
  checkPortoConnection,
  purchaseWithPortoSession,
  initializePortoSession,
  processLineWithPortoSession,
  getPortoSessionProgress,
  finalizePortoSession
}