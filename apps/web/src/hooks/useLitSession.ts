import { useState, useCallback } from 'react'
import { useAccount, useSignMessage } from 'wagmi'
import { litProtocolService } from '../lib/litProtocol'
import { 
  createSiweMessageWithRecaps,
  generateAuthSig,
  LitActionResource
} from '@lit-protocol/auth-helpers'
import { LIT_ABILITY } from '@lit-protocol/constants'

export function useLitSession() {
  const { address } = useAccount()
  const { signMessageAsync } = useSignMessage()
  const [sessionSigs, setSessionSigs] = useState<any>(null)
  const [isCreatingSession, setIsCreatingSession] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createSession = useCallback(async () => {
    if (!address || !litProtocolService.litNodeClient) {
      setError('Wallet not connected or Lit not initialized')
      return null
    }

    setIsCreatingSession(true)
    setError(null)

    try {
      console.log('🔐 Creating Lit session for:', address)

      // Check if capacity delegation is available
      const capacityDelegationAuthSig = litProtocolService.getCapacityDelegation()
      
      // Create session configuration based on whether we have capacity delegation
      const sessionConfig: any = {
        chain: 'ethereum',
        expiration: new Date(Date.now() + 1000 * 60 * 60).toISOString(), // 1 hour
        resourceAbilityRequests: [
          {
            resource: new LitActionResource('*'),
            ability: LIT_ABILITY.LitActionExecution,
          },
        ],
        authNeededCallback: async ({
          uri,
          expiration,
          resourceAbilityRequests,
        }: {
          uri?: string;
          expiration?: string;
          resourceAbilityRequests?: any[];
        }) => {
          const toSign = await createSiweMessageWithRecaps({
            uri: uri || 'https://localhost',
            expiration: expiration || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            resources: resourceAbilityRequests || [],
            walletAddress: address,
            nonce: await litProtocolService.litNodeClient!.getLatestBlockhash(),
            litNodeClient: litProtocolService.litNodeClient!,
            domain: 'localhost',
            statement: "免费：解密歌曲歌词", // Custom message: "Free: Decrypt song lyrics"
          })

          // Create a signer object that works with wagmi's signMessageAsync
          const signer = {
            signMessage: async (message: string) => signMessageAsync({ message }),
            getAddress: async () => address
          }

          return await generateAuthSig({ 
            signer: signer as any, 
            toSign 
          })
        },
      }

      // Only add capacity delegation if it's available
      if (capacityDelegationAuthSig) {
        console.log('📋 Using capacity delegation from:', capacityDelegationAuthSig.address)
        sessionConfig.capacityDelegationAuthSig = capacityDelegationAuthSig
      } else {
        console.log('📋 Creating session without capacity delegation')
      }

      const sessionSigs = await litProtocolService.litNodeClient.getSessionSigs(sessionConfig)

      console.log('✅ Session created successfully')
      
      setSessionSigs(sessionSigs)
      
      // Store in the service for use in grading
      litProtocolService.setSessionSigs(sessionSigs)
      
      return sessionSigs
    } catch (err) {
      console.error('❌ Failed to create session:', err)
      setError(err instanceof Error ? err.message : 'Failed to create session')
      return null
    } finally {
      setIsCreatingSession(false)
    }
  }, [address, signMessageAsync])

  return {
    sessionSigs,
    isCreatingSession,
    error,
    createSession,
    hasValidSession: !!sessionSigs
  }
}