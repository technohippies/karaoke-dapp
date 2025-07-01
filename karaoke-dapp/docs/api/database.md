---
description: Database architecture documentation covering Tableland decentralized SQL database, IndexedDB client storage, schemas, queries, and data management patterns.
---

# Database Architecture

The Karaoke Turbo platform uses a hybrid database architecture combining decentralized SQL (Tableland) for metadata and local IndexedDB for caching and offline functionality.

## Database Overview

<Mermaid>
<pre>
graph TD
    A[Web App] --> B[Database Service]
    B --> C[Tableland SQL]
    B --> D[IndexedDB Cache]
    
    C --> E[Songs Table]
    C --> F[Purchases Table]
    
    D --> G[MIDI Cache]
    D --> H[Session Store]
    D --> I[SRS Data]
    
    E --> J[Base Sepolia]
    F --> J
</pre>
</Mermaid>

## Tableland (Decentralized SQL)

Tableland provides decentralized, verifiable SQL database functionality on Base Sepolia.

### Network Configuration

**Chain ID:** 84532 (Base Sepolia)  
**Registry Address:** Tableland protocol registry on Base  
**Gateway URL:** `https://testnets.tableland.network`

### Tables

#### Songs Table

**Table Name:** `songs_v7_84532_132`  
**Purpose:** Store song metadata and IPFS content references

```sql
CREATE TABLE songs_v7_84532_132 (
  id INTEGER PRIMARY KEY,
  isrc TEXT NOT NULL UNIQUE,
  iswc TEXT,
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  duration INTEGER NOT NULL,
  stems TEXT NOT NULL,        -- JSON: {midi: "ipfs://...", lyrics: "ipfs://..."}
  language TEXT NOT NULL,
  genius_id INTEGER,
  lrclib_id INTEGER,
  artwork_hash TEXT,          -- IPFS hash for artwork
  slug TEXT NOT NULL UNIQUE   -- URL-friendly identifier
);
```

**Indexes:**
- Primary key on `id`
- Unique constraint on `isrc`
- Unique constraint on `slug`

#### Purchases Table

**Table Name:** `purchases_v1_84532_117`  
**Purpose:** Track user song purchases and access grants

```sql
CREATE TABLE purchases_v1_84532_117 (
  id INTEGER PRIMARY KEY,
  user_address TEXT NOT NULL,
  song_id INTEGER NOT NULL,
  purchase_type TEXT NOT NULL,    -- 'credit_unlock', 'direct_purchase'
  transaction_hash TEXT NOT NULL,
  block_number INTEGER NOT NULL,
  timestamp INTEGER NOT NULL,
  FOREIGN KEY (song_id) REFERENCES songs_v7_84532_132(id)
);
```

**Indexes:**
- Primary key on `id`
- Index on `user_address` for user lookups
- Index on `song_id` for song access queries
- Index on `transaction_hash` for tx verification

### Tableland Operations

#### Database Service Implementation

```typescript
// packages/db/src/tableland.ts
import { Database } from "@tableland/sdk"

export class TablelandService {
  private db: Database
  
  constructor() {
    this.db = new Database({
      chainId: 84532,  // Base Sepolia
    })
  }
  
  async getSong(id: number): Promise<Song | null> {
    const { results } = await this.db
      .prepare(`SELECT * FROM songs_v7_84532_132 WHERE id = ?`)
      .bind(id)
      .all()
    
    return results[0] ? this.parseRow(results[0]) : null
  }
  
  async getSongBySlug(slug: string): Promise<Song | null> {
    const { results } = await this.db
      .prepare(`SELECT * FROM songs_v7_84532_132 WHERE slug = ?`)
      .bind(slug)
      .all()
    
    return results[0] ? this.parseRow(results[0]) : null
  }
  
  async getUserPurchases(userAddress: string): Promise<Purchase[]> {
    const { results } = await this.db
      .prepare(`
        SELECT p.*, s.title, s.artist 
        FROM purchases_v1_84532_117 p
        JOIN songs_v7_84532_132 s ON p.song_id = s.id
        WHERE p.user_address = ?
        ORDER BY p.timestamp DESC
      `)
      .bind(userAddress)
      .all()
    
    return results.map(this.parsePurchaseRow)
  }
}
```

#### Query Patterns

**Common Queries:**

