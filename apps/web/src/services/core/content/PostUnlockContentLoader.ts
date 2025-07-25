import { LrcLibService } from '../../integrations/lrclib/LrcLibService'
import { litProtocolService } from '../../../lib/litProtocol'
import { decryptToString, decryptToFile } from '@lit-protocol/encryption'
import { getDetectedLanguage } from '../../../i18n'
import type { Song } from '../../database/tableland/TablelandReadService'
import { getSessionSigs } from '../../../lib/authHelpers'
import { contentCacheService } from '../../database/cache/ContentCacheService'
import { ethers } from 'ethers'

export interface LoadedContent {
  lyrics: string | null
  translation: string | null
  midiData: Uint8Array | null
  language: string
  cached: boolean
}

export class PostUnlockContentLoader {
  private ipfsGateway = 'https://gateway.pinata.cloud'

  async checkCacheOnly(song: Song, userAddress: string): Promise<LoadedContent | null> {
    const userLanguage = getDetectedLanguage()
    const translationLanguage = (userLanguage === 'ug' || userLanguage === 'bo') ? userLanguage : 'zh'
    
    // Only check cache, don't load fresh content
    const cachedContent = await contentCacheService.getContent(song.id, userAddress, translationLanguage)
    if (cachedContent && cachedContent.midiData) {
      console.log('📦 Found complete cached content (cache-only check)')
      return { ...cachedContent, cached: true }
    }
    
    console.log('📦 No complete cached content found (cache-only check)')
    return null
  }

  async loadContent(song: Song, userAddress: string, signer?: ethers.Signer): Promise<LoadedContent> {
    const userLanguage = getDetectedLanguage()
    const translationLanguage = (userLanguage === 'ug' || userLanguage === 'bo') ? userLanguage : 'zh'
    
    // Check IndexedDB cache first
    const cachedContent = await contentCacheService.getContent(song.id, userAddress, translationLanguage)
    if (cachedContent) {
      console.log('🔍 Cache check:', {
        hasContent: !!cachedContent,
        hasMidiData: !!cachedContent.midiData,
        midiDataType: typeof cachedContent.midiData,
        midiDataLength: cachedContent.midiData?.length || 0
      })
      
      // Only use cached content if it has MIDI data (complete)
      if (cachedContent.midiData) {
        console.log('✅ Using complete cached content')
        return { ...cachedContent, cached: true }
      } else {
        console.log('⚠️ Cached content missing MIDI data, will reload from fresh')
        // Don't clear cache here - let it get overwritten with complete data
      }
    }

    console.log('🔄 Loading content for song:', song.title)
    console.log('🌐 Detected language:', userLanguage)
    
    const result: LoadedContent = {
      lyrics: null,
      translation: null,
      midiData: null,
      language: translationLanguage,
      cached: false
    }

    try {
      // Load lyrics from LrcLib
      if (song.lrclib_id) {
        console.log('🎵 Loading lyrics from LrcLib...')
        result.lyrics = await LrcLibService.fetchLyrics(song.lrclib_id)
      }

      // Load translation - default to Chinese unless user language is Uyghur or Tibetan
      const translationLanguage = (userLanguage === 'ug' || userLanguage === 'bo') ? userLanguage : 'zh'
      if (song.translations?.[translationLanguage]) {
        console.log(`🌐 Loading ${translationLanguage} translation (user language: ${userLanguage})...`)
        result.translation = await this.decryptTranslation(
          song.translations[translationLanguage],
          userAddress,
          signer
        )
      }

      // Load MIDI data
      console.log('🎹 Checking for MIDI data:', {
        hasStems: !!song.stems,
        hasPiano: !!song.stems?.piano,
        stemsData: song.stems
      })
      
      if (song.stems?.piano) {
        console.log('🎹 Loading MIDI data...')
        result.midiData = await this.decryptMidi(song.stems.piano, userAddress, signer)
      } else {
        console.log('❌ No MIDI data found - song.stems.piano is missing')
      }

      // Cache the result in IndexedDB
      await contentCacheService.saveContent(song.id, userAddress, translationLanguage, {
        lyrics: result.lyrics,
        translation: result.translation,
        midiData: result.midiData,
        language: translationLanguage
      })
      
      console.log('✅ Content loaded and cached successfully')
      return result

    } catch (error) {
      console.error('❌ Failed to load content:', error)
      throw error
    }
  }

  private async decryptTranslation(ipfsHash: string, userAddress: string, signer?: ethers.Signer): Promise<string | null> {
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
      
      const sessionSigs = await getSessionSigs(userAddress, 'baseSepolia', signer)
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

  private async decryptMidi(ipfsHash: string, userAddress: string, signer?: ethers.Signer): Promise<Uint8Array | null> {
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
      
      const sessionSigs = await getSessionSigs(userAddress, 'baseSepolia', signer)
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

// Export singleton instance
export const postUnlockContentLoader = new PostUnlockContentLoader()