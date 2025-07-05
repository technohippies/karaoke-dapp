import { openDB } from 'idb';
import { EncryptionService } from '@karaoke-dapp/services/browser';
import type { SessionSigsMap } from '@lit-protocol/types';
import { decryptToString } from '@lit-protocol/encryption';
import type { LitNodeClient } from '@lit-protocol/lit-node-client';

const TRANSLATION_CACHE_STORE = 'translation-cache';
const TRANSLATION_CACHE_DB = 'karaoke-translations';

export interface TranslationData {
  [language: string]: {
    [lineNumber: number]: string;
  };
}

export class TranslationService {
  private sessionSigs: SessionSigsMap | null = null;
  private encryptionService: EncryptionService | null = null;
  private litNodeClient: LitNodeClient | null = null;
  
  setEncryptionService(encryptionService: EncryptionService): void {
    this.encryptionService = encryptionService;
  }
  
  setLitNodeClient(litNodeClient: LitNodeClient): void {
    this.litNodeClient = litNodeClient;
  }
  
  async clearCache(songId?: number): Promise<void> {
    try {
      const db = await openDB(TRANSLATION_CACHE_DB, 1, {
        upgrade(db) {
          if (!db.objectStoreNames.contains(TRANSLATION_CACHE_STORE)) {
            db.createObjectStore(TRANSLATION_CACHE_STORE);
          }
        },
      });
      
      if (songId) {
        const cacheKey = `translations-song-${songId}`;
        await db.delete(TRANSLATION_CACHE_STORE, cacheKey);
      } else {
        await db.clear(TRANSLATION_CACHE_STORE);
      }
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  }

  async getTranslations(
    songId: number,
    translationCids: Record<string, string>,
    sessionSigs?: SessionSigsMap
  ): Promise<TranslationData> {
    
    // Check cache first
    const cachedData = await this.checkCache(songId);
    if (cachedData) {
      return cachedData;
    }
    
    // Return empty data - translations will be fetched on first click
    return {};
  }
  
  async fetchAndCacheAllTranslations(
    songId: number,
    translationCids: Record<string, string>,
    sessionSigs?: SessionSigsMap
  ): Promise<TranslationData> {
    
    // Check cache again in case another call already fetched
    const cachedData = await this.checkCache(songId);
    if (cachedData) {
      return cachedData;
    }

    // Use provided session sigs or create new ones (this triggers signature)
    if (!sessionSigs) {
      if (!this.sessionSigs) {
        if (!this.encryptionService) {
          this.encryptionService = new EncryptionService();
          await this.encryptionService.connect();
        }
        this.sessionSigs = await this.encryptionService.getSessionSigs();
      }
      sessionSigs = this.sessionSigs;
    }

    // Decrypt all translations at once
    const translations: TranslationData = {};
    
    for (const [language, cid] of Object.entries(translationCids)) {
      try {
        const decryptedContent = await this.decryptTranslation(cid, sessionSigs);
        translations[language] = this.parseTranslation(decryptedContent);
      } catch (error) {
        console.error(`Failed to decrypt ${language} translation:`, error);
      }
    }

    // Cache all translations
    await this.cacheTranslations(songId, translations);
    
    return translations;
  }

  private async decryptTranslation(
    encryptedCid: string,
    sessionSigs: SessionSigsMap
  ): Promise<string> {
    const response = await fetch(`https://premium.aiozpin.network/ipfs/${encryptedCid}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch encrypted translation from AIOZ: ${response.status}`);
    }
    
    const encryptedData = await response.text();
    return await this.decryptWithLit(encryptedData, sessionSigs);
  }

