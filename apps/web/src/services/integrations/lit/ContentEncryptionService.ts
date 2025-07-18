import { LitNodeClient } from '@lit-protocol/lit-node-client'
import { 
  AccessControlConditions, 
  EncryptedFile
} from '@lit-protocol/types'

export interface EncryptionResult {
  encryptedData: EncryptedFile | any
  encryptedSymmetricKey: string
  accessControlConditions: AccessControlConditions
}

export interface DecryptionResult {
  decryptedData: string | Uint8Array
}

export interface ContentEncryptionConfig {
  network: string
  debug?: boolean
}

export interface SongAccessConditions {
  songId: number
  contractAddress: string
  chainId: number
  userAddress: string
}

export interface IContentEncryptionService {
  /**
   * Initialize the Lit Protocol client
   */
  initialize(): Promise<void>

  /**
   * Encrypt content with Lit Protocol using song unlock status as access control
   */
  encryptContent(
    content: string | Uint8Array,
    accessConditions: SongAccessConditions
  ): Promise<EncryptionResult>

  /**
   * Decrypt content with Lit Protocol
   */
  decryptContent(
    encryptedData: EncryptedFile | any,
    encryptedSymmetricKey: string,
    accessControlConditions: AccessControlConditions,
    userAddress: string
  ): Promise<DecryptionResult>

  /**
   * Create access control conditions based on song unlock status
   */
  createSongAccessConditions(
    conditions: SongAccessConditions
  ): AccessControlConditions

  /**
   * Check if user has access to decrypt content
   */
  canAccess(
    accessConditions: SongAccessConditions
  ): Promise<boolean>

  /**
   * Cleanup resources
   */
  disconnect(): Promise<void>
}

export class ContentEncryptionService implements IContentEncryptionService {
  private litNodeClient: LitNodeClient | null = null
  private readonly config: ContentEncryptionConfig

  constructor(config: ContentEncryptionConfig) {
    this.config = config
  }

  async initialize(): Promise<void> {
    if (this.litNodeClient) {
      return
    }

    this.litNodeClient = new LitNodeClient({
      litNetwork: this.config.network as any,
      debug: this.config.debug || false
    })

    await this.litNodeClient.connect()
    
    if (this.config.debug) {
      console.log('🔐 Lit Protocol client initialized')
    }
  }

  async encryptContent(
    content: string | Uint8Array,
    accessConditions: SongAccessConditions
  ): Promise<EncryptionResult> {
    if (!this.litNodeClient) {
      throw new Error('Lit Protocol client not initialized')
    }

    const accessControlConditions = this.createSongAccessConditions(accessConditions)

    try {
      let encryptedData: EncryptedFile | any

      if (typeof content === 'string') {
        // Encrypt string content (lyrics, metadata)
        const encoder = new TextEncoder()
        const result = await this.litNodeClient.encrypt({
          dataToEncrypt: encoder.encode(content),
          accessControlConditions
        })
        encryptedData = result as any
      } else {
        // Encrypt binary content (MIDI files, audio)
        const result = await this.litNodeClient.encrypt({
          dataToEncrypt: content,
          accessControlConditions
        })
        encryptedData = result as any
      }

      const encryptedSymmetricKey = await (this.litNodeClient as any).saveEncryptionKey({
        accessControlConditions,
        symmetricKey: encryptedData.symmetricKey,
        authSig: await this.getAuthSig(accessConditions.userAddress),
        chain: this.getChainName(accessConditions.chainId)
      })

      return {
        encryptedData,
        encryptedSymmetricKey,
        accessControlConditions
      }
    } catch (error) {
      console.error('❌ Failed to encrypt content:', error)
      throw new Error(`Encryption failed: ${(error as Error).message}`)
    }
  }

  async decryptContent(
    encryptedData: EncryptedFile | any,
    _encryptedSymmetricKey: string,
    accessControlConditions: AccessControlConditions,
    userAddress: string
  ): Promise<DecryptionResult> {
    if (!this.litNodeClient) {
      throw new Error('Lit Protocol client not initialized')
    }

    try {
      const authSig = await this.getAuthSig(userAddress)
      
      // In newer versions of Lit Protocol, the symmetric key is handled internally
      // The decrypt method will use the encryptedSymmetricKey automatically

      const decryptedData = await this.litNodeClient.decrypt({
        accessControlConditions,
        ciphertext: (encryptedData as any).ciphertext || encryptedData,
        dataToEncryptHash: (encryptedData as any).dataToEncryptHash,
        authSig,
        chain: this.getChainName(accessControlConditions[0].chain)
      })

      return {
        decryptedData: (decryptedData as any).decryptedData || decryptedData
      }
    } catch (error) {
      console.error('❌ Failed to decrypt content:', error)
      throw new Error(`Decryption failed: ${(error as Error).message}`)
    }
  }

  createSongAccessConditions(conditions: SongAccessConditions): AccessControlConditions {
    return [
      {
        contractAddress: conditions.contractAddress,
        standardContractType: 'ERC721', // Assuming NFT-based unlock system
        chain: this.getChainName(conditions.chainId),
        method: 'balanceOf',
        parameters: [conditions.userAddress],
        returnValueTest: {
          comparator: '>=',
          value: '1'
        }
      }
    ]
  }

  async canAccess(accessConditions: SongAccessConditions): Promise<boolean> {
    if (!this.litNodeClient) {
      throw new Error('Lit Protocol client not initialized')
    }

    try {
      const accessControlConditions = this.createSongAccessConditions(accessConditions)
      const authSig = await this.getAuthSig(accessConditions.userAddress)

      // Check if user can decrypt by attempting to get encryption key
      await (this.litNodeClient as any).getEncryptionKey({
        accessControlConditions,
        toDecrypt: 'test', // Dummy encrypted key for testing
        authSig,
        chain: this.getChainName(accessConditions.chainId)
      })

      return true
    } catch (error) {
      if (this.config.debug) {
        console.log('🔒 Access denied:', (error as Error).message)
      }
      return false
    }
  }

  async disconnect(): Promise<void> {
    if (this.litNodeClient) {
      await this.litNodeClient.disconnect()
      this.litNodeClient = null
      
      if (this.config.debug) {
        console.log('🔐 Lit Protocol client disconnected')
      }
    }
  }

  private async getAuthSig(_userAddress: string): Promise<any> {
    // This would typically use the user's wallet to sign a message
    // For now, we'll return a placeholder that would need to be implemented
    // based on the specific wallet integration
    throw new Error('Authentication signature not implemented - needs wallet integration')
  }

  private getChainName(chainId: number): string {
    const chainNames: Record<number, string> = {
      1: 'ethereum',
      5: 'goerli',
      137: 'polygon',
      80001: 'mumbai',
      8453: 'base',
      84532: 'baseSepolia'
    }
    
    return chainNames[chainId] || 'ethereum'
  }
}

/**
 * Factory function to create a ContentEncryptionService instance
 */
export function createContentEncryptionService(
  config: ContentEncryptionConfig
): IContentEncryptionService {
  return new ContentEncryptionService(config)
}

// Note: This service requires configuration, so we don't export a default instance
// Users should create their own instance with createContentEncryptionService()