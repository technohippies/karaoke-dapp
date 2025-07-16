import { LitNodeClient } from '@lit-protocol/lit-node-client'
import { LIT_ABILITY, LIT_NETWORK } from '@lit-protocol/constants'
import { LitActionResource, createSiweMessage, generateAuthSig } from '@lit-protocol/auth-helpers'
import { ethers } from 'ethers'
import { getDetectedLanguage } from '../../../i18n'

// Single Line Scorer V2 deployed to IPFS - with error handling
const SINGLE_LINE_SCORER_CID = 'QmW9ZUkHAmSAnjeuH7ruwKwndMi4guzvEGWDpJkHMqHd4Y'

interface LineScoreResult {
  success: boolean
  transcript?: string
  score?: number
  feedback?: string | null
  error?: string
}

export class LineScoringService {
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
      console.log('✅ Connected to Lit Network for line scoring')
    }
    
    // Ensure client is ready
    if (!this.client.ready) {
      await this.client.connect()
      console.log('✅ Lit client reconnected and ready')
    }
  }

  async scoreLine(
    audioData: Uint8Array,
    expectedText: string,
    signer: ethers.Signer,
    sessionSigs?: any
  ): Promise<LineScoreResult> {
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
      
      console.log('🎯 Scoring line with Lit Protocol')
      console.log('📝 Expected text:', expectedText)
      console.log('🎧 Audio data size:', audioData.length, 'bytes')
      
      // Get user language for feedback
      const userLanguage = getDetectedLanguage()
      console.log('🌐 User language:', userLanguage)
      
      // Get session signatures if not provided
      let authSigs = sessionSigs
      if (!authSigs) {
        console.log('🔐 Generating session signatures...')
        authSigs = await this.client.getSessionSigs({
          chain: 'baseSepolia',
          expiration: new Date(Date.now() + 1000 * 60 * 10).toISOString(), // 10 minutes
          resourceAbilityRequests: [
            {
              resource: new LitActionResource('*'),
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
        console.log('✅ Session signatures generated')
      }
      
      // Execute Lit Action using IPFS CID
      const result = await this.client.executeJs({
        sessionSigs: authSigs,
        ipfsId: SINGLE_LINE_SCORER_CID,
        jsParams: {
          dataToSign: audioData,
          expectedTextParam: expectedText,
          userLanguageParam: userLanguage
        }
      })
      
      console.log('📊 Lit Action result:', result.response)
      return JSON.parse(result.response)
      
    } catch (error) {
      console.error('❌ Line scoring error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
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

export const lineScoringScoringService = new LineScoringService()