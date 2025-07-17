import {
  IStorageService,
  StorageConfig,
  StorageUploadResult,
  StorageUploadOptions,
  StorageRetrievalResult,
  StorageListResult,
  StorageListOptions,
  StorageMetadata,
  StorageUploadError,
  StorageRetrievalError,
  StorageNotFoundError,
  StorageConfigError,
  StorageUtils
} from '../types/StorageService'

export interface PinataConfig extends StorageConfig {
  /** Pinata API key */
  apiKey: string
  /** Pinata API secret */
  apiSecret: string
  /** Pinata JWT token (alternative to API key/secret) */
  jwt?: string
  /** Pinata gateway URL */
  gateway?: string
  /** Default pinning options */
  defaultPinOptions?: {
    cidVersion?: 0 | 1
    wrapWithDirectory?: boolean
    customPinPolicy?: {
      regions: Array<{
        id: string
        desiredReplicationCount: number
      }>
    }
  }
}

export interface PinataFileMetadata {
  name: string
  keyvalues?: Record<string, string | number>
}

export interface PinataUploadResponse {
  IpfsHash: string
  PinSize: number
  Timestamp: string
  isDuplicate?: boolean
}

export interface PinataListResponse {
  count: number
  rows: Array<{
    id: string
    ipfs_pin_hash: string
    size: number
    user_id: string
    date_pinned: string
    date_unpinned: string | null
    metadata: {
      name: string
      keyvalues?: Record<string, string | number>
    }
    regions: Array<{
      regionId: string
      currentReplicationCount: number
      desiredReplicationCount: number
    }>
  }>
}

/**
 * Pinata IPFS storage service implementation
 */
export class PinataStorageService implements IStorageService {
  private readonly config: PinataConfig
  private readonly baseUrl = 'https://api.pinata.cloud'
  private readonly gatewayUrl: string
  private initialized = false

  constructor(config: PinataConfig) {
    this.config = config
    this.gatewayUrl = config.gateway || 'https://gateway.pinata.cloud'
    this.validateConfig()
  }

  private validateConfig(): void {
    if (!this.config.apiKey && !this.config.jwt) {
      throw new StorageConfigError('Pinata API key or JWT token is required')
    }
    
    if (this.config.apiKey && !this.config.apiSecret) {
      throw new StorageConfigError('Pinata API secret is required when using API key')
    }
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      return
    }

