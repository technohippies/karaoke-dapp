# API Reference

This section documents all the services, interfaces, and APIs used in the Karaoke Turbo platform.

## Service Architecture

The application is built with a service-oriented architecture where different concerns are separated into focused services:

<Mermaid>
<pre>
graph TD
    A[Web App] --> B[Audio Services]
    A --> C[Database Services]  
    A --> D[Encryption Services]
    A --> E[Recording Services]
    
    B --> F[Tone.js Engine]
    C --> G[IndexedDB]
    C --> H[Tableland]
    D --> I[Lit Protocol]
    E --> J[Web Audio API]
</pre>
</Mermaid>

## Core Services

### Audio Management
- **[MidiPlayerService](/api/audio-services#midiplayer)** - MIDI playback with Tone.js
- **[AudioContext](/api/audio-services#audiocontext)** - React context for audio state
- **[InstrumentFactory](/api/audio-services#instruments)** - Musical instrument synthesis

### Recording & Analysis  
- **[RecordingManagerService](/api/karaoke-services#recording)** - Audio recording during karaoke
- **[KaraokeGradingService](/api/karaoke-services#grading)** - Real-time performance analysis
- **[LyricsParser](/api/karaoke-services#lyrics)** - LRC file parsing and processing

### Data Management
- **[DatabaseService](/api/database#database)** - Song metadata and user data
- **[IndexedDBWrapper](/api/database#indexeddb)** - Local storage management
- **[TablelandService](/api/database#tableland)** - Decentralized database operations

### Encryption & Security
- **[EncryptionService](/api/encryption#encryption)** - Lit Protocol integration
- **[SessionManager](/api/encryption#sessions)** - Temporary access management
- **[PKPService](/api/encryption#pkp)** - Programmable key pair operations

## Common Interfaces

### Song Data

```typescript
interface Song {
  id: number
  title: string
  artist: string
  duration: number
  artwork_url: string
  lrclib_id: string
  created_at: string
  updated_at: string
}
```

### Karaoke Session

```typescript
interface KaraokeSession {
  songId: number
  userAddress: string
  sessionId: string
  startTime: number
  duration: number
  score?: number
  lineScores: LineScore[]
}

interface LineScore {
  lineId: number
  accuracy: number
  timing: number
  pronunciation: number
}
```

### Audio Processing

```typescript
interface AudioSegment {
  data: Float32Array
  startTime: number
  endTime: number
  sampleRate: number
  lyricLineId: number
}

interface ProcessedSegment extends AudioSegment {
  transcription?: string
  confidence?: number
  similarity?: number
}
```

### Encryption Context

```typescript
interface EncryptionContext {
  sessionSigs: SessionSigs
  userAddress: string
  songId: number
  accessControlConditions: any[]
}

interface DecryptionResult {
  midiData: Uint8Array
  audioUrl: string
  lyricsUrl: string
}
```

## Error Handling

All services implement consistent error handling with specific error types:

```typescript
// Base service error
class ServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public service: string
  ) {
    super(message)
    this.name = 'ServiceError'
  }
}

// Service-specific errors
class AudioError extends ServiceError {
  constructor(message: string, code: string) {
    super(message, code, 'AudioService')
  }
}

class EncryptionError extends ServiceError {
  constructor(message: string, code: string) {
    super(message, code, 'EncryptionService')
  }
}

class DatabaseError extends ServiceError {
  constructor(message: string, code: string) {
    super(message, code, 'DatabaseService')
  }
}
```

### Common Error Codes

| Code | Description | Service |
|------|-------------|---------|
| `MIDI_LOAD_FAILED` | Failed to load MIDI file | Audio |
| `PERMISSION_DENIED` | Microphone access denied | Recording |
| `DECRYPTION_FAILED` | Lit Protocol decryption error | Encryption |
| `SESSION_EXPIRED` | User session no longer valid | Encryption |
| `SONG_NOT_FOUND` | Song not in database | Database |
| `NETWORK_ERROR` | Network connectivity issue | All |

## Configuration

Services are configured through environment variables and runtime options:

```typescript
interface ServiceConfig {
  // Audio configuration
  audioSampleRate: number
  audioBufferSize: number
  
  // Encryption configuration
  litNetwork: 'datil' | 'serrano' | 'manzano'
  actionCid: string
  
  // Database configuration
  tablelandChainId: number
  tablelandApiUrl: string
  
  // Network configuration
  rpcUrl: string
  chainId: number
}
```

## Performance Considerations

### Caching Strategy

Services implement multi-level caching:

1. **Memory Cache**: In-memory caching for frequently accessed data
2. **IndexedDB**: Persistent local storage for large files
3. **Service Worker**: Network request caching
4. **CDN**: Static asset caching

### Lazy Loading

Services are loaded on-demand to reduce initial bundle size:

```typescript
// Dynamic service loading
const loadAudioService = () => import('./audio-service')
const loadEncryptionService = () => import('./encryption-service')
```

### Resource Management

Services properly manage resources:

```typescript
class AudioService {
  private resources: MediaStream[] = []
  
  dispose() {
    this.resources.forEach(stream => {
      stream.getTracks().forEach(track => track.stop())
    })
    this.resources = []
  }
}
```

## Testing

All services include comprehensive unit tests:

```typescript
describe('AudioService', () => {
  let service: AudioService
  
  beforeEach(() => {
    service = new AudioService()
  })
  
  afterEach(() => {
    service.dispose()
  })
  
  it('should load MIDI file successfully', async () => {
    const midiData = new Uint8Array([/* test data */])
    await service.loadMidi(midiData)
    expect(service.isLoaded()).toBe(true)
  })
})
```

## Integration Examples

### Basic Usage

```typescript
import { 
  AudioService, 
  DatabaseService, 
  EncryptionService 
} from '@karaoke-dapp/services'

// Initialize services
const audio = new AudioService()
const database = new DatabaseService()
const encryption = new EncryptionService()

// Load and play a song
const song = await database.getSong(1)
const { midiData } = await encryption.decryptSong(1, sessionSigs)
await audio.loadMidi(midiData)
audio.play()
```

### React Integration

```typescript
function KaraokePlayer({ songId }: { songId: number }) {
  const { loadMidi, play, currentTime } = useAudio()
  const { state, send } = useSongMachine(songId)
  
  useEffect(() => {
    if (state.context.midiData) {
      loadMidi(state.context.midiData)
    }
  }, [state.context.midiData])
  
  return (
    <div>
      <button onClick={play}>Play</button>
      <div>Time: {currentTime}</div>
    </div>
  )
}
```

## Navigation

Browse the detailed API documentation:

- **[Audio Services](/api/audio-services)** - MIDI playback and audio processing
- **[Karaoke Services](/api/karaoke-services)** - Recording and performance analysis  
- **[Database](/api/database)** - Data management and storage
- **[Encryption](/api/encryption)** - Security and access control