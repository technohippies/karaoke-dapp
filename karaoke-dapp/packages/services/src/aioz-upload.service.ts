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
  private apiKey?: string;
  private tracker: CIDTracker;

  constructor(apiUrl: string = 'https://premium.aiozpin.network', apiKey?: string, trackerPath?: string) {
    this.apiUrl = apiUrl;
    this.apiKey = apiKey;
    this.tracker = new CIDTracker(trackerPath);
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

    // Upload to AIOZ
    const formData = new FormData();
    formData.append('file', buffer, {
      filename,
      contentType: 'application/json'
    });

    const headers = {
      ...formData.getHeaders(),
      ...(this.apiKey ? { 'Authorization': `Bearer ${this.apiKey}` } : {})
    };

    try {
      const response = await axios.post(
        `${this.apiUrl}/api/v0/add`,
        formData,
        { headers }
      );

      const cid = response.data.Hash;
      
      // Record successful upload
      this.tracker.recordUpload(
        contentHash,
        cid,
        filename,
        true, // encrypted
        songId,
        { type: 'encrypted-midi', originalSize: buffer.length }
      );

      return {
        cid,
        size: parseInt(response.data.Size),
        url: this.getUrl(cid)
      };
    } catch (error: any) {
      if (error.response?.status === 409) {
        // File already exists error from AIOZ
        console.warn('AIOZ reports file already exists, but we don\'t have the CID!');
        throw new Error('File exists on AIOZ but CID unknown. Manual intervention required.');
      }
      throw error;
    }
  }

  /**
   * Upload raw file to AIOZ
   */
  async uploadFile(
    filePath: string,
    buffer: Buffer,
    songId?: number
  ): Promise<AIOZUploadResult> {
    // Check if already uploaded
    const contentHash = CIDTracker.hashContent(buffer);
    const existingCid = this.tracker.getCID(contentHash);
    
    if (existingCid) {
      console.log(`File already uploaded with CID: ${existingCid}`);
      return {
        cid: existingCid,
        size: buffer.length,
        url: this.getUrl(existingCid)
      };
    }

    const formData = new FormData();
    formData.append('file', buffer, {
      filename: filePath.split('/').pop() || 'file'
    });

    const headers = {
      ...formData.getHeaders(),
      ...(this.apiKey ? { 'Authorization': `Bearer ${this.apiKey}` } : {})
    };

    try {
      const response = await axios.post(
        `${this.apiUrl}/api/v0/add`,
        formData,
        { headers }
      );

      const cid = response.data.Hash;
      
      // Record successful upload
      this.tracker.recordUpload(
        contentHash,
        cid,
        filePath.split('/').pop() || 'file',
        false, // not encrypted
        songId
      );

      return {
        cid,
        size: parseInt(response.data.Size),
        url: this.getUrl(cid)
      };
    } catch (error: any) {
      if (error.response?.status === 409) {
        console.warn('AIOZ reports file already exists, but we don\'t have the CID!');
        throw new Error('File exists on AIOZ but CID unknown. Manual intervention required.');
      }
      throw error;
    }
  }

  /**
   * Get URL for accessing content
   */
  getUrl(cid: string): string {
    return `${this.apiUrl}/ipfs/${cid}`;
  }

  /**
   * Get upload statistics
   */
  getStats() {
    return this.tracker.getStats();
  }

  /**
   * Check if content has been uploaded
   */
  hasBeenUploaded(content: Buffer): boolean {
    const hash = CIDTracker.hashContent(content);
    return this.tracker.hasBeenUploaded(hash);
  }
}