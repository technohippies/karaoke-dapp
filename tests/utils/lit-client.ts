import { LitNodeClient } from '@lit-protocol/lit-node-client'
import { LIT_NETWORK, LIT_ABILITY, AUTH_METHOD_TYPE } from '@lit-protocol/constants'
import { LitPKPResource, LitActionResource, createSiweMessage, generateAuthSig } from '@lit-protocol/auth-helpers'
import ethers5 from 'ethers5'

export const PKP_PUBLIC_KEY = process.env.LIT_PKP_PUBLIC_KEY!
export const PKP_ETH_ADDRESS = process.env.LIT_PKP_ETH_ADDRESS!

// Lit Action CIDs
export const VOICE_GRADER_CID = 'QmYov82aEgcqq1kMaYCoDQzH79PW8Q2pfLiddA96MRTdyX' // Nova-3 with auto-detect content type
export const SESSION_SETTLEMENT_CID = 'QmRHZLRQThj9oq4bgMRupjvwQUH4iVyFweHp1WGdYc25oy' // Fixed variable access

export async function createLitClient() {
  const litNodeClient = new LitNodeClient({
    litNetwork: LIT_NETWORK.DatilTest,
    debug: false
  })
  
  await litNodeClient.connect()
  return litNodeClient
}

export async function getSessionSigs(litNodeClient: LitNodeClient, wallet: ethers5.Wallet) {
  // Use the proper Lit Protocol SDK pattern for PKP session signatures
  const expiration = new Date(Date.now() + 1000 * 60 * 60).toISOString() // 1 hour
  
  // Create resource ability requests for PKP signing and Lit Action execution
  const resourceAbilityRequests = [
    {
      resource: new LitPKPResource('*'),
      ability: LIT_ABILITY.PKPSigning,
    },
    {
      resource: new LitActionResource('*'),
      ability: LIT_ABILITY.LitActionExecution,
    },
  ]
  
  // Get session signatures using the authNeededCallback pattern
  return await litNodeClient.getSessionSigs({
    expiration,
    resourceAbilityRequests,
    authNeededCallback: async ({ uri, expiration, resourceAbilityRequests }) => {
      // Create proper SIWE message using Lit's helper functions
      const toSign = await createSiweMessage({
        uri,
        expiration,
        resources: resourceAbilityRequests,
        walletAddress: wallet.address,
        nonce: await litNodeClient.getLatestBlockhash(),
        litNodeClient,
      })
      
      // Generate authSig using Lit's helper functions
      return await generateAuthSig({
        signer: wallet,
        toSign,
      })
    },
  })
}

