/**
 * Result of a storage upload operation
 */
export interface StorageUploadResult {
  /** The unique identifier or URI of the uploaded file */
  uri: string
  /** The IPFS hash or content identifier (if applicable) */
  cid?: string
  /** The gateway URL to access the content */
  gatewayUrl?: string
  /** Additional metadata about the upload */
  metadata?: Record<string, any>
}

/**
 * Storage service interface for uploading content
 */
export interface IStorageService {
  /**
   * Upload a file to the storage service
   * @param file - The file data to upload
   * @param options - Optional upload configuration
   * @returns Promise resolving to upload result
   */
  uploadFile(
    file: Uint8Array | Blob | File,
    options?: {
      /** File name */
      name?: string
      /** MIME type */
      contentType?: string
      /** Additional metadata */
      metadata?: Record<string, any>
    }
  ): Promise<StorageUploadResult>

  /**
   * Upload JSON data to the storage service
   * @param data - The JSON data to upload
   * @param options - Optional upload configuration
   * @returns Promise resolving to upload result
   */
  uploadJSON(
    data: any,
    options?: {
      /** File name */
      name?: string
      /** Additional metadata */
      metadata?: Record<string, any>
    }
  ): Promise<StorageUploadResult>

  /**
   * Check if the storage service is available and configured
   * @returns Promise resolving to availability status
   */
  isAvailable(): Promise<boolean>

  /**
   * Get a file from storage by URI
   * @param uri - The URI of the file to retrieve
   * @returns Promise resolving to the file data
   */
  getFile(uri: string): Promise<Uint8Array>

  /**
   * Get JSON data from storage by URI
   * @param uri - The URI of the JSON to retrieve
   * @returns Promise resolving to the parsed JSON data
   */
  getJSON<T = any>(uri: string): Promise<T>
}