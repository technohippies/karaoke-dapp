import { LitNodeClient } from '@lit-protocol/lit-node-client'
import { LIT_ABILITY, LIT_NETWORK } from '@lit-protocol/constants'
import { LitActionResource, createSiweMessage, generateAuthSig } from '@lit-protocol/auth-helpers'
import { ethers } from 'ethers'

// Deployed Lit Action CID - V18 with valid API keys
const LIT_ACTION_CID = 'Qma1dWbGf1NWNP1TSWR6UERTZAaxVr8bbVGD89f2WHFiMq'

interface LineScore {
  lineIndex: number
  score: number
  needsPractice: boolean
  expectedText?: string
  transcribedText?: string
}

interface ScoringDetails {
  lines: LineScore[]
  overall_score: number
}

interface KaraokeScoringResult {
  success: boolean
  score?: number
  feedback?: string
  transcript?: string
  expectedLyrics?: string
  scoringDetails?: ScoringDetails
  error?: string
  timestamp: number
}

export class KaraokeScoringService {
  private client: LitNodeClient | null = null
  private signer: ethers.Signer | null = null

  async initialize(signer?: ethers.Signer) {
    if (signer) {
      this.signer = signer
    }
    
    if (!this.client) {
      this.client = new LitNodeClient({
        litNetwork: LIT_NETWORK.DatilDev,
        debug: true
      })
      await this.client.connect()
      console.log('✅ Connected to Lit Network for karaoke scoring')
    }
    
    // Ensure client is ready
    if (!this.client.ready) {
      await this.client.connect()
      console.log('✅ Lit client reconnected and ready')
    }
  }

  async scoreKaraoke(
    audioData: Uint8Array,
    expectedLyrics: string,
    userAddress: string,
    signer?: ethers.Signer
  ): Promise<KaraokeScoringResult> {
    await this.initialize(signer)
    
    if (!this.client) {
      throw new Error('Lit client not initialized')
    }

    if (!this.signer) {
      throw new Error('Signer not provided - wallet connection required')
    }

    try {
      // Get user address from signer
      const userAddress = await this.signer!.getAddress()
      
      console.log('🎤 Executing karaoke scoring Lit Action...')
      console.log('🎵 Expected lyrics:', expectedLyrics.substring(0, 100) + '...')
      console.log('🎧 Audio data size:', audioData.length, 'bytes')
      console.log('📋 Lit Action CID:', LIT_ACTION_CID)

      // Get session signatures with correct format
      console.log('🔐 Generating session signatures...')
      const sessionSigs = await this.client.getSessionSigs({
        chain: 'baseSepolia',
        expiration: new Date(Date.now() + 1000 * 60 * 10).toISOString(), // 10 minutes
        resourceAbilityRequests: [
          {
            resource: new LitActionResource('*'), // Wildcard for any Lit Action
            ability: LIT_ABILITY.LitActionExecution,
          },
        ],
        authNeededCallback: async ({ uri, expiration, resourceAbilityRequests }) => {
          const toSign = await createSiweMessage({
            uri,
            expiration,
            resources: resourceAbilityRequests,
            walletAddress: await this.signer!.getAddress(),
            nonce: await this.client!.getLatestBlockhash(),
            litNodeClient: this.client!,
          });
          return await generateAuthSig({
            signer: this.signer!,
            toSign,
          });
        },
      })
      console.log('✅ Session signatures generated:', Object.keys(sessionSigs).length, 'sigs')

      // Convert audio to base64 for efficient serialization
      // Use chunked approach for large arrays to avoid call stack issues
      let binaryString = '';
      const chunkSize = 8192; // Process in 8KB chunks
      for (let i = 0; i < audioData.length; i += chunkSize) {
        const chunk = audioData.slice(i, i + chunkSize);
        binaryString += String.fromCharCode.apply(null, Array.from(chunk));
      }
      const audioBase64 = btoa(binaryString);
      console.log(`🎵 Audio conversion: ${audioData.length} bytes → ${audioBase64.length} base64 chars`)
      
      // Create jsParams object - only essential params since keys are embedded in V14
      const jsParams = {
        audioDataBase64: audioBase64, // Pass as base64 string instead of array
        expectedLyrics,
        userAddress: userAddress // Only pass what the action needs
      }
      
      // Debug the actual jsParams being sent
      console.log('🔐 jsParams types:', {
        audioDataBase64: typeof jsParams.audioDataBase64,
        expectedLyrics: typeof jsParams.expectedLyrics,
        userAddress: typeof jsParams.userAddress
      })
      
      // Log all parameter names being sent
      console.log('📦 jsParams keys:', Object.keys(jsParams))
      console.log('📦 audioDataBase64 length:', jsParams.audioDataBase64?.length)
      
      // Execute the Lit Action by CID
      console.log('🚀 Executing Lit Action with CID:', LIT_ACTION_CID)
      console.log('🔑 Session sigs type:', typeof sessionSigs, Array.isArray(sessionSigs))
      
      let result;
      try {
        result = await this.client.executeJs({
          sessionSigs: sessionSigs, // Put sessionSigs first like working project
          ipfsId: LIT_ACTION_CID,
          jsParams: jsParams
        })
      } catch (error: any) {
        console.error('❌ executeJs error details:', {
          message: error.message,
          stack: error.stack,
          name: error.name,
          errorData: error.data,
          errorCode: error.code
        })
        throw error
      }

      console.log('📊 Karaoke scoring result:', result.response)
      return JSON.parse(result.response)

    } catch (error) {
      console.error('❌ Karaoke scoring failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now()
      }
    }
  }

  async disconnect() {
    if (this.client) {
      await this.client.disconnect()
      this.client = null
    }
  }
}

// Singleton instance
export const karaokeScoringService = new KaraokeScoringService()