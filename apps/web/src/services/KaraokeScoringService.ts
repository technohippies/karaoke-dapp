import { LitNodeClient } from '@lit-protocol/lit-node-client'
import { LIT_ABILITY, LIT_NETWORK } from '@lit-protocol/constants'
import { LitActionResource, createSiweMessage, generateAuthSig } from '@lit-protocol/auth-helpers'
import { ethers } from 'ethers'

// Load encrypted API keys
const encryptedKeysData = {
  "deepgram": {
    "ciphertext": "mMcFcjoPtboMnqG+7nCs3VhaWagv/98DsVz0fV+eIeQcnIG/A6+X5o87HMH8M7mAYIYshxzygA7Au/3S5WyGEyC7qXYgZ256CQmQxNq8Lvcpbszsp73dn3n9636cEPy7gc56KpBGHhmjwIgUbxs3U5CukfkCQETUFJUC",
    "dataToEncryptHash": "991f82ee2a7055854de5d0ff7e35bc2b205aaebf72105620de2fdb112969d292"
  },
  "openrouter": {
    "ciphertext": "hNcg6LhwJJfetly6hT54Iw1W7+fpPfXHgiwqmZ5uDSYrpli5iu37oWMm0TH+X8NCj9gk9UfnmW8x1O/eZk4QOei9CZKhpFLKhApHNQn6NRlKqyMg9T+QfytJ6k17IpWe6UlUR+JzvrEyNS6guN3ETDYz5D0HcfKfU+BDZ9R11rFxCaTYkhdAaVrh/R8Vf/UOpib3p4JGD1W+NLEC",
    "dataToEncryptHash": "938d660ab40a343df60ad16e264e6efae012a21b23a2bb19d901cb96d296f747"
  },
  "evmContractConditions": [
    {
      "contractAddress": "0x047eCeBC1C289b26210CDdc6a0BB343a2C984F5d",
      "functionName": "hasUnlockedSong",
      "functionParams": [
        ":userAddress",
        "1"
      ],
      "functionAbi": {
        "type": "function",
        "name": "hasUnlockedSong",
        "inputs": [
          {
            "name": "",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "",
            "type": "uint256",
            "internalType": "uint256"
          }
        ],
        "outputs": [
          {
            "name": "",
            "type": "bool",
            "internalType": "bool"
          }
        ],
        "stateMutability": "view"
      },
      "chain": "baseSepolia",
      "returnValueTest": {
        "key": "",
        "comparator": "=",
        "value": "true"
      }
    }
  ]
}

// Deployed Lit Action CID - V19 with debug logging
const LIT_ACTION_CID = 'QmSm5XeBymfBNPaNP5qH897zSS8Eg4jayc1Y2j41Pp2aiq'

interface LineScore {
  line: number
  expected: string
  heard: string
  score: number
  issues: string[]
}

interface ScoringDetails {
  lines: LineScore[]
  overall_score: number
  pronunciation_patterns: string[]
  encouragement: string
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
      console.log('📋 Lit Action parameters:', {
        audioDataSize: audioData.length,
        expectedLyricsLength: expectedLyrics.length,
        evmContractConditions: encryptedKeysData.evmContractConditions,
        deepgramCiphertext: encryptedKeysData.deepgram.ciphertext,
        deepgramDataHash: encryptedKeysData.deepgram.dataToEncryptHash,
        openrouterCiphertext: encryptedKeysData.openrouter.ciphertext,
        openrouterDataHash: encryptedKeysData.openrouter.dataToEncryptHash
      })
      
      console.log('🔍 Parameter types:', {
        audioData: typeof audioData,
        expectedLyrics: typeof expectedLyrics,
        evmContractConditions: typeof encryptedKeysData.evmContractConditions,
        deepgramCiphertext: typeof encryptedKeysData.deepgram.ciphertext,
        deepgramDataHash: typeof encryptedKeysData.deepgram.dataToEncryptHash,
        openrouterCiphertext: typeof encryptedKeysData.openrouter.ciphertext,
        openrouterDataHash: typeof encryptedKeysData.openrouter.dataToEncryptHash
      })

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
        userAddress: typeof jsParams.userAddress,
        deepgramCiphertext: typeof jsParams.deepgramCiphertext
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