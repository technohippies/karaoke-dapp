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
    statement: "Free: Decrypt song lyrics",
  })
  
  // Generate the authSig
  const authSig = await generateAuthSig({
    signer,
    toSign,
  })
  
  return authSig
}

export async function getSessionSigs(walletAddress: string, chain: string = 'baseSepolia', signer?: ethers.Signer) {
  // If no signer provided, try to create one from window.ethereum
  if (!signer) {
    if (!window.ethereum) {
      throw new Error('No ethereum provider available')
    }
    const provider = new ethers.BrowserProvider(window.ethereum)
    signer = await provider.getSigner()
  }
  
  const signerAddress = await signer?.getAddress()
  
  console.log('🔐 Creating session sigs:', {
    requestedAddress: walletAddress,
    signerAddress: signerAddress,
    match: signerAddress ? walletAddress.toLowerCase() === signerAddress.toLowerCase() : false
  })
  
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
      statement: "Free: Decrypt song lyrics",
    })
    
    // Generate the authSig
    const authSig = await generateAuthSig({
      signer: signer!,
      toSign,
    })
    
    return authSig
  }
  
  // Define the Lit resource
  const litResource = new LitAccessControlConditionResource('*')
  
  // Get the session signatures
  console.log('📝 Getting session sigs with:', {
    chain,
    network: litNodeClient.config.litNetwork
  })
  
  // Check if capacity delegation is available
  const capacityDelegationAuthSig = litProtocolService.getCapacityDelegation()
  
  // Create session configuration
  const sessionConfig: any = {
    chain,
    resourceAbilityRequests: [
      {
        resource: litResource,
        ability: LIT_ABILITY.AccessControlConditionDecryption,
      },
    ],
    authNeededCallback,
  }
  
  // Only add capacity delegation if available
  if (capacityDelegationAuthSig) {
    console.log('📋 Using capacity delegation from:', capacityDelegationAuthSig.address)
    sessionConfig.capacityDelegationAuthSig = capacityDelegationAuthSig
  } else {
    console.log('📋 Creating session without capacity delegation')
  }
  
  const sessionSigs = await litNodeClient.getSessionSigs(sessionConfig)
  
  console.log('✅ Session sigs created for nodes:', Object.keys(sessionSigs))
  
  return sessionSigs
}