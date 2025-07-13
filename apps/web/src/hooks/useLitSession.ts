import { useState, useCallback } from 'react'
import { useAccount, useSignMessage } from 'wagmi'
import { litProtocolService } from '../lib/litProtocol'
import { LIT_ACTION_CID } from '../constants'
import { 
  createSiweMessageWithRecaps,
  generateAuthSig,
  LitActionResource,
  LitRLIResource
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

      // Get the capacity delegation auth sig from the app
      const capacityDelegationAuthSig = litProtocolService.getCapacityDelegation()
      
      if (!capacityDelegationAuthSig) {
        throw new Error('Capacity delegation not configured')
      }

      console.log('📋 Using capacity delegation from:', capacityDelegationAuthSig.address)

      const sessionSigs = await litProtocolService.litNodeClient.getSessionSigs({
        chain: 'ethereum',
        expiration: new Date(Date.now() + 1000 * 60 * 60).toISOString(), // 1 hour like test
        capacityDelegationAuthSig, // Use singular like test script
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
        }) => {
          const toSign = await createSiweMessageWithRecaps({
            uri: uri || 'https://localhost',
            expiration,
            resources: resourceAbilityRequests,
            walletAddress: address,
            nonce: await litProtocolService.litNodeClient!.getLatestBlockhash(),
            litNodeClient: litProtocolService.litNodeClient!,
            domain: 'localhost',
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
      })

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