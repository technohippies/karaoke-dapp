import { openDB, IDBPDatabase } from 'idb';
import { userTableService } from './user-table-service';
import { wordSRSService } from './word-srs.service';

interface SyncQueueItem {
  id: string;
  type: 'session' | 'word_progress' | 'milestone';
  data: any;
  createdAt: number;
  attempts: number;
  lastAttempt?: number;
  syncHash?: string; // Hash of data to detect changes
  status: 'pending' | 'syncing' | 'synced' | 'failed';
}

interface SyncMetadata {
  lastSyncTime: number;
  lastSyncHash: string;
  totalSynced: number;
  conflicts: number;
}

interface SyncDB {
  syncQueue: {
    key: string;
    value: SyncQueueItem;
    indexes: {
      'by-status': string;
      'by-type': string;
      'by-created': number;
    };
  };
  syncMetadata: {
    key: string;
    value: SyncMetadata;
  };
  syncCheckpoints: {
    key: string; // "type_timestamp"
    value: {
      type: string;
      timestamp: number;
      dataHash: string;
      itemCount: number;
    };
  };
}

export class SyncService {
  private db: IDBPDatabase<SyncDB> | null = null;
  private syncInterval: any = null;
  private isSyncing = false;

  // Public getter for debugging
  get isInitialized() {
    return !!this.db;
  }

  async initialize(): Promise<void> {
    console.log('🔧 Initializing sync service...');
    try {
      this.db = await openDB<SyncDB>('karaoke-sync', 1, {
      upgrade(db) {
        // Sync queue for pending operations
        if (!db.objectStoreNames.contains('syncQueue')) {
          const store = db.createObjectStore('syncQueue', { keyPath: 'id' });
          store.createIndex('by-status', 'status');
          store.createIndex('by-type', 'type');
          store.createIndex('by-created', 'createdAt');
        }
        
        // Metadata about sync state
        if (!db.objectStoreNames.contains('syncMetadata')) {
          db.createObjectStore('syncMetadata');
        }
        
        // Checkpoints for resumable sync
        if (!db.objectStoreNames.contains('syncCheckpoints')) {
          db.createObjectStore('syncCheckpoints');
        }
      },
      });

      // Start periodic sync
      this.startPeriodicSync();
      console.log('✅ Sync service initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize sync service:', error);
      throw error;
    }
  }

  /**
   * Queue a karaoke session for sync
   */
  async queueSession(sessionData: any): Promise<void> {
    if (!this.db) throw new Error('Sync service not initialized');

    const id = `session_${sessionData.sessionId}`;
    const dataHash = await this.hashData(sessionData);

    await this.db.put('syncQueue', {
      id,
      type: 'session',
      data: sessionData,
      createdAt: Date.now(),
      attempts: 0,
      syncHash: dataHash,
      status: 'pending'
    });

    console.log(`📤 Queued session ${id} for sync`);
  }

  /**
   * Queue word progress for sync (aggregated)
   */
  async queueWordProgress(userAddress: string): Promise<void> {
    if (!this.db) throw new Error('Sync service not initialized');

    // Get problem words from local word SRS service
    const problemWords = await wordSRSService.getProblemWords(5);
    
    // Aggregate into milestone format
    const progressData = {
      userAddress,
      timestamp: Date.now(),
      totalWordsTracked: problemWords.length,
      wordsNeedingPractice: problemWords.filter(w => w.successRate < 0.8).length,
      milestones: problemWords.map(w => ({
        word: w.word,
        attempts: w.mistakeCount,
        successRate: Math.round(w.successRate * 100),
        commonMistakes: w.commonMistakes.slice(0, 3) // Top 3
      }))
    };

    const id = `word_progress_${userAddress}_${Date.now()}`;
    const dataHash = await this.hashData(progressData);

    await this.db.put('syncQueue', {
      id,
      type: 'word_progress',
      data: progressData,
      createdAt: Date.now(),
      attempts: 0,
      syncHash: dataHash,
      status: 'pending'
    });

    console.log(`📤 Queued word progress for sync`);
  }

