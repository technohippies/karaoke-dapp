import { ethers } from 'ethers'
import { createSiweMessageWithRecaps, generateAuthSig, LitAccessControlConditionResource } from '@lit-protocol/auth-helpers'
import { LIT_ABILITY } from '@lit-protocol/constants'
import { litProtocolService } from './litProtocol'

export async function getAuthSig(walletAddress: string) {
  // For now, we'll use a simple auth sig without session sigs
  // In production, you'd want to use session sigs for better security
  
  const provider = new ethers.BrowserProvider(window.ethereum)
  const signer = await provider.getSigner()
  
  // Get the latest blockhash
  const litNodeClient = litProtocolService.getClient()
  const latestBlockhash = await litNodeClient.getLatestBlockhash()
  
  // Define the Lit resource
  const litResource = new LitAccessControlConditionResource('*')
  
  // Create the SIWE message
  const toSign = await createSiweMessageWithRecaps({
    uri: window.location.origin,
    expiration: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
    resources: [{
      resource: litResource,
      ability: LIT_ABILITY.AccessControlConditionDecryption,
    }],
    walletAddress,
    nonce: latestBlockhash,
    litNodeClient,
  })
  
  // Generate the authSig
  const authSig = await generateAuthSig({
    signer,
    toSign,
  })
  
  return authSig
}

export async function getSessionSigs(walletAddress: string) {
  const provider = new ethers.BrowserProvider(window.ethereum)
  const signer = await provider.getSigner()
  
  const litNodeClient = litProtocolService.getClient()
  const latestBlockhash = await litNodeClient.getLatestBlockhash()
  
  // Define the authNeededCallback function
  const authNeededCallback = async (params: any) => {
    if (!params.uri) {
      throw new Error("uri is required")
    }
    if (!params.expiration) {
      throw new Error("expiration is required")
    }
    if (!params.resourceAbilityRequests) {
      throw new Error("resourceAbilityRequests is required")
    }
    
    // Create the SIWE message
    const toSign = await createSiweMessageWithRecaps({
      uri: params.uri,
      expiration: params.expiration,
      resources: params.resourceAbilityRequests,
      walletAddress,
      nonce: latestBlockhash,
      litNodeClient,
    })
    
    // Generate the authSig
    const authSig = await generateAuthSig({
      signer,
      toSign,
    })
    
    return authSig
  }
  
  // Define the Lit resource
  const litResource = new LitAccessControlConditionResource('*')
  
  // Get the session signatures
  console.log('📝 Getting session sigs with:', {
    chain: 'baseSepolia',
    network: litNodeClient.config.litNetwork
  })
  
  const sessionSigs = await litNodeClient.getSessionSigs({
    chain: 'baseSepolia',
    resourceAbilityRequests: [
      {
        resource: litResource,
        ability: LIT_ABILITY.AccessControlConditionDecryption,
      },
    ],
    authNeededCallback,
  })
  
  console.log('✅ Session sigs created for nodes:', Object.keys(sessionSigs))
  
  return sessionSigs
}