```sql
-- Get all songs with pagination
SELECT * FROM songs_v7_84532_132 
ORDER BY title 
LIMIT 20 OFFSET 0;

-- Search songs by artist
SELECT * FROM songs_v7_84532_132 
WHERE artist LIKE '%Lorde%' 
ORDER BY title;

-- Get user's purchased songs
SELECT s.* FROM songs_v7_84532_132 s
JOIN purchases_v1_84532_117 p ON s.id = p.song_id
WHERE p.user_address = '0x...'
ORDER BY p.timestamp DESC;

-- Get popular songs (by purchase count)
SELECT s.*, COUNT(p.id) as purchase_count
FROM songs_v7_84532_132 s
LEFT JOIN purchases_v1_84532_117 p ON s.id = p.song_id
GROUP BY s.id
ORDER BY purchase_count DESC
LIMIT 10;
```

### Data Integrity

**Validation Rules:**
- ISRC codes must be valid format (CC-XXX-YY-NNNNN)
- Stems JSON must contain valid IPFS hashes
- Slugs must be URL-safe and unique
- Duration must be positive integer (seconds)

**Constraints:**
- Foreign key relationships enforced
- Unique constraints on business identifiers
- NOT NULL constraints on required fields

## IndexedDB (Client Storage)

IndexedDB provides local, persistent storage for caching and offline functionality.

### Database Structure

#### Karaoke Cache Database

**Database Name:** `karaoke-cache`  
**Version:** 1

```typescript
// Store definitions
interface CacheStores {
  midi: {
    key: number        // song ID
    value: {
      songId: number
      data: Uint8Array  // Decrypted MIDI data
      timestamp: number
      size: number
    }
  }
  
  lyrics: {
    key: number        // song ID  
    value: {
      songId: number
      lines: LyricLine[]
      timestamp: number
    }
  }
  
  audio: {
    key: number        // song ID
    value: {
      songId: number
      buffer: ArrayBuffer
      sampleRate: number
      timestamp: number
    }
  }
}
```

#### Main Application Database

**Database Name:** `karaoke-dapp`  
**Version:** 1

```typescript
interface AppStores {
  sessions: {
    key: string        // session ID
    value: {
      id: string
      songId: number
      userAddress: string
      startTime: number
      endTime?: number
      score?: number
      recordings: AudioSegment[]
    }
  }
  
  srs: {
    key: string        // word + language
    value: {
      word: string
      language: string
      easeFactor: number
      repetitions: number
      interval: number
      nextReview: number
    }
  }
  
  settings: {
    key: string        // setting key
    value: any         // setting value
  }
}
```

### IndexedDB Operations

#### Cache Management

```typescript
// packages/db/src/idb.ts
export class IndexedDBService {
  private cache: IDBDatabase
  
  async cacheMIDI(songId: number, data: Uint8Array): Promise<void> {
    const tx = this.cache.transaction(['midi'], 'readwrite')
    const store = tx.objectStore('midi')
    
    await store.put({
      songId,
      data,
      timestamp: Date.now(),
      size: data.length
    }, songId)
  }
  
  async getCachedMIDI(songId: number): Promise<Uint8Array | null> {
    const tx = this.cache.transaction(['midi'], 'readonly')
    const store = tx.objectStore('midi')
    const result = await store.get(songId)
    
    if (!result) return null
    
    // Check if cache is still valid (24 hours)
    const maxAge = 24 * 60 * 60 * 1000
    if (Date.now() - result.timestamp > maxAge) {
      this.clearCachedMIDI(songId)
      return null
    }
    
    return result.data
  }
  
  async getCacheSize(): Promise<number> {
    const tx = this.cache.transaction(['midi'], 'readonly')
    const store = tx.objectStore('midi')
    const cursor = await store.openCursor()
    
    let totalSize = 0
    while (cursor) {
      totalSize += cursor.value.size
      await cursor.continue()
    }
    
    return totalSize
  }
}
```

#### Session Management

```typescript
export class SessionStore {
  async saveSession(session: KaraokeSession): Promise<void> {
    const tx = this.db.transaction(['sessions'], 'readwrite')
    const store = tx.objectStore('sessions')
    await store.put(session, session.id)
  }
  
  async getRecentSessions(limit: number = 10): Promise<KaraokeSession[]> {
    const tx = this.db.transaction(['sessions'], 'readonly')
    const store = tx.objectStore('sessions')
    const index = store.index('timestamp')
    
    const sessions = []
    const cursor = await index.openCursor(null, 'prev')
    
    while (cursor && sessions.length < limit) {
      sessions.push(cursor.value)
      await cursor.continue()
    }
    
    return sessions
  }
}
```

## Data Flow Architecture

### Read Operations

