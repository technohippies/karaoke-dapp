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

      console.log('📋 Using capacity delegation:', {
        address: capacityDelegationAuthSig.address,
        hasSig: !!capacityDelegationAuthSig.sig,
        signedMessage: capacityDelegationAuthSig.signedMessage?.substring(0, 100) + '...'
      })

      // Create session signatures that allow executing our Lit Action
      console.log('🔑 Creating session with params:', {
        chain: 'ethereum',
        expiration: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
        hasCapacityDelegation: !!capacityDelegationAuthSig,
        resourceRequests: 1
      })

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
      console.log('📋 Session details:', {
        numNodes: Object.keys(sessionSigs).length,
        firstNode: Object.keys(sessionSigs)[0],
        sessionStructure: Object.keys(sessionSigs[Object.keys(sessionSigs)[0]] || {})
      })
      
      // Check the signed message for capabilities
      const firstSession = sessionSigs[Object.keys(sessionSigs)[0]]
      if (firstSession?.signedMessage) {
        try {
          const parsed = JSON.parse(firstSession.signedMessage)
          console.log('📋 Session capabilities:', {
            hasCapabilities: !!parsed.capabilities,
            numCapabilities: parsed.capabilities?.length || 0
          })
        } catch (e) {
          console.log('📋 Could not parse signed message')
        }
      }
      
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