  /**
   * Perform sync with conflict detection
   */
  async performSync(): Promise<void> {
    if (!this.db || this.isSyncing) return;
    
    this.isSyncing = true;
    console.log('🔄 Starting sync...');

    try {
      // Get pending items
      const tx = this.db.transaction('syncQueue', 'readonly');
      const index = tx.store.index('by-status');
      const pendingItems = await index.getAll('pending');

      // Group items by type for batching
      const sessionItems = pendingItems.filter(item => item.type === 'session');
      const wordProgressItems = pendingItems.filter(item => item.type === 'word_progress');

      // Batch sync sessions by user
      if (sessionItems.length > 0) {
        const sessionsByUser = new Map<string, SyncQueueItem[]>();
        
        for (const item of sessionItems) {
          const userAddress = item.data.userAddress || item.data.userId;
          if (!sessionsByUser.has(userAddress)) {
            sessionsByUser.set(userAddress, []);
          }
          sessionsByUser.get(userAddress)!.push(item);
        }

        // Batch save sessions for each user
        for (const [userAddress, items] of sessionsByUser) {
          try {
            const sessions = items.map(item => ({
              session: item.data,
              songId: item.data.songId || 1
            }));
            
            await userTableService.batchSaveKaraokeSessions(userAddress, sessions);
            
            // Mark all as synced
            for (const item of items) {
              await this.markSynced(item.id);
            }
            
            console.log(`✅ Batch synced ${items.length} sessions for user ${userAddress}`);
          } catch (error) {
            console.error(`❌ Failed to batch sync sessions for ${userAddress}:`, error);
            for (const item of items) {
              await this.markSyncFailed(item.id);
            }
          }
        }
      }

      // Sync word progress items individually (they're already aggregated)
      for (const item of wordProgressItems) {
        try {
          await this.syncItem(item);
        } catch (error) {
          console.error(`❌ Failed to sync ${item.id}:`, error);
          await this.markSyncFailed(item.id);
        }
      }

      // Update metadata
      await this.updateSyncMetadata(pendingItems.length);
      
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Sync individual item with conflict detection
   */
  private async syncItem(item: SyncQueueItem): Promise<void> {
    if (!this.db) return;

    // Mark as syncing
    await this.db.put('syncQueue', { ...item, status: 'syncing' });

    switch (item.type) {
      case 'session':
        // Check if session already exists in Tableland
        const existingSession = await this.checkExistingSession(
          item.data.userAddress,
          item.data.sessionId
        );

        if (existingSession && existingSession.hash === item.syncHash) {
          // Already synced with same data
          console.log(`✅ Session ${item.id} already synced`);
        } else if (existingSession && existingSession.hash !== item.syncHash) {
          // Conflict! Need resolution
          console.warn(`⚠️ Conflict detected for ${item.id}`);
          await this.resolveConflict(item, existingSession);
        } else {
          // New session, safe to sync
          await userTableService.saveKaraokeSession(
            item.data.userAddress,
            item.data,
            item.data.songId
          );
          console.log(`✅ Synced session ${item.id}`);
        }
        break;

      case 'word_progress':
        // For word progress, we always append (no conflicts)
        await this.syncWordProgress(item.data);
        console.log(`✅ Synced word progress ${item.id}`);
        break;
    }

    // Mark as synced
    await this.db.put('syncQueue', { 
      ...item, 
      status: 'synced',
      lastAttempt: Date.now()
    });
  }

  /**
   * Check if session exists in Tableland
   */
  private async checkExistingSession(
    _userAddress: string,
    _sessionId: string
  ): Promise<{ hash: string } | null> {
    // This would query Tableland for existing session
    // For now, return null (not implemented)
    return null;
  }

  /**
   * Resolve sync conflicts
   */
  private async resolveConflict(
    localItem: SyncQueueItem,
    remoteData: any
  ): Promise<void> {
    // Conflict resolution strategies:
    // 1. Last-write-wins (use timestamp)
    // 2. Merge (combine scores, keep highest)
    // 3. User choice (queue for manual resolution)
    
    console.log('🔀 Resolving conflict:', {
      local: localItem.createdAt,
      remote: remoteData.timestamp
    });

    // For now: last-write-wins
    if (localItem.createdAt > remoteData.timestamp) {
      // Force update
      await userTableService.saveKaraokeSession(
        localItem.data.userAddress,
        localItem.data,
        localItem.data.songId
      );
    }
  }

  /**
   * Sync word progress to Tableland
   */
  private async syncWordProgress(data: any): Promise<void> {
    // This would write to a word_progress table in Tableland
    // Aggregated data only, not individual word records
    console.log('📊 Syncing word progress:', data);
  }

  /**
   * Mark item as synced
   */
  private async markSynced(id: string): Promise<void> {
    if (!this.db) return;

    const item = await this.db.get('syncQueue', id);
    if (item) {
      await this.db.put('syncQueue', {
        ...item,
        status: 'synced',
        lastAttempt: Date.now()
      });
    }
  }

  /**
   * Mark item as failed
   */
  private async markSyncFailed(id: string): Promise<void> {
    if (!this.db) return;

    const item = await this.db.get('syncQueue', id);
    if (item) {
      await this.db.put('syncQueue', {
        ...item,
        status: 'failed',
        attempts: item.attempts + 1,
        lastAttempt: Date.now()
      });
    }
  }

  /**
   * Update sync metadata
   */
  private async updateSyncMetadata(itemsSynced: number): Promise<void> {
    if (!this.db) return;

    const existing = await this.db.get('syncMetadata', 'global') || {
      lastSyncTime: 0,
      lastSyncHash: '',
      totalSynced: 0,
      conflicts: 0
    };

    await this.db.put('syncMetadata', {
      ...existing,
      lastSyncTime: Date.now(),
      totalSynced: existing.totalSynced + itemsSynced
    }, 'global');
  }

  /**
   * Hash data for conflict detection
   */
  private async hashData(data: any): Promise<string> {
    const str = JSON.stringify(data);
    const msgUint8 = new TextEncoder().encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Start periodic sync
   */
  private startPeriodicSync(): void {
    // Sync every 5 minutes
    this.syncInterval = setInterval(() => {
      this.performSync().catch(console.error);
    }, 5 * 60 * 1000);

    // Also sync on visibility change
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        this.performSync().catch(console.error);
      }
    });
  }

