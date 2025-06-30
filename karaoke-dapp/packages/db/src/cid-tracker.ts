import { readFileSync, writeFileSync, existsSync } from 'fs';
import { createHash } from 'crypto';
import path from 'path';

export interface CIDRecord {
  cid: string;
  filename: string;
  fileHash: string;
  encrypted: boolean;
  uploadedAt: string;
  songId?: number;
  metadata?: Record<string, any>;
}

export interface CIDDatabase {
  version: string;
  uploads: Record<string, CIDRecord>;
}

export class CIDTracker {
  private dbPath: string;
  private db!: CIDDatabase;

  constructor(dbPath?: string) {
    this.dbPath = dbPath || path.join(process.cwd(), 'cid-tracker.json');
    this.load();
  }

  private load(): void {
    if (existsSync(this.dbPath)) {
      try {
        const data = readFileSync(this.dbPath, 'utf-8');
        this.db = JSON.parse(data);
      } catch (error) {
        console.error('Failed to load CID database, creating new one');
        this.db = this.createEmptyDb();
      }
    } else {
      this.db = this.createEmptyDb();
    }
  }

  private createEmptyDb(): CIDDatabase {
    return {
      version: '1.0.0',
      uploads: {}
    };
  }

  private save(): void {
    writeFileSync(this.dbPath, JSON.stringify(this.db, null, 2));
  }

  /**
   * Generate a hash for file content
   */
  static hashContent(content: Buffer): string {
    return createHash('sha256').update(content).digest('hex');
  }

  /**
   * Check if content has been uploaded
   */
  hasBeenUploaded(contentHash: string): boolean {
    return contentHash in this.db.uploads;
  }

  /**
   * Get CID for uploaded content
   */
  getCID(contentHash: string): string | null {
    const record = this.db.uploads[contentHash];
    return record ? record.cid : null;
  }

  /**
   * Get full record for uploaded content
   */
  getRecord(contentHash: string): CIDRecord | null {
    return this.db.uploads[contentHash] || null;
  }

  /**
   * Record a successful upload
   */
  recordUpload(
    contentHash: string,
    cid: string,
    filename: string,
    encrypted: boolean = false,
    songId?: number,
    metadata?: Record<string, any>
  ): void {
    this.db.uploads[contentHash] = {
      cid,
      filename,
      fileHash: contentHash,
      encrypted,
      uploadedAt: new Date().toISOString(),
      songId,
      metadata
    };
    this.save();
  }

  /**
   * Get all uploads for a specific song
   */
  getUploadsBySongId(songId: number): CIDRecord[] {
    return Object.values(this.db.uploads).filter(
      record => record.songId === songId
    );
  }

  /**
   * Export database for backup
   */
  export(): CIDDatabase {
    return JSON.parse(JSON.stringify(this.db));
  }

  /**
   * Get upload statistics
   */
  getStats(): {
    totalUploads: number;
    encryptedFiles: number;
    byDate: Record<string, number>;
  } {
    const uploads = Object.values(this.db.uploads);
    const byDate: Record<string, number> = {};

    uploads.forEach(record => {
      const date = record.uploadedAt.split('T')[0];
      byDate[date] = (byDate[date] || 0) + 1;
    });

    return {
      totalUploads: uploads.length,
      encryptedFiles: uploads.filter(r => r.encrypted).length,
      byDate
    };
  }
}