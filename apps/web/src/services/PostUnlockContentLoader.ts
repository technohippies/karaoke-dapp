import { LrcLibService } from './LrcLibService'
import { litProtocolService } from '../lib/litProtocol'
import { decryptToString, decryptToFile } from '@lit-protocol/encryption'
import { getDetectedLanguage } from '../i18n'
import type { Song } from './tableland'
import { getSessionSigs } from '../lib/authHelpers'
import { contentCacheService } from './ContentCacheService'

export interface LoadedContent {
  lyrics: string | null
  translation: string | null
  midiData: Uint8Array | null
  language: string
  cached: boolean
}

export class PostUnlockContentLoader {
  private ipfsGateway = 'https://gateway.pinata.cloud'

  async loadContent(song: Song, userAddress: string): Promise<LoadedContent> {
    const userLanguage = getDetectedLanguage()
    
    // Check IndexedDB cache first
    const cachedContent = await contentCacheService.getContent(song.id, userAddress, userLanguage)
    if (cachedContent) {
      return { ...cachedContent, cached: true }
    }

    console.log('🔄 Loading content for song:', song.title)
    console.log('🌐 Detected language:', userLanguage)
    
    const result: LoadedContent = {
      lyrics: null,
      translation: null,
      midiData: null,
      language: userLanguage,
      cached: false
    }

    try {
      // Load lyrics from LrcLib
      if (song.lrclib_id) {
        console.log('🎵 Loading lyrics from LrcLib...')
        result.lyrics = await LrcLibService.fetchLyrics(song.lrclib_id)
      }

      // Load translation if user language is supported
      if (userLanguage !== 'en' && song.translations?.[userLanguage]) {
        console.log(`🌐 Loading ${userLanguage} translation...`)
        result.translation = await this.decryptTranslation(
          song.translations[userLanguage],
          userAddress
        )
      }

      // Load MIDI data
      if (song.stems?.piano) {
        console.log('🎹 Loading MIDI data...')
        result.midiData = await this.decryptMidi(song.stems.piano, userAddress)
      }

      // Cache the result in IndexedDB
      await contentCacheService.saveContent(song.id, userAddress, userLanguage, {
        lyrics: result.lyrics,
        translation: result.translation,
        midiData: result.midiData,
        language: userLanguage
      })
      
      console.log('✅ Content loaded and cached successfully')
      return result

    } catch (error) {
      console.error('❌ Failed to load content:', error)
      throw error
    }
  }

  private async decryptTranslation(ipfsHash: string, userAddress: string): Promise<string | null> {
    try {
      console.log('🔍 Decrypting translation from IPFS:', ipfsHash)
      console.log('👤 User address:', userAddress)
      
      // Fetch encrypted content from IPFS
      const response = await fetch(`${this.ipfsGateway}/ipfs/${ipfsHash}`)
      if (!response.ok) {
        throw new Error(`Failed to fetch from IPFS: ${response.statusText}`)
      }
      
      const encryptedData = await response.json()
      
      // Check if using old or new format
      const hasEvmConditions = !!encryptedData.evmContractConditions
      const hasAccessConditions = !!encryptedData.accessControlConditions
      
      console.log('📦 Encrypted data structure:', {
        hasEvmContractConditions: hasEvmConditions,
        hasAccessControlConditions: hasAccessConditions,
        hasCiphertext: !!encryptedData.ciphertext,
        hasDataToEncryptHash: !!encryptedData.dataToEncryptHash,
        conditions: hasEvmConditions ? encryptedData.evmContractConditions : encryptedData.accessControlConditions
      })
      
      // Log the exact condition
      const conditions = hasEvmConditions ? encryptedData.evmContractConditions : encryptedData.accessControlConditions
      if (conditions?.[0]) {
        const condition = conditions[0]
        console.log('🔒 Contract condition:', {
          contractAddress: condition.contractAddress,
          functionName: condition.functionName || condition.method,
          functionParams: condition.functionParams || condition.parameters,
          chain: condition.chain,
          returnValueTest: condition.returnValueTest,
          hasFunctionAbi: !!condition.functionAbi
        })
      }

      // Get session sigs for decryption
      console.log('🔑 Getting session signatures for decryption...')
      
      const sessionSigs = await getSessionSigs(userAddress)
      console.log('🔐 Session sigs obtained:', !!sessionSigs)

      // Decrypt using v7.2 approach
      console.log('🔓 Attempting decryption with:')
      console.log('   - Chain:', 'baseSepolia')
      console.log('   - Lit client connected:', litProtocolService.getClient().ready)
      
      // Support both old and new format
      const decryptParams: any = {
        ciphertext: encryptedData.ciphertext,
        dataToEncryptHash: encryptedData.dataToEncryptHash,
        sessionSigs,
        chain: 'baseSepolia',
      }
      
      if (hasEvmConditions) {
        decryptParams.evmContractConditions = encryptedData.evmContractConditions
      } else {
        decryptParams.accessControlConditions = encryptedData.accessControlConditions
      }
      
      const decryptedString = await decryptToString(
        decryptParams,
        litProtocolService.getClient()
      )
      console.log('✅ Decryption successful!')

      return decryptedString
    } catch (error: any) {
      console.error('❌ Failed to decrypt translation:', error)
      console.error('Error details:', {
        message: error.message,
        info: error.info,
        errorKind: error.errorKind,
        status: error.status,
        details: error.details,
        requestId: error.requestId
      })
      
      // Log detailed node responses if available
      if (error.info?.responses) {
        console.error('Node responses:', error.info.responses)
      }
      
      return null
    }
  }

  private async decryptMidi(ipfsHash: string, userAddress: string): Promise<Uint8Array | null> {
    try {
      // Fetch encrypted content from IPFS
      const response = await fetch(`${this.ipfsGateway}/ipfs/${ipfsHash}`)
      if (!response.ok) {
        throw new Error(`Failed to fetch from IPFS: ${response.statusText}`)
      }
      
      const encryptedData = await response.json()
      
      // Check if using old or new format
      const hasEvmConditions = !!encryptedData.evmContractConditions

      // Get session sigs for decryption
      console.log('🔑 Getting session signatures for MIDI decryption...')
      
      const sessionSigs = await getSessionSigs(userAddress)
      console.log('🔐 Session sigs obtained:', !!sessionSigs)

      // Decrypt using v7.2 approach
      const decryptParams: any = {
        ciphertext: encryptedData.ciphertext,
        dataToEncryptHash: encryptedData.dataToEncryptHash,
        sessionSigs,
        chain: 'baseSepolia',
      }
      
      if (hasEvmConditions) {
        decryptParams.evmContractConditions = encryptedData.evmContractConditions
      } else {
        decryptParams.accessControlConditions = encryptedData.accessControlConditions
      }
      
      const decryptedFile = await decryptToFile(
        decryptParams,
        litProtocolService.getClient()
      )

      // Convert to Uint8Array
      // decryptToFile returns a Blob
      if (decryptedFile instanceof Blob) {
        const arrayBuffer = await decryptedFile.arrayBuffer()
        return new Uint8Array(arrayBuffer)
      } else if (decryptedFile instanceof Uint8Array) {
        return decryptedFile
      } else {
        // Handle other potential return types
        console.warn('Unexpected decrypted file type:', typeof decryptedFile)
        return null
      }
    } catch (error) {
      console.error('Failed to decrypt MIDI:', error)
      return null
    }
  }

  async clearCache(): Promise<void> {
    await contentCacheService.clearCache()
  }
}