  /**
   * Get sync status
   */
  async getSyncStatus(): Promise<{
    pending: number;
    synced: number;
    failed: number;
    lastSync: number;
  }> {
    if (!this.db) return { pending: 0, synced: 0, failed: 0, lastSync: 0 };

    const tx = this.db.transaction(['syncQueue', 'syncMetadata'], 'readonly');
    const index = tx.objectStore('syncQueue').index('by-status');
    
    const pending = await index.count('pending');
    const synced = await index.count('synced');
    const failed = await index.count('failed');
    
    const metadata = await tx.objectStore('syncMetadata').get('global');

    return {
      pending,
      synced,
      failed,
      lastSync: metadata?.lastSyncTime || 0
    };
  }

  /**
   * Force sync now
   */
  async syncNow(): Promise<void> {
    return this.performSync();
  }

  /**
   * Clean old synced items
   */
  async cleanOldSyncedItems(daysToKeep: number = 7): Promise<void> {
    if (!this.db) return;

    const cutoffTime = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);
    const tx = this.db.transaction('syncQueue', 'readwrite');
    const index = tx.store.index('by-status');
    
    for await (const cursor of index.iterate('synced')) {
      if (cursor.value.lastAttempt && cursor.value.lastAttempt < cutoffTime) {
        await cursor.delete();
      }
    }
  }

  /**
   * Stop periodic sync
   */
  stopPeriodicSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }
}

// Singleton instance
export const syncService = new SyncService();