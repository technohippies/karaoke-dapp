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
  private litNodeClient: LitNodeClient | null = null
  private capacityDelegationAuthSig: any = null

  constructor() {
    this.litNodeClient = new LitNodeClient({
      litNetwork: LitNetwork.Yellowstone,
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

    // Execute the Lit Action
    const response = await this.litNodeClient.executeJs({
      ipfsId: LIT_ACTION_CID,
      authSig: this.capacityDelegationAuthSig,
      jsParams: {
        publicKey: PKP_PUBLIC_KEY,
        sessionToken,
        audioData: audioArray,
        contractAddress: KARAOKE_STORE_V5_ADDRESS,
        tokenSignature,
        rpcUrl: LIT_RPC_URL
      },
    })

    // Parse the response
    const result = JSON.parse(response.response)
    
    if (!result.success) {
      throw new Error(result.error || 'Lit Action failed')
    }

    // Get the signature from the Lit Action
    const signature = response.signatures.gradeSignature

    // Convert signature to the format expected by the contract
    const sig = signature.signature
    const formattedSignature = ethers.utils.joinSignature({
      r: '0x' + sig.slice(0, 64),
      s: '0x' + sig.slice(64, 128),
      v: parseInt(sig.slice(128, 130), 16)
    })

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