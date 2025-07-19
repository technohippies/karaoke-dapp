import { IContentEncryptionService, SongAccessConditions, EncryptionResult } from '../../integrations/lit/ContentEncryptionService'
import { IStorageService, StorageUploadResult } from '../../storage/types/StorageService'

export interface SongContent {
  /** Song ID */
  id: number
  /** Song title */
  title: string
  /** Song artist */
  artist: string
  /** MIDI file content */
  midiData?: Uint8Array
  /** Lyrics content */
  lyrics?: string
  /** Additional metadata */
  metadata?: Record<string, any>
}

export interface EncryptedSongContent {
  /** Song ID */
  id: number
  /** Encrypted MIDI file CID */
  encryptedMidiCid?: string
  /** Encrypted lyrics CID */
  encryptedLyricsCid?: string
  /** Metadata CID */
  metadataCid?: string
  /** Access control conditions */
  accessConditions: SongAccessConditions
  /** Encryption metadata */
  encryptionMetadata: {
    encryptedSymmetricKey: string
    accessControlConditions: any
  }
  /** Upload timestamp */
  uploadedAt: string
}

export interface SongContentManagerConfig {
  /** Content encryption service */
  encryptionService: IContentEncryptionService
  /** Storage service */
  storageService: IStorageService
  /** Enable debug logging */
  debug?: boolean
  /** Default access conditions */
  defaultAccessConditions?: Partial<SongAccessConditions>
}

export interface UploadProgress {
  /** Current step */
  step: 'encrypting' | 'uploading_midi' | 'uploading_lyrics' | 'uploading_metadata' | 'complete'
  /** Progress percentage (0-100) */
  progress: number
  /** Current operation message */
  message: string
}

export interface DecryptedSongContent {
  /** Song ID */
  id: number
  /** Decrypted MIDI file */
  midiData?: Uint8Array
  /** Decrypted lyrics */
  lyrics?: string
  /** Song metadata */
  metadata?: Record<string, any>
  /** Success status */
  success: boolean
}

/**
 * Song content manager that orchestrates encryption and storage operations
 */
export class SongContentManager {
  private readonly config: SongContentManagerConfig

  constructor(config: SongContentManagerConfig) {
    this.config = config
  }

  /**
   * Initialize the content manager
   */
  async initialize(): Promise<void> {
    await Promise.all([
      this.config.encryptionService.initialize(),
      this.config.storageService.initialize()
    ])

    if (this.config.debug) {
      console.log('🎵 Song content manager initialized')
    }
  }

  /**
   * Upload and encrypt song content
   */
  async uploadSongContent(
    content: SongContent,
    accessConditions: SongAccessConditions,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<EncryptedSongContent> {
    const reportProgress = (step: UploadProgress['step'], progress: number, message: string) => {
      if (onProgress) {
        onProgress({ step, progress, message })
      }
    }

    try {
      // Merge with default access conditions
      const finalAccessConditions = {
        ...this.config.defaultAccessConditions,
        ...accessConditions
      }

      reportProgress('encrypting', 10, 'Encrypting song content...')

      const encryptionResults: {
        midi?: EncryptionResult
        lyrics?: EncryptionResult
        metadata?: EncryptionResult
      } = {}

      // Encrypt MIDI data if present
      if (content.midiData) {
        encryptionResults.midi = await this.config.encryptionService.encryptContent(
          content.midiData,
          finalAccessConditions
        )
      }

      reportProgress('encrypting', 30, 'Encrypting lyrics...')

      // Encrypt lyrics if present
      if (content.lyrics) {
        encryptionResults.lyrics = await this.config.encryptionService.encryptContent(
          content.lyrics,
          finalAccessConditions
        )
      }

      reportProgress('encrypting', 50, 'Encrypting metadata...')

      // Encrypt metadata
      const metadataJson = JSON.stringify({
        id: content.id,
        title: content.title,
        artist: content.artist,
        ...content.metadata
      })

      encryptionResults.metadata = await this.config.encryptionService.encryptContent(
        metadataJson,
        finalAccessConditions
      )

      // Upload encrypted content to storage
      const uploadResults: {
        midi?: StorageUploadResult
        lyrics?: StorageUploadResult
        metadata?: StorageUploadResult
      } = {}

      // Upload encrypted MIDI
      if (encryptionResults.midi) {
        reportProgress('uploading_midi', 60, 'Uploading encrypted MIDI...')
        
        const encryptedMidiData = this.serializeEncryptedData(encryptionResults.midi.encryptedData)
        uploadResults.midi = await this.config.storageService.upload(
          encryptedMidiData,
          {
            filename: `song-${content.id}-midi.encrypted`,
            metadata: {
              type: 'encrypted_midi',
              songId: content.id,
              title: content.title,
              artist: content.artist
            }
          }
        )
      }

      // Upload encrypted lyrics
      if (encryptionResults.lyrics) {
        reportProgress('uploading_lyrics', 70, 'Uploading encrypted lyrics...')
        
        const encryptedLyricsData = this.serializeEncryptedData(encryptionResults.lyrics.encryptedData)
        uploadResults.lyrics = await this.config.storageService.upload(
          encryptedLyricsData,
          {
            filename: `song-${content.id}-lyrics.encrypted`,
            metadata: {
              type: 'encrypted_lyrics',
              songId: content.id,
              title: content.title,
              artist: content.artist
            }
          }
        )
      }

      // Upload encrypted metadata
      if (encryptionResults.metadata) {
        reportProgress('uploading_metadata', 80, 'Uploading encrypted metadata...')
        
        const encryptedMetadataData = this.serializeEncryptedData(encryptionResults.metadata.encryptedData)
        uploadResults.metadata = await this.config.storageService.upload(
          encryptedMetadataData,
          {
            filename: `song-${content.id}-metadata.encrypted`,
            metadata: {
              type: 'encrypted_metadata',
              songId: content.id,
              title: content.title,
              artist: content.artist
            }
          }
        )
      }

      reportProgress('complete', 100, 'Upload complete!')

      // Use the first available encryption result for the shared encryption metadata
      const sharedEncryptionResult = encryptionResults.metadata || encryptionResults.lyrics || encryptionResults.midi!

      const result: EncryptedSongContent = {
        id: content.id,
        encryptedMidiCid: uploadResults.midi?.cid,
        encryptedLyricsCid: uploadResults.lyrics?.cid,
        metadataCid: uploadResults.metadata?.cid,
        accessConditions: finalAccessConditions,
        encryptionMetadata: {
          encryptedSymmetricKey: sharedEncryptionResult.encryptedSymmetricKey,
          accessControlConditions: sharedEncryptionResult.accessControlConditions
        },
        uploadedAt: new Date().toISOString()
      }

      if (this.config.debug) {
        console.log('🎵 Song content uploaded successfully:', result)
      }

      return result
    } catch (error) {
      console.error('❌ Failed to upload song content:', error)
      throw new Error(`Failed to upload song content: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Download and decrypt song content
   */
  async downloadSongContent(
    encryptedContent: EncryptedSongContent,
    userAddress: string
  ): Promise<DecryptedSongContent> {
    try {
      // Check if user has access
      const hasAccess = await this.config.encryptionService.canAccess(
        encryptedContent.accessConditions
      )

      if (!hasAccess) {
        throw new Error('Access denied: User does not have permission to decrypt this content')
      }

      const decryptedContent: DecryptedSongContent = {
        id: encryptedContent.id,
        success: false
      }

      // Download and decrypt MIDI if available
      if (encryptedContent.encryptedMidiCid) {
        const midiStorage = await this.config.storageService.retrieve(
          encryptedContent.encryptedMidiCid
        )
        
        const encryptedMidiData = this.deserializeEncryptedData(midiStorage.content)
        const decryptedMidi = await this.config.encryptionService.decryptContent(
          encryptedMidiData,
          encryptedContent.encryptionMetadata.encryptedSymmetricKey,
          encryptedContent.encryptionMetadata.accessControlConditions,
          userAddress
        )

        decryptedContent.midiData = decryptedMidi.decryptedData as Uint8Array
      }

      // Download and decrypt lyrics if available
      if (encryptedContent.encryptedLyricsCid) {
        const lyricsStorage = await this.config.storageService.retrieve(
          encryptedContent.encryptedLyricsCid
        )
        
        const encryptedLyricsData = this.deserializeEncryptedData(lyricsStorage.content)
        const decryptedLyrics = await this.config.encryptionService.decryptContent(
          encryptedLyricsData,
          encryptedContent.encryptionMetadata.encryptedSymmetricKey,
          encryptedContent.encryptionMetadata.accessControlConditions,
          userAddress
        )

        decryptedContent.lyrics = decryptedLyrics.decryptedData as string
      }

      // Download and decrypt metadata if available
      if (encryptedContent.metadataCid) {
        const metadataStorage = await this.config.storageService.retrieve(
          encryptedContent.metadataCid
        )
        
        const encryptedMetadataData = this.deserializeEncryptedData(metadataStorage.content)
        const decryptedMetadata = await this.config.encryptionService.decryptContent(
          encryptedMetadataData,
          encryptedContent.encryptionMetadata.encryptedSymmetricKey,
          encryptedContent.encryptionMetadata.accessControlConditions,
          userAddress
        )

        decryptedContent.metadata = JSON.parse(decryptedMetadata.decryptedData as string)
      }

      decryptedContent.success = true

      if (this.config.debug) {
        console.log('🎵 Song content decrypted successfully:', decryptedContent)
      }

      return decryptedContent
    } catch (error) {
      console.error('❌ Failed to download song content:', error)
      return {
        id: encryptedContent.id,
        success: false
      }
    }
  }

  /**
   * Check if user can access specific song content
   */
  async canAccessSong(
    encryptedContent: EncryptedSongContent
  ): Promise<boolean> {
    try {
      return await this.config.encryptionService.canAccess(
        encryptedContent.accessConditions
      )
    } catch (error) {
      if (this.config.debug) {
        console.error('❌ Error checking access:', error)
      }
      return false
    }
  }

  /**
   * List all encrypted song content
   */
  async listSongContent(): Promise<EncryptedSongContent[]> {
    try {
      const listResult = await this.config.storageService.list({
        limit: 100 // Adjust as needed
      })

      // Group items by song ID
      const songGroups: Record<number, any[]> = {}
      
      for (const item of listResult.items) {
        const songId = item.metadata.metadata?.songId
        if (songId) {
          if (!songGroups[songId]) {
            songGroups[songId] = []
          }
          songGroups[songId].push(item)
        }
      }

      // Convert to EncryptedSongContent format
      const encryptedSongs: EncryptedSongContent[] = []
      
      for (const [songId, items] of Object.entries(songGroups)) {
        const midiItem = items.find(item => item.metadata.metadata?.type === 'encrypted_midi')
        const lyricsItem = items.find(item => item.metadata.metadata?.type === 'encrypted_lyrics')
        const metadataItem = items.find(item => item.metadata.metadata?.type === 'encrypted_metadata')

        if (metadataItem) {
          // This is a simplified reconstruction - in a real app, you'd store the full metadata
          const song: EncryptedSongContent = {
            id: parseInt(songId),
            encryptedMidiCid: midiItem?.cid,
            encryptedLyricsCid: lyricsItem?.cid,
            metadataCid: metadataItem.cid,
            accessConditions: {
              songId: parseInt(songId),
              contractAddress: '', // Would need to be stored/retrieved
              chainId: 0, // Would need to be stored/retrieved
              userAddress: '' // Would need to be stored/retrieved
            },
            encryptionMetadata: {
              encryptedSymmetricKey: '', // Would need to be stored/retrieved
              accessControlConditions: {} // Would need to be stored/retrieved
            },
            uploadedAt: metadataItem.metadata.uploadedAt
          }

          encryptedSongs.push(song)
        }
      }

      return encryptedSongs
    } catch (error) {
      console.error('❌ Failed to list song content:', error)
      return []
    }
  }

  /**
   * Delete song content
   */
  async deleteSongContent(encryptedContent: EncryptedSongContent): Promise<boolean> {
    try {
      const deletePromises: Promise<boolean>[] = []

      if (encryptedContent.encryptedMidiCid) {
        deletePromises.push(this.config.storageService.delete(encryptedContent.encryptedMidiCid))
      }

      if (encryptedContent.encryptedLyricsCid) {
        deletePromises.push(this.config.storageService.delete(encryptedContent.encryptedLyricsCid))
      }

      if (encryptedContent.metadataCid) {
        deletePromises.push(this.config.storageService.delete(encryptedContent.metadataCid))
      }

      const results = await Promise.all(deletePromises)
      const success = results.every(result => result)

      if (this.config.debug) {
        console.log(`🎵 Song content deletion ${success ? 'successful' : 'failed'}`)
      }

      return success
    } catch (error) {
      console.error('❌ Failed to delete song content:', error)
      return false
    }
  }

  /**
   * Cleanup resources
   */
  async disconnect(): Promise<void> {
    await Promise.all([
      this.config.encryptionService.disconnect(),
      this.config.storageService.disconnect()
    ])

    if (this.config.debug) {
      console.log('🎵 Song content manager disconnected')
    }
  }

  /**
   * Serialize encrypted data for storage
   */
  private serializeEncryptedData(encryptedData: any): Uint8Array {
    const serialized = JSON.stringify(encryptedData)
    return new TextEncoder().encode(serialized)
  }

  /**
   * Deserialize encrypted data from storage
   */
  private deserializeEncryptedData(data: Uint8Array): any {
    const serialized = new TextDecoder().decode(data)
    return JSON.parse(serialized)
  }
}

/**
 * Factory function to create a SongContentManager instance
 */
export function createSongContentManager(
  config: SongContentManagerConfig
): SongContentManager {
  return new SongContentManager(config)
}

/**
 * Utility function to create a complete song content management system
 */
export function createSongContentSystem(
  encryptionService: IContentEncryptionService,
  storageService: IStorageService,
  options: {
    debug?: boolean
    defaultAccessConditions?: Partial<SongAccessConditions>
  } = {}
): SongContentManager {
  return createSongContentManager({
    encryptionService,
    storageService,
    debug: options.debug,
    defaultAccessConditions: options.defaultAccessConditions
  })
}