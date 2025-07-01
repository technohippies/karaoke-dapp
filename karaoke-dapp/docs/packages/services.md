# Services Package

The `@karaoke-dapp/services` package contains all business logic and external service integrations.

## Installation

```bash
bun add @karaoke-dapp/services
```

## Core Services

### DatabaseService

Manages song metadata and user data with local caching.

```typescript
class DatabaseService {
  // Get all available songs
  async getSongs(): Promise<Song[]>
  
  // Get specific song by ID
  async getSong(id: number): Promise<Song | null>
  
  // Get song artwork URL
  getArtworkUrl(song: Song, size: 'f' | 'm' | 's'): string
  
  // Search songs by query
  async searchSongs(query: string): Promise<Song[]>
}
```

**Usage:**
```typescript
import { DatabaseService } from '@karaoke-dapp/services'

const db = new DatabaseService()
const songs = await db.getSongs()
const song = await db.getSong(1)
```

**Song Interface:**
```typescript
interface Song {
  id: number
  title: string
  artist: string
  duration: number
  artwork_url: string
  lrclib_id: string
  // ... other properties
}
```

### EncryptionService

Handles Lit Protocol integration for encrypted content access.

```typescript
class EncryptionService {
  // Create session signatures for temporary access
  async createSessionSignatures(
    userAddress: string,
    songId: number
  ): Promise<SessionSigs>
  
  // Decrypt MIDI file with access verification
  async decryptMidiFile(
    encryptedCid: string,
    sessionSigs: SessionSigs,
    songId: number
  ): Promise<{
    midiData: Uint8Array
    audioUrl: string
    lyricsUrl: string
  }>
  
  // Check if user has valid session
  async hasValidSession(userAddress: string): Promise<boolean>
}
```

**Usage:**
```typescript
import { EncryptionService } from '@karaoke-dapp/services'

const encryption = new EncryptionService()
const sessionSigs = await encryption.createSessionSignatures(
  userAddress,
  songId
)
```

### AiozUploadService

Manages uploads to AIOZ decentralized storage network.

```typescript
class AiozUploadService {
  // Upload file and get CID
  async uploadFile(
    file: File | Blob,
    options?: UploadOptions
  ): Promise<string>
  
  // Upload with encryption
  async uploadEncrypted(
    file: File | Blob,
    accessControlConditions: any[]
  ): Promise<{
    cid: string
    encryptedKey: string
  }>
  
  // Get file URL from CID
  getFileUrl(cid: string): string
}
```

**Upload Options:**
```typescript
interface UploadOptions {
  filename?: string
  contentType?: string
  metadata?: Record<string, any>
}
```

## Browser-Specific Services

### Browser Module (`browser.ts`)

Provides browser-specific implementations and utilities.

```typescript
// Local storage management
export class BrowserStorage {
  set(key: string, value: any): void
  get<T>(key: string): T | null
  remove(key: string): void
  clear(): void
}

// IndexedDB operations
export class BrowserDB {
  async store(storeName: string, data: any): Promise<void>
  async retrieve(storeName: string, key: any): Promise<any>
  async delete(storeName: string, key: any): Promise<void>
}
```

**Usage:**
```typescript
import { BrowserStorage, BrowserDB } from '@karaoke-dapp/services/browser'

const storage = new BrowserStorage()
storage.set('user-preferences', { theme: 'dark' })

const db = new BrowserDB()
await db.store('songs', { id: 1, title: 'Royals' })
```

## Audio Services

### MidiPlayerService

MIDI playback and audio management using Tone.js.

```typescript
class MidiPlayerService {
  // Load MIDI file for playback
  async loadMidi(midiData: Uint8Array): Promise<void>
  
  // Start/stop playback
  play(): void
  pause(): void
  stop(): void
  
  // Get playback state
  getCurrentTime(): number
  getDuration(): number
  isPlaying(): boolean
  
  // Event listeners
  onTimeUpdate(callback: (time: number) => void): void
  onComplete(callback: () => void): void
}
```

### RecordingManagerService

Manages audio recording during karaoke sessions.

```typescript
class RecordingManagerService {
  constructor(options: RecordingOptions)
  
  // Initialize with microphone stream
  initialize(stream: MediaStream): void
  
  // Record audio segments aligned with lyrics
  startSegmentRecording(segment: KaraokeSegment, currentTime: number): void
  
  // Stop recording and process audio
  dispose(): void
}

interface RecordingOptions {
  onSegmentReady: (segment: ProcessedSegment) => void
  onError: (error: Error) => void
}
```

### KaraokeGradingService

Real-time performance analysis and scoring.

```typescript
class KaraokeGradingService {
  constructor(options: GradingOptions)
  
  // Initialize grading with session
  async initialize(): Promise<void>
  
  // Grade audio segment against expected lyric
  async gradeSegment(segment: AudioSegment): Promise<GradingResult>
  
  // Get final performance score
  calculateFinalScore(lineScores: GradingResult[]): number
}

interface GradingResult {
  lyricLineId: number
  similarity: number
  timing: number
  pronunciation: number
}
```

## Configuration

Services can be configured through environment variables:

```typescript
// Configuration interface
interface ServiceConfig {
  // Lit Protocol
  LIT_NETWORK: 'datil' | 'serrano' | 'manzano'
  MIDI_DECRYPTOR_ACTION_CID: string
  
  // AIOZ Network
  AIOZ_API_URL: string
  AIOZ_GATEWAY_URL: string
  
  // Blockchain
  KARAOKE_STORE_ADDRESS: string
  CHAIN_ID: number
  RPC_URL: string
}
```

## Error Handling

All services implement consistent error handling:

```typescript
// Service-specific errors
export class DatabaseError extends Error {
  constructor(message: string, public code: string) {
    super(message)
    this.name = 'DatabaseError'
  }
}

export class EncryptionError extends Error {
  constructor(message: string, public code: string) {
    super(message)
    this.name = 'EncryptionError'
  }
}

// Usage
try {
  const songs = await db.getSongs()
} catch (error) {
  if (error instanceof DatabaseError) {
    console.error('Database operation failed:', error.code)
  }
}
```

## Testing

Services include comprehensive unit tests:

```typescript
// Example test
describe('DatabaseService', () => {
  it('should fetch songs from API', async () => {
    const db = new DatabaseService()
    const songs = await db.getSongs()
    
    expect(songs).toBeInstanceOf(Array)
    expect(songs.length).toBeGreaterThan(0)
    expect(songs[0]).toHaveProperty('id')
    expect(songs[0]).toHaveProperty('title')
  })
})
```

## Performance Considerations

- **Caching**: All services implement intelligent caching
- **Lazy Loading**: Services are instantiated only when needed
- **Memory Management**: Proper cleanup of resources
- **Error Recovery**: Automatic retry with exponential backoff