    try {
      // Test the connection by making a simple API call
      const response = await this.makeRequest('/data/testAuthentication', 'GET')
      
      if (!response.ok) {
        throw new StorageConfigError(`Pinata authentication failed: ${response.status}`)
      }

      this.initialized = true
      
      if (this.config.debug) {
        console.log('📌 Pinata storage service initialized')
      }
    } catch (error) {
      throw new StorageConfigError('Failed to initialize Pinata service', error)
    }
  }

  async upload(
    content: Uint8Array,
    options: StorageUploadOptions = {}
  ): Promise<StorageUploadResult> {
    if (!this.initialized) {
      await this.initialize()
    }

    // Validate file size
    if (!StorageUtils.validateFileSize(content, this.config.maxFileSize)) {
      throw new StorageUploadError(`File size exceeds maximum limit of ${this.config.maxFileSize} bytes`)
    }

    // Create metadata
    const metadata = StorageUtils.createMetadata(content, options.filename, options.metadata)

    // Validate MIME type
    if (!StorageUtils.validateMimeType(metadata.mimeType, this.config.allowedMimeTypes)) {
      throw new StorageUploadError(`MIME type ${metadata.mimeType} is not allowed`)
    }

    try {
      const formData = new FormData()
      
      // Add file
      const blob = new Blob([content], { type: metadata.mimeType })
      formData.append('file', blob, metadata.name)

      // Add metadata
      const pinataMetadata: PinataFileMetadata = {
        name: metadata.name,
        keyvalues: {
          originalName: metadata.name,
          mimeType: metadata.mimeType,
          size: metadata.size.toString(),
          uploadedAt: metadata.uploadedAt,
          ...options.metadata
        }
      }
      formData.append('pinataMetadata', JSON.stringify(pinataMetadata))

      // Add pin options
      if (options.pin !== false) {
        const pinOptions = {
          cidVersion: this.config.defaultPinOptions?.cidVersion || 1,
          wrapWithDirectory: this.config.defaultPinOptions?.wrapWithDirectory || false,
          ...this.config.defaultPinOptions
        }
        formData.append('pinataOptions', JSON.stringify(pinOptions))
      }

      // Make upload request
      const response = await this.makeRequest('/pinning/pinFileToIPFS', 'POST', formData)

      if (!response.ok) {
        const error = await response.json()
        throw new StorageUploadError(`Upload failed: ${error.error || response.statusText}`)
      }

      const result: PinataUploadResponse = await response.json()

      // Report progress
      if (options.onProgress) {
        options.onProgress(100)
      }

      return {
        cid: result.IpfsHash,
        url: `${this.gatewayUrl}/ipfs/${result.IpfsHash}`,
        metadata,
        success: true
      }
    } catch (error) {
      if (error instanceof StorageUploadError) {
        throw error
      }
      throw new StorageUploadError('Failed to upload to Pinata', error)
    }
  }

  async retrieve(cid: string): Promise<StorageRetrievalResult> {
    if (!this.initialized) {
      await this.initialize()
    }

    try {
      // Get file content
      const url = `${this.gatewayUrl}/ipfs/${cid}`
      const response = await fetch(url, {
        signal: this.createAbortSignal()
      })

      if (!response.ok) {
        if (response.status === 404) {
          throw new StorageNotFoundError(cid)
        }
        throw new StorageRetrievalError(`Failed to retrieve content: ${response.statusText}`)
      }

      const content = new Uint8Array(await response.arrayBuffer())
      
      // Get metadata
      const metadata = await this.getMetadata(cid)

      return {
        content,
        metadata,
        success: true
      }
    } catch (error) {
      if (error instanceof StorageNotFoundError || error instanceof StorageRetrievalError) {
        throw error
      }
      throw new StorageRetrievalError('Failed to retrieve from Pinata', error)
    }
  }

  async exists(cid: string): Promise<boolean> {
    if (!this.initialized) {
      await this.initialize()
    }

    try {
      const response = await this.makeRequest(`/data/pinList?hashContains=${cid}`, 'GET')
      
      if (!response.ok) {
        return false
      }

      const result: PinataListResponse = await response.json()
      return result.count > 0
    } catch (error) {
      if (this.config.debug) {
        console.error('❌ Failed to check existence:', error)
      }
      return false
    }
  }

  async list(options: StorageListOptions = {}): Promise<StorageListResult> {
    if (!this.initialized) {
      await this.initialize()
    }

    try {
      const params = new URLSearchParams()
      
      if (options.limit) {
        params.append('pageLimit', options.limit.toString())
      }
      
      if (options.nextToken) {
        params.append('pageOffset', options.nextToken)
      }

      const response = await this.makeRequest(`/data/pinList?${params}`, 'GET')
      
      if (!response.ok) {
        throw new StorageRetrievalError(`Failed to list content: ${response.statusText}`)
      }

      const result: PinataListResponse = await response.json()

      const items = result.rows.map(row => ({
        cid: row.ipfs_pin_hash,
        metadata: {
          name: row.metadata.name,
          size: row.size,
          mimeType: row.metadata.keyvalues?.mimeType as string || 'application/octet-stream',
          uploadedAt: row.date_pinned,
          metadata: row.metadata.keyvalues
        } as StorageMetadata
      }))

      return {
        items,
        totalCount: result.count,
        nextToken: items.length >= (options.limit || 10) ? 
          ((parseInt(options.nextToken || '0') || 0) + items.length).toString() : 
          undefined
      }
    } catch (error) {
      if (error instanceof StorageRetrievalError) {
        throw error
      }
      throw new StorageRetrievalError('Failed to list content from Pinata', error)
    }
  }

  async delete(cid: string): Promise<boolean> {
    if (!this.initialized) {
      await this.initialize()
    }

    try {
      const response = await this.makeRequest(`/pinning/unpin/${cid}`, 'DELETE')
      return response.ok
    } catch (error) {
      if (this.config.debug) {
        console.error('❌ Failed to delete:', error)
      }
      return false
    }
  }

  async getMetadata(cid: string): Promise<StorageMetadata> {
    if (!this.initialized) {
      await this.initialize()
    }

    try {
      const response = await this.makeRequest(`/data/pinList?hashContains=${cid}`, 'GET')
      
      if (!response.ok) {
        throw new StorageNotFoundError(cid)
      }

      const result: PinataListResponse = await response.json()
      
      if (result.count === 0) {
        throw new StorageNotFoundError(cid)
      }

      const pin = result.rows[0]
      
      return {
        name: pin.metadata.name,
        size: pin.size,
        mimeType: pin.metadata.keyvalues?.mimeType as string || 'application/octet-stream',
        uploadedAt: pin.date_pinned,
        metadata: pin.metadata.keyvalues
      }
    } catch (error) {
      if (error instanceof StorageNotFoundError) {
        throw error
      }
      throw new StorageRetrievalError('Failed to get metadata from Pinata', error)
    }
  }

  async getUrl(cid: string): Promise<string | null> {
    return `${this.gatewayUrl}/ipfs/${cid}`
  }

  async pin(cid: string): Promise<boolean> {
    if (!this.initialized) {
      await this.initialize()
    }

    try {
      const response = await this.makeRequest('/pinning/pinByHash', 'POST', {
        hashToPin: cid,
        pinataMetadata: {
          name: `Pinned content ${cid}`
        }
      })

      return response.ok
    } catch (error) {
      if (this.config.debug) {
        console.error('❌ Failed to pin:', error)
      }
      return false
    }
  }

  async unpin(cid: string): Promise<boolean> {
    return this.delete(cid)
  }

  async getUsage(): Promise<{
    totalItems: number
    totalSize: number
    pinnedItems: number
    pinnedSize: number
  }> {
    if (!this.initialized) {
      await this.initialize()
    }

    try {
      const response = await this.makeRequest('/data/pinList', 'GET')
      
      if (!response.ok) {
        throw new StorageRetrievalError(`Failed to get usage: ${response.statusText}`)
      }

      const result: PinataListResponse = await response.json()
      
      const totalSize = result.rows.reduce((acc, row) => acc + row.size, 0)
      const pinnedItems = result.rows.filter(row => !row.date_unpinned).length
      const pinnedSize = result.rows
        .filter(row => !row.date_unpinned)
        .reduce((acc, row) => acc + row.size, 0)

      return {
        totalItems: result.count,
        totalSize,
        pinnedItems,
        pinnedSize
      }
    } catch (error) {
      if (error instanceof StorageRetrievalError) {
        throw error
      }
      throw new StorageRetrievalError('Failed to get usage from Pinata', error)
    }
  }

  async disconnect(): Promise<void> {
    this.initialized = false
    
    if (this.config.debug) {
      console.log('📌 Pinata storage service disconnected')
    }
  }

  private async makeRequest(
    endpoint: string,
    method: string,
    body?: any
  ): Promise<Response> {
    const url = `${this.baseUrl}${endpoint}`
    const headers: HeadersInit = {}

    // Set authentication headers
    if (this.config.jwt) {
      headers['Authorization'] = `Bearer ${this.config.jwt}`
    } else {
      headers['pinata_api_key'] = this.config.apiKey
      headers['pinata_secret_api_key'] = this.config.apiSecret
    }

    // Set content type if not FormData
    if (body && !(body instanceof FormData)) {
      headers['Content-Type'] = 'application/json'
      body = JSON.stringify(body)
    }

    const response = await fetch(url, {
      method,
      headers,
      body,
      signal: this.createAbortSignal()
    })

    return response
  }

  private createAbortSignal(): AbortSignal {
    const controller = new AbortController()
    
    if (this.config.timeout) {
      setTimeout(() => controller.abort(), this.config.timeout)
    }

    return controller.signal
  }
}

/**
 * Factory function to create a PinataStorageService instance
 */
export function createPinataStorageService(config: PinataConfig): IStorageService {
  return new PinataStorageService(config)
}