<Mermaid>
<pre>
sequenceDiagram
    participant App as Web App
    participant DB as Database Service  
    participant IDB as IndexedDB
    participant TL as Tableland

    App->>DB: getSong(id)
    DB->>IDB: Check cache
    
    alt Cache Hit
        IDB-->>DB: Cached data
        DB-->>App: Song data
    else Cache Miss
        DB->>TL: Query Tableland
        TL-->>DB: Song metadata
        DB->>IDB: Cache result
        DB-->>App: Song data
    end
</pre>
</Mermaid>

### Write Operations

<Mermaid>
<pre>
sequenceDiagram
    participant App as Web App
    participant DB as Database Service
    participant TL as Tableland
    participant Contract as Smart Contract

    App->>Contract: unlockSong(songId)
    Contract-->>App: Transaction success
    
    App->>DB: recordPurchase(txHash, songId)
    DB->>TL: INSERT INTO purchases
    TL-->>DB: Success
    
    DB->>App: Purchase recorded
</pre>
</Mermaid>

## Performance Optimization

### Caching Strategy

**Multi-Level Caching:**
1. **Memory Cache**: In-memory objects for current session
2. **IndexedDB**: Persistent browser storage
3. **Service Worker**: Network request caching
4. **Tableland**: Decentralized persistence

### Query Optimization

**Indexing Strategy:**
- Primary keys for direct lookups
- Secondary indexes on frequently queried fields
- Composite indexes for multi-field queries

**Pagination:**
```sql
-- Efficient pagination with offset
SELECT * FROM songs_v7_84532_132 
ORDER BY id 
LIMIT 20 OFFSET ?;

-- Cursor-based pagination (preferred for large datasets)
SELECT * FROM songs_v7_84532_132 
WHERE id > ? 
ORDER BY id 
LIMIT 20;
```

### Cache Management

**Cache Invalidation:**
- Time-based expiration (24 hours for MIDI)
- Size-based eviction (LRU policy)
- Manual cache clearing for updates

**Storage Limits:**
- IndexedDB: 10MB soft limit, expandable
- Memory cache: 50MB maximum
- Automatic cleanup when storage full

## Data Migration

### Schema Versioning

```typescript
// Database migration handler
export class MigrationService {
  async migrateToVersion(version: number): Promise<void> {
    switch (version) {
      case 1:
        await this.createInitialSchema()
        break
      case 2:
        await this.addPurchaseTimestamp()
        break
      case 3:
        await this.addSongGenreField()
        break
    }
  }
  
  private async createInitialSchema(): Promise<void> {
    // Create initial tables and indexes
  }
}
```

### Data Export/Import

```typescript
// Export user data for backup
export async function exportUserData(userAddress: string): Promise<UserDataExport> {
  const purchases = await tableland.getUserPurchases(userAddress)
  const sessions = await indexedDB.getUserSessions(userAddress)
  const srsData = await indexedDB.getSRSData(userAddress)
  
  return {
    version: '1.0',
    userAddress,
    timestamp: Date.now(),
    purchases,
    sessions,
    srsData
  }
}
```

## Security Considerations

### Data Protection

**Sensitive Data Handling:**
- User addresses stored as checksummed hex
- Session data encrypted in IndexedDB
- No private keys stored locally

**Access Control:**
- Read access controlled by smart contract
- Write access requires transaction signing
- Cache isolation between users

### Privacy

**Data Minimization:**
- Only necessary metadata stored
- User sessions expire automatically
- Optional data collection with consent

## Monitoring and Analytics

### Performance Metrics

```typescript
// Database performance monitoring
export class DatabaseMetrics {
  async recordQueryTime(query: string, duration: number): Promise<void> {
    // Record query performance
  }
  
  async getCacheHitRate(): Promise<number> {
    // Calculate cache efficiency
  }
  
  async getStorageUsage(): Promise<StorageStats> {
    // Monitor storage consumption
  }
}
```

### Error Tracking

**Common Issues:**
- Network connectivity to Tableland
- IndexedDB quota exceeded
- Cache corruption or inconsistency
- Query timeout errors

### Health Checks

```typescript
export async function databaseHealthCheck(): Promise<HealthReport> {
  const checks = await Promise.allSettled([
    testTablelandConnection(),
    testIndexedDBAccess(),
    validateCacheIntegrity(),
    checkStorageQuota()
  ])
  
  return {
    tableland: checks[0].status === 'fulfilled',
    indexedDB: checks[1].status === 'fulfilled', 
    cache: checks[2].status === 'fulfilled',
    storage: checks[3].status === 'fulfilled',
    timestamp: Date.now()
  }
}
```