import { LitNodeClient } from '@lit-protocol/lit-node-client'
import { KARAOKE_CONTRACT_ADDRESS } from '../constants'
import { LIT_ACTIONS } from '../constants/litActions'

interface SessionToken {
  userAddress: string
  sessionHash: string
  escrowAmount: number
  songId: number
  chainId: number
  issuedAt: number
  expiresAt: number
}

export class LitProtocolService {
  public litNodeClient: LitNodeClient | null = null
  private capacityDelegationAuthSig: any = null
  private sessionSigs: any = null

  constructor() {
    this.litNodeClient = new LitNodeClient({
      litNetwork: 'datil-dev',
      debug: true
    })
  }

  async connect() {
    if (!this.litNodeClient) {
      throw new Error('LitNodeClient not initialized')
    }
    await this.litNodeClient.connect()
  }

  getClient(): LitNodeClient {
    if (!this.litNodeClient) {
      throw new Error('LitNodeClient not initialized')
    }
    return this.litNodeClient
  }

  setCapacityDelegation(authSig: any) {
    this.capacityDelegationAuthSig = authSig
  }

  getCapacityDelegation() {
    return this.capacityDelegationAuthSig
  }

  setSessionSigs(sessionSigs: any) {
    this.sessionSigs = sessionSigs
  }

  async gradeVoice(
    sessionToken: SessionToken,
    tokenSignature: string,
    audioData: Uint8Array
  ): Promise<{
    grade: number
    creditsUsed: number
    nonce: number
    signature: string
    messageHash: string
  }> {
    if (!this.litNodeClient) {
      throw new Error('LitNodeClient not connected')
    }

    if (!this.capacityDelegationAuthSig) {
      throw new Error('Capacity delegation not set')
    }

    // Convert audio data to array for Lit Action
    const audioArray = Array.from(audioData)

    if (!this.sessionSigs) {
      throw new Error('No session signatures available. Please create a session first.')
    }

    // Check if capabilities are included in the session
    const firstSession = this.sessionSigs[Object.keys(this.sessionSigs)[0]]
    // let hasCapabilities = false
    if (firstSession?.signedMessage) {
      try {
        // const parsed = JSON.parse(firstSession.signedMessage)
        // hasCapabilities = !!parsed.capabilities && parsed.capabilities.length > 0
      } catch (e) {
        console.log('Could not parse signed message')
      }
    }
    
    console.log('🎙️ Grading voice with Lit Protocol...')
    
    let response
    let lastError: Error | null = null
    const maxRetries = 3
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 1) {
          console.log(`🔄 Retry attempt ${attempt}/${maxRetries}...`)
        }
        
        response = await this.litNodeClient.executeJs({
          ipfsId: LIT_ACTIONS.karaokeScorerV21.cid, // TODO: This method appears to be legacy/unused
          sessionSigs: this.sessionSigs,
          jsParams: {
            publicKey: undefined, // PKP_PUBLIC_KEY was removed - needs to be provided
            sessionToken,
            audioData: audioArray,
            contractAddress: KARAOKE_CONTRACT_ADDRESS,
            tokenSignature
          }
        })
        
        // Success - break out of retry loop
        break
      } catch (error: any) {
        lastError = error
        console.error(`❌ Attempt ${attempt} failed:`, error.message || error)
        
        // Check if it's a 502 error or timeout (common with Lit nodes)
        if (error.message?.includes('502') || error.message?.includes('Bad Gateway') || error.message?.includes('timeout')) {
          console.log('🔄 502/timeout error detected - this is common on first request')
          if (attempt < maxRetries) {
            // Short delay before retry since the issue is node-side
            const delay = 500 // Fixed 500ms delay
            console.log(`⏱️ Waiting ${delay}ms before retry...`)
            await new Promise(resolve => setTimeout(resolve, delay))
            continue
          }
        }
        
        // For other errors or final attempt, throw
        throw error
      }
    }
    
    if (!response) {
      throw lastError || new Error('Failed to execute Lit Action after retries')
    }

    // Log the response
    console.log('📝 Lit Action executed successfully')
    
    // Parse the response - it's returned as a JSON string
    let result
    try {
      if (typeof response.response === 'string') {
        result = JSON.parse(response.response)
      } else {
        result = response.response
      }
    } catch (error) {
      console.error('Failed to parse response:', response.response)
      throw new Error('Failed to parse Lit Action response')
    }
    
    if (!result || !result.success) {
      throw new Error(result?.error || 'Lit Action failed')
    }

    // Get the signature from the parsed result
    const signature = result.signature
    
    if (!signature) {
      throw new Error('No signature found in response')
    }

    // The signature from our Lit Action is already a properly formatted hex string
    const formattedSignature = signature

    return {
      grade: result.grade,
      creditsUsed: result.creditsUsed,
      nonce: result.nonce,
      signature: formattedSignature,
      messageHash: result.messageHash
    }
  }
  
  async gradeSimpleV1(
    userAddress: string, 
    attemptNumber: number,
    audioData: Uint8Array
  ): Promise<{ grade: number; nonce: number; signature: string }> {
    if (!this.litNodeClient || !this.sessionSigs) {
      throw new Error('Lit Protocol not initialized or no session')
    }
    
    // PKP_PUBLIC_KEY was removed - this method needs to be updated
    throw new Error('PKP public key not configured - gradeSimpleV1 needs to be updated')
    
    console.log('🎤 Grading audio for attempt:', attemptNumber)
    
    try {
      const response = await this.litNodeClient!.executeJs({
        sessionSigs: this.sessionSigs,
        ipfsId: '', // TODO: This method is broken and needs to be removed
        jsParams: {
          userAddress,
          attemptNumber: attemptNumber.toString(),
          audioData: Array.from(audioData)
        }
      })
      
      const result = JSON.parse(response.response as string)
      
      if (!result.success) {
        throw new Error(result.error || 'Grading failed')
      }
      
      console.log('✅ Grading complete:', {
        grade: result.grade,
        attemptNumber: result.attemptNumber,
        duration: result.duration
      })
      
      return {
        grade: result.grade,
        nonce: result.nonce,
        signature: result.signature
      }
    } catch (error) {
      console.error('❌ Lit Action execution failed:', error)
      throw error
    }
  }

  async disconnect() {
    if (this.litNodeClient) {
      await this.litNodeClient.disconnect()
    }
  }
}

// Singleton instance
export const litProtocolService = new LitProtocolService()