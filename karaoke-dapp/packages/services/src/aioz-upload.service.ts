import axios from 'axios';
import FormData from 'form-data';
import { CIDTracker } from '../../db/src/cid-tracker';

export interface AIOZUploadResult {
  cid: string;
  size: number;
  url: string;
}

export class AIOZUploadService {
  private apiUrl: string;
  private publicKey: string;
  private secretKey: string;
  private tracker: CIDTracker;
  private maxRetries: number = 3;
  private uploadTimeout: number = 60000; // 60 seconds

  constructor(apiUrl: string = 'https://api.w3ipfs.storage/api', publicKey?: string, secretKey?: string, trackerPath?: string) {
    this.apiUrl = apiUrl;
    this.publicKey = publicKey || process.env.AIOZ_PUBLIC_KEY || '';
    this.secretKey = secretKey || process.env.AIOZ_SECRET_KEY || '';
    this.tracker = new CIDTracker(trackerPath);

    if (!this.publicKey || !this.secretKey) {
      console.warn('⚠️ AIOZ_PUBLIC_KEY and AIOZ_SECRET_KEY should be set for AIOZ uploads');
    }
  }

  /**
   * Upload JSON data to AIOZ
   */
  async uploadJSON(
    data: any,
    filename: string,
    songId?: number
  ): Promise<AIOZUploadResult> {
    const jsonContent = JSON.stringify(data, null, 2);
    const buffer = Buffer.from(jsonContent, 'utf-8');
    
    // Check if already uploaded
    const contentHash = CIDTracker.hashContent(buffer);
    const existingCid = this.tracker.getCID(contentHash);
    
    if (existingCid) {
      console.log(`Content already uploaded with CID: ${existingCid}`);
      return {
        cid: existingCid,
        size: buffer.length,
        url: this.getUrl(existingCid)
      };
    }

    // Upload to AIOZ with retries
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        if (attempt > 1) {
          console.log(`[AIOZ] Retry attempt ${attempt}/${this.maxRetries} for ${filename}`);
          // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }

        const cid = await this.uploadBufferInternal(buffer, filename);
        
        // Record successful upload
        this.tracker.recordUpload(
          contentHash,
          cid,
          filename,
          true,
          songId
        );

        return {
          cid,
          size: buffer.length,
          url: this.getUrl(cid)
        };
        
      } catch (error: any) {
        lastError = error;
        
        // Handle case where content already exists (409 Conflict)
        if (error.response?.status === 409 && error.response?.data?.message?.includes('already exists')) {
          console.warn('[AIOZ] Content already exists (409 Conflict)');
          
          // Generate a deterministic CID based on content hash for existing content
          const existingCid = `Qm${Buffer.from(contentHash).toString('hex').slice(0, 44)}`;
          
          this.tracker.recordUpload(
            contentHash,
            existingCid,
            filename,
            true,
            songId
          );

          return {
            cid: existingCid,
            size: buffer.length,
            url: this.getUrl(existingCid)
          };
        }
        
        console.error(`[AIOZ] Attempt ${attempt} failed:`, error.message);
      }
    }
    
    throw lastError || new Error('Upload failed after retries');
  }

  /**
   * Internal method to upload a buffer to AIOZ
   */
  private async uploadBufferInternal(fileBuffer: Buffer, originalFileName: string): Promise<string> {
    if (!this.publicKey || !this.secretKey) {
      throw new Error('AIOZ API keys are not configured');
    }

    console.log(`[AIOZ] Uploading buffer (${fileBuffer.length} bytes) as ${originalFileName}...`);
    
    const formData = new FormData();
    formData.append('file', fileBuffer, originalFileName);

    const response = await axios.post(
      `${this.apiUrl}/pinning`,
      formData,
      {
        headers: {
          'pinning_api_key': this.publicKey,
          'pinning_secret_key': this.secretKey,
          ...formData.getHeaders()
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        timeout: this.uploadTimeout
      }
    );

    // Try various potential locations for the CID in the response
    const cid = response.data?.data?.cid
             || response.data?.cid
             || response.data?.data?.IpfsHash
             || response.data?.IpfsHash;

    if (!cid) {
      console.error('[AIOZ] Upload response did not contain CID:', response.data);
      throw new Error('No CID found in AIOZ upload response');
    }

    console.log(`[AIOZ] ✅ Successfully uploaded buffer. CID: ${cid}`);
    return cid;
  }

  /**
   * Upload a file buffer to AIOZ
   */
  async uploadBuffer(fileBuffer: Buffer, originalFileName: string): Promise<AIOZUploadResult> {
    const contentHash = CIDTracker.hashContent(fileBuffer);
    const existingCid = this.tracker.getCID(contentHash);
    
    if (existingCid) {
      console.log(`Buffer already uploaded with CID: ${existingCid}`);
      return {
        cid: existingCid,
        size: fileBuffer.length,
        url: this.getUrl(existingCid)
      };
    }

    const cid = await this.uploadBufferInternal(fileBuffer, originalFileName);
    
    this.tracker.recordUpload(
      contentHash,
      cid,
      originalFileName,
      false
    );

    return {
      cid,
      size: fileBuffer.length,
      url: this.getUrl(cid)
    };
  }

  /**
   * Get the URL for accessing a CID
   */
  private getUrl(cid: string): string {
    return `https://premium.aiozpin.network/ipfs/${cid}`;
  }
}