  private async decryptWithLit(
    encryptedData: string,
    sessionSigs: SessionSigsMap
  ): Promise<string> {
    const encryptedJson = JSON.parse(encryptedData);
    
    
    let litNodeClient = this.litNodeClient;
    
    if (!litNodeClient) {
      if (!this.encryptionService) {
        this.encryptionService = new EncryptionService();
        await this.encryptionService.connect();
      }
      
      litNodeClient = (this.encryptionService as any).litNodeClient;
      if (!litNodeClient) {
        throw new Error('Lit node client not available');
      }
    }
    
    
    
    const decryptParams: any = {
      ciphertext: encryptedJson.ciphertext || encryptedJson.encryptedData,
      dataToEncryptHash: encryptedJson.dataToEncryptHash,
      chain: encryptedJson.chain || 'base',
      sessionSigs
    };
    
    if (encryptedJson.unifiedAccessControlConditions) {
      decryptParams.unifiedAccessControlConditions = encryptedJson.unifiedAccessControlConditions;
    } else if (encryptedJson.accessControlConditions) {
      decryptParams.accessControlConditions = encryptedJson.accessControlConditions;
    }
    
    const decrypted = await decryptToString(decryptParams, litNodeClient);
    
    return decrypted;
  }

  private parseTranslation(content: string): { [lineNumber: number]: string } {
    
    try {
      // First, try to parse as JSON (our new format with reencrypted_at)
      const jsonData = JSON.parse(content);
      
      // If it has a lines array, extract translations from there
      if (jsonData.lines && Array.isArray(jsonData.lines)) {
        const translations: { [lineNumber: number]: string } = {};
        jsonData.lines.forEach((item: any, index: number) => {
          if (item.translation) {
            translations[index] = item.translation;
          }
        });
        return translations;
      }
    } catch (e) {
    }
    
    // Parse LRC format translation (legacy)
    const lines = content.split('\n');
    const translations: { [lineNumber: number]: string } = {};
    let lineNumber = 0;
    
    for (const line of lines) {
      if (line.trim()) {
        // Remove timestamp if present [00:00.00]
        const cleanLine = line.replace(/\[\d{2}:\d{2}\.\d{2}\]/g, '').trim();
        if (cleanLine) {
          translations[lineNumber] = cleanLine;
          lineNumber++;
        }
      }
    }
    
    return translations;
  }

  private async checkCache(songId: number): Promise<TranslationData | null> {
    try {
      const db = await openDB(TRANSLATION_CACHE_DB, 1, {
        upgrade(db) {
          if (!db.objectStoreNames.contains(TRANSLATION_CACHE_STORE)) {
            db.createObjectStore(TRANSLATION_CACHE_STORE);
          }
        },
      });
      
      const cacheKey = `translations-song-${songId}`;
      const cachedData = await db.get(TRANSLATION_CACHE_STORE, cacheKey);
      
      
      if (cachedData && cachedData.translations) {
        // Check if cache is still fresh (24 hours)
        const cacheAge = Date.now() - cachedData.timestamp;
        if (cacheAge < 24 * 60 * 60 * 1000) {
          // Also check if the cached data is not empty
          const hasContent = Object.keys(cachedData.translations).some(lang => 
            cachedData.translations[lang] && Object.keys(cachedData.translations[lang]).length > 0
          );
          
          if (hasContent) {
            return cachedData.translations;
          } else {
            // Delete the empty cache
            await db.delete(TRANSLATION_CACHE_STORE, cacheKey);
          }
        }
      }
      
      return null;
    } catch (error) {
      console.error('Cache check error:', error);
      return null;
    }
  }

  private async cacheTranslations(songId: number, translations: TranslationData): Promise<void> {
    try {
      const db = await openDB(TRANSLATION_CACHE_DB, 1, {
        upgrade(db) {
          if (!db.objectStoreNames.contains(TRANSLATION_CACHE_STORE)) {
            db.createObjectStore(TRANSLATION_CACHE_STORE);
          }
        },
      });
      
      const cacheKey = `translations-song-${songId}`;
      await db.put(TRANSLATION_CACHE_STORE, {
        translations,
        timestamp: Date.now(),
      }, cacheKey);
      
    } catch (error) {
      console.error('Failed to cache translations:', error);
    }
  }
}