import { LitNodeClient } from '@lit-protocol/lit-node-client'
import { LitNetwork } from '@lit-protocol/constants'
import { ethers } from 'ethers'
import { 
  PKP_PUBLIC_KEY, 
  PKP_ADDRESS, 
  LIT_ACTION_CID,
  KARAOKE_STORE_V5_ADDRESS,
  LIT_RPC_URL
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
    audioData: Uint8Array,
    userAddress: string
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
    
    console.log('📝 Executing with session sigs:', {
      numSigs: Object.keys(this.sessionSigs).length,
      firstNodeUrl: Object.keys(this.sessionSigs)[0],
      hasCapabilities
    })
    
    // Log the actual session sig structure
    const firstSig = this.sessionSigs[Object.keys(this.sessionSigs)[0]]
    console.log('📝 First session sig structure:', {
      keys: Object.keys(firstSig),
      hasSignedMessage: !!firstSig.signedMessage,
      signedMessageLength: firstSig.signedMessage?.length
    })

    // Execute the Lit Action
    console.log('🚀 Executing Lit Action with params:', {
      ipfsId: LIT_ACTION_CID,
      hasSessionSigs: !!this.sessionSigs,
      jsParams: {
        publicKey: PKP_PUBLIC_KEY,
        sessionToken,
        audioDataLength: audioArray.length,
        contractAddress: KARAOKE_STORE_V5_ADDRESS,
        hasTokenSignature: !!tokenSignature
      }
    })
    
    const response = await this.litNodeClient.executeJs({
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

    // Log the raw response for debugging
    console.log('📝 Lit Action raw response:', response)
    console.log('📝 Response.response:', response.response)
    console.log('📝 Response.signatures:', response.signatures)
    
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

    // Log signature structure for debugging
    console.log('📝 Signatures object:', response.signatures)
    console.log('📝 Signatures keys:', Object.keys(response.signatures || {}))
    
    // Get the signature from the Lit Action
    // The signature might be under 'debugSig' or 'gradeSignature' depending on the Lit Action version
    const signature = response.signatures?.gradeSignature || response.signatures?.debugSig
    
    if (!signature) {
      console.error('Available signatures:', Object.keys(response.signatures || {}))
      throw new Error('No signature found in response')
    }
    
    console.log('📝 Signature object:', signature)
    console.log('📝 Signature type:', typeof signature)

    // Convert signature to the format expected by the contract
    // The signature might be in different formats depending on the Lit Action
    let formattedSignature: string
    
    if (typeof signature === 'string') {
      // If it's already a string, use it directly
      formattedSignature = signature
    } else if (signature.signature) {
      // If it has a signature property
      const sig = signature.signature
      formattedSignature = ethers.utils.joinSignature({
        r: '0x' + sig.slice(0, 64),
        s: '0x' + sig.slice(64, 128),
        v: parseInt(sig.slice(128, 130), 16)
      })
    } else if (signature.r && signature.s && signature.v) {
      // If it has r, s, v properties
      formattedSignature = ethers.utils.joinSignature({
        r: signature.r,
        s: signature.s,
        v: signature.v
      })
    } else {
      throw new Error('Unknown signature format')
    }

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