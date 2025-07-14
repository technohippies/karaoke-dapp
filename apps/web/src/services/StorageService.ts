export interface StorageMetadata {
  /** Original filename */
  name: string
  /** File size in bytes */
  size: number
  /** MIME type */
  mimeType: string
  /** Upload timestamp */
  uploadedAt: string
  /** Custom metadata */
  metadata?: Record<string, any>
}

export interface StorageUploadResult {
  /** Content Identifier (CID) for IPFS */
  cid: string
  /** Direct access URL if available */
  url?: string
  /** Storage metadata */
  metadata: StorageMetadata
  /** Success status */
  success: boolean
}

export interface StorageRetrievalResult {
  /** Retrieved content */
  content: Uint8Array
  /** Storage metadata */
  metadata: StorageMetadata
  /** Success status */
  success: boolean
}

export interface StorageConfig {
  /** Enable debug logging */
  debug?: boolean
  /** Request timeout in milliseconds */
  timeout?: number
  /** Maximum file size in bytes */
  maxFileSize?: number
  /** Allowed MIME types */
  allowedMimeTypes?: string[]
}

export interface StorageUploadOptions {
  /** Custom filename override */
  filename?: string
  /** Custom metadata to attach */
  metadata?: Record<string, any>
  /** Progress callback */
  onProgress?: (progress: number) => void
  /** Enable pinning for IPFS */
  pin?: boolean
}

export interface StorageListResult {
  /** List of stored items */
  items: Array<{
    cid: string
    metadata: StorageMetadata
  }>
  /** Continuation token for pagination */
  nextToken?: string
  /** Total count if available */
  totalCount?: number
}

export interface StorageListOptions {
  /** Maximum number of items to return */
  limit?: number
  /** Continuation token from previous request */
  nextToken?: string
  /** Filter by MIME type */
  mimeType?: string
  /** Filter by date range */
  dateRange?: {
    from: string
    to: string
  }
}

/**
 * Generic storage service interface that can be implemented by different storage backends
 * (Pinata, IPFS, AWS S3, etc.)
 */
export interface IStorageService {
  /**
   * Initialize the storage service
   */
  initialize(): Promise<void>

  /**
   * Upload content to storage
   */
  upload(
    content: Uint8Array,
    options?: StorageUploadOptions
  ): Promise<StorageUploadResult>

  /**
   * Retrieve content from storage by CID
   */
  retrieve(cid: string): Promise<StorageRetrievalResult>

  /**
   * Check if content exists in storage
   */
  exists(cid: string): Promise<boolean>

  /**
   * List stored content (if supported by backend)
   */
  list(options?: StorageListOptions): Promise<StorageListResult>

  /**
   * Delete content from storage (if supported by backend)
   */
  delete(cid: string): Promise<boolean>

  /**
   * Get metadata for stored content
   */
  getMetadata(cid: string): Promise<StorageMetadata>

  /**
   * Get direct access URL for content (if supported)
   */
  getUrl(cid: string): Promise<string | null>

  /**
   * Pin content to ensure persistence (for IPFS backends)
   */
  pin(cid: string): Promise<boolean>

  /**
   * Unpin content (for IPFS backends)
   */
  unpin(cid: string): Promise<boolean>

  /**
   * Get storage usage statistics (if supported)
   */
  getUsage(): Promise<{
    totalItems: number
    totalSize: number
    pinnedItems?: number
    pinnedSize?: number
  }>

  /**
   * Cleanup resources
   */
  disconnect(): Promise<void>
}

/**
 * Base storage service error
 */
export class StorageServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public cause?: Error
  ) {
    super(message)
    this.name = 'StorageServiceError'
  }
}

/**
 * Storage service configuration validation error
 */
export class StorageConfigError extends StorageServiceError {
  constructor(message: string, cause?: Error) {
    super(message, 'STORAGE_CONFIG_ERROR', cause)
  }
}

/**
 * Storage service upload error
 */
export class StorageUploadError extends StorageServiceError {
  constructor(message: string, cause?: Error) {
    super(message, 'STORAGE_UPLOAD_ERROR', cause)
  }
}

/**
 * Storage service retrieval error
 */
export class StorageRetrievalError extends StorageServiceError {
  constructor(message: string, cause?: Error) {
    super(message, 'STORAGE_RETRIEVAL_ERROR', cause)
  }
}

/**
 * Storage service not found error
 */
export class StorageNotFoundError extends StorageServiceError {
  constructor(cid: string, cause?: Error) {
    super(`Content not found: ${cid}`, 'STORAGE_NOT_FOUND_ERROR', cause)
  }
}

/**
 * Utility functions for storage services
 */
export class StorageUtils {
  /**
   * Validate file size against limits
   */
  static validateFileSize(content: Uint8Array, maxSize?: number): boolean {
    if (!maxSize) return true
    return content.length <= maxSize
  }

  /**
   * Validate MIME type against allowed types
   */
  static validateMimeType(mimeType: string, allowedTypes?: string[]): boolean {
    if (!allowedTypes || allowedTypes.length === 0) return true
    return allowedTypes.includes(mimeType) || allowedTypes.includes('*')
  }

  /**
   * Generate filename from content hash
   */
  static generateFilename(content: Uint8Array, extension?: string): string {
    // Simple hash-based filename generation
    const hash = content.slice(0, 8).reduce((acc, byte) => acc + byte.toString(16), '')
    return `${hash}${extension || ''}`
  }

  /**
   * Detect MIME type from content
   */
  static detectMimeType(content: Uint8Array, filename?: string): string {
    // Basic MIME type detection based on file signatures
    const signatures: Record<string, string> = {
      'ffd8ff': 'image/jpeg',
      '89504e': 'image/png',
      '474946': 'image/gif',
      '504b03': 'application/zip',
      '4d546864': 'audio/midi', // MIDI files
      '7b': 'application/json', // JSON files (starting with {)
      '3c': 'text/xml' // XML files (starting with <)
    }

    const hex = Array.from(content.slice(0, 8))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')

    for (const [signature, mimeType] of Object.entries(signatures)) {
      if (hex.startsWith(signature)) {
        return mimeType
      }
    }

    // Fallback to filename extension
    if (filename) {
      const ext = filename.split('.').pop()?.toLowerCase()
      const extMap: Record<string, string> = {
        'json': 'application/json',
        'txt': 'text/plain',
        'mid': 'audio/midi',
        'midi': 'audio/midi',
        'mp3': 'audio/mpeg',
        'wav': 'audio/wav',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif'
      }
      
      if (ext && extMap[ext]) {
        return extMap[ext]
      }
    }

    return 'application/octet-stream'
  }

  /**
   * Format bytes to human readable string
   */
  static formatBytes(bytes: number, decimals: number = 2): string {
    if (bytes === 0) return '0 Bytes'
    
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i]
  }

  /**
   * Create storage metadata
   */
  static createMetadata(
    content: Uint8Array,
    filename?: string,
    customMetadata?: Record<string, any>
  ): StorageMetadata {
    const name = filename || StorageUtils.generateFilename(content)
    const mimeType = StorageUtils.detectMimeType(content, filename)
    
    return {
      name,
      size: content.length,
      mimeType,
      uploadedAt: new Date().toISOString(),
      metadata: customMetadata
    }
  }
}