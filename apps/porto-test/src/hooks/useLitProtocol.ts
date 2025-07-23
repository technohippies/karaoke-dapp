import { useState, useCallback } from 'react'
import { useWalletClient, useChainId } from 'wagmi'
import { LitNodeClient } from '@lit-protocol/lit-node-client'
import { LitNetwork, LIT_RPC } from '@lit-protocol/constants'
import { 
  AccessControlConditions,
  SessionSigsMap,
  AuthSig,
  ILitNodeClient
} from '@lit-protocol/types'
import { SiweMessage } from 'siwe'
import { LitAccessControlConditionResource, LitAbility } from '@lit-protocol/auth-helpers'

interface UseLitProtocolReturn {
  connect: () => Promise<void>
  disconnect: () => void
  decrypt: (params: DecryptParams) => Promise<string>
  isConnecting: boolean
  isConnected: boolean
  error: Error | null
}

interface DecryptParams {
  ciphertext: string
  dataToEncryptHash: string
  accessControlConditions: AccessControlConditions
}

export function useLitProtocol(): UseLitProtocolReturn {
  const [litNodeClient, setLitNodeClient] = useState<ILitNodeClient | null>(null)
  const [sessionSigs, setSessionSigs] = useState<SessionSigsMap | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  
  const { data: walletClient } = useWalletClient()
  const chainId = useChainId()

  const connect = useCallback(async () => {
    if (!walletClient) {
      setError(new Error('Wallet not connected'))
      return
    }

    setIsConnecting(true)
    setError(null)

    try {
      // Initialize Lit client
      const client = new LitNodeClient({
        litNetwork: LitNetwork.DatilTest, // Use DatilTest for testing
        debug: true
      })
      
      await client.connect()
      setLitNodeClient(client)

      // Create custom auth provider for Porto
      const customProvider = {
        getAddress: async () => walletClient.account.address,
        signMessage: async (message: string) => {
          // Porto will show passkey prompt via dialog
          const signature = await walletClient.signMessage({ 
            account: walletClient.account,
            message 
          })
          return signature
        }
      }

      // Get auth signature with EIP-1271 support
      const authSig = await client.signSessionKey({
        sessionSigsParams: {
          chain: chainId === 8453 ? 'base' : 'baseSepolia',
          expiration: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(), // 24 hours
          resourceAbilityRequests: [
            {
              resource: new LitAccessControlConditionResource('*'),
              ability: LitAbility.AccessControlConditionDecryption,
            }
          ],
          authNeededCallback: async ({ uri, expiration, resourceAbilityRequests }) => {
            // Create SIWE message
            const toSign = new SiweMessage({
              domain: window.location.host,
              address: walletClient.account.address,
              statement: 'Sign in to decrypt content with Lit Protocol',
              uri: uri || window.location.origin,
              version: '1',
              chainId: chainId,
              expirationTime: expiration,
              resources: resourceAbilityRequests?.map(r => r.resource.toString())
            })
            
            const message = toSign.prepareMessage()
            const sig = await customProvider.signMessage(message)
            
            // Return auth sig with EIP-1271 flag for smart accounts
            return {
              sig,
              derivedVia: 'EIP1271', // Critical for Porto smart accounts
              signedMessage: message,
              address: walletClient.account.address,
            } as AuthSig
          }
        }
      })

      setSessionSigs(authSig)
      setIsConnected(true)
    } catch (err) {
      console.error('Failed to connect to Lit:', err)
      setError(err as Error)
    } finally {
      setIsConnecting(false)
    }
  }, [walletClient, chainId])

  const disconnect = useCallback(() => {
    if (litNodeClient) {
      litNodeClient.disconnect()
    }
    setLitNodeClient(null)
    setSessionSigs(null)
    setIsConnected(false)
    setError(null)
  }, [litNodeClient])

  const decrypt = useCallback(async (params: DecryptParams): Promise<string> => {
    if (!litNodeClient || !sessionSigs) {
      throw new Error('Lit Protocol not connected')
    }

    try {
      const decryptedResult = await litNodeClient.decrypt({
        accessControlConditions: params.accessControlConditions,
        ciphertext: params.ciphertext,
        dataToEncryptHash: params.dataToEncryptHash,
        sessionSigs,
        chain: chainId === 8453 ? 'base' : 'baseSepolia'
      })

      // Convert decrypted content to string
      const decoder = new TextDecoder()
      return decoder.decode(decryptedResult.decryptedData)
    } catch (err) {
      console.error('Decryption failed:', err)
      throw err
    }
  }, [litNodeClient, sessionSigs, chainId])

  return {
    connect,
    disconnect,
    decrypt,
    isConnecting,
    isConnected,
    error
  }
}