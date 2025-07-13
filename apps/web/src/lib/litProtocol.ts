import { LitNodeClient } from '@lit-protocol/lit-node-client'
import { 
  PKP_PUBLIC_KEY, 
  LIT_ACTION_CID,
  KARAOKE_STORE_V5_ADDRESS
} from '../constants'

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
      litNetwork: 'datil',
      debug: true
    })
  }

  async connect() {
    if (!this.litNodeClient) {
      throw new Error('LitNodeClient not initialized')
    }
    await this.litNodeClient.connect()
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
    let hasCapabilities = false
    if (firstSession?.signedMessage) {
      try {
        const parsed = JSON.parse(firstSession.signedMessage)
        hasCapabilities = !!parsed.capabilities && parsed.capabilities.length > 0
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
          ipfsId: LIT_ACTION_CID,
          sessionSigs: this.sessionSigs,
          jsParams: {
            publicKey: PKP_PUBLIC_KEY,
            sessionToken,
            audioData: audioArray,
            contractAddress: KARAOKE_STORE_V5_ADDRESS,
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

  async disconnect() {
    if (this.litNodeClient) {
      await this.litNodeClient.disconnect()
    }
  }
}

// Singleton instance
export const litProtocolService = new LitProtocolService()