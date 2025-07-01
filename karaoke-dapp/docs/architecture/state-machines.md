# State Machines

Karaoke Turbo uses XState for managing complex application state. This provides predictable state transitions, clear debugging, and robust error handling.

## Architecture Overview

The application uses a hierarchical state machine pattern with two main machines:

<Mermaid graph="
stateDiagram-v2
    [*] --> SongMachine
    SongMachine --> KaraokeMachine : START_KARAOKE
    KaraokeMachine --> SongMachine : EXIT / COMPLETE
    
    state SongMachine {
        [*] --> idle
        idle --> checkingAccess
        checkingAccess --> purchased
        checkingAccess --> unpurchased
        purchased --> karaoke
        karaoke --> purchased
    }
    
    state KaraokeMachine {
        [*] --> countdown
        countdown --> playing
        playing --> stopped
        stopped --> [*]
    }
" />

## Song State Machine

Manages the lifecycle of song access, purchase, and preparation.

### States

#### `idle`
Initial state when component loads.

**Entry Actions:** None  
**Available Events:** `CHECK_ACCESS`

#### `checkingAccess`
Verifies if user has purchased the song.

**Entry Actions:** 
- Invoke `checkAccess` service
- Show loading indicator

**Transitions:**
- `onDone` → `purchased` (if user has access)
- `onDone` → `canUnlock` (if user has credits)
- `onDone` → `unpurchased` (if no access)
- `onError` → `error`

#### `purchased`
User has access to the song. Contains sub-states for download management.

**Sub-states:**
- `checkingCache` - Verify if MIDI is cached locally
- `needsDownload` - MIDI not cached, show download button
- `downloading` - Downloading and decrypting MIDI
- `ready` - Song ready to play

#### `karaoke`
Karaoke session is active. Spawns the karaoke machine as a child actor.

**Entry Actions:**
- Spawn `karaokeMachine` actor
- Pass song data and session signatures

**Child Actor:** `karaokeMachine`
**Events:** `EXIT` to return to purchased state

### Context

```typescript
interface SongContext {
  songId: number
  userAddress?: string
  tokenId?: number
  credits?: number
  midiData?: Uint8Array
  audioUrl?: string
  lyricsUrl?: string
  sessionSigs?: SessionSigs
  encryptedCid?: string
  error?: string
  lastKaraokeScore?: number
}
```

### Events

```typescript
type SongEvent =
  | { type: 'CHECK_ACCESS' }
  | { type: 'PURCHASE' }
  | { type: 'UNLOCK' }
  | { type: 'DOWNLOAD' }
  | { type: 'START_KARAOKE' }
  | { type: 'EXIT' }
  | { type: 'RETRY' }
  | { type: 'UPDATE_ADDRESS'; address: string }
```

### Services

#### `checkAccess`
Verifies user's access to the song via smart contract.

```typescript
const checkAccess = async ({ context }: { context: SongContext }) => {
  const contract = getKaraokeStoreContract()
  const hasAccess = await contract.hasSongAccess(
    context.userAddress, 
    context.songId
  )
  
  if (hasAccess) {
    const tokenId = await contract.getSongToken(context.userAddress, context.songId)
    return { hasAccess: true, tokenId }
  }
  
  const credits = await contract.creditBalance(context.userAddress)
  return { hasAccess: false, credits }
}
```

#### `unlockSong`
Uses user credits to unlock a song.

```typescript
const unlockSong = async ({ context }: { context: SongContext }) => {
  const contract = getKaraokeStoreContract()
  const tx = await contract.unlockSong(context.songId)
  await tx.wait()
  
  // Check if MIDI data is immediately available (cached)
  const cached = await checkCachedMidi(context.songId)
  return {
    tokenId: await contract.getSongToken(context.userAddress, context.songId),
    ...cached
  }
}
```

## Karaoke State Machine

Manages the karaoke session from countdown to completion.

### States

#### `countdown`
3-second countdown before karaoke starts.

**Entry Actions:**
- Set countdown to 3
- Start countdown timer

**Events:**
- `UPDATE_COUNTDOWN` - Updates countdown value
- `STOP` - Cancel and return to ready

#### `playing`
Active karaoke session with audio playback and recording.

**Entry Actions:**
- `startPlayback` - Begin MIDI playback
- `startLyricSync` - Sync lyrics with audio
- `startRecording` - Begin voice recording

**Exit Actions:**
- `stopPlayback` - Stop audio
- `stopLyricSync` - Stop lyric sync
- `stopRecordingAndProcess` - Stop and process recording

**Events:**
- `COMPLETE` - Song finished, move to stopped
- `STOP` - User stopped, move to stopped
- `NEXT_LINE` / `PREVIOUS_LINE` - Navigate lyrics

#### `stopped`
Karaoke session completed, showing results.

**Entry Actions:**
- Calculate final score based on performance

**Sub-states:**
- `reviewing` - Show score and options
- `submitting` - Submit score to blockchain (optional)
- `submitted` - Score submitted successfully

### Context

```typescript
interface KaraokeContext {
  songId: number
  midiData: Uint8Array
  audioUrl?: string
  lyricsUrl?: string
  sessionSigs?: SessionSigs
  currentLineIndex: number
  score: number
  countdown?: number
  lyrics?: LyricLine[]
  audioBuffer?: AudioBuffer
  error?: string
}
```

### Events

```typescript
type KaraokeEvent =
  | { type: 'PLAY' }
  | { type: 'STOP' }
  | { type: 'COMPLETE' }
  | { type: 'RESTART' }
  | { type: 'UPDATE_COUNTDOWN'; value: number }
  | { type: 'NEXT_LINE' }
  | { type: 'PREVIOUS_LINE' }
  | { type: 'SUBMIT_SCORE' }
```

### Actions

#### `startPlayback`
Initialize and start MIDI audio playback.

```typescript
const startPlayback = () => {
  const audioContext = getAudioContext()
  audioContext.play()
}
```

#### `startRecording`
Begin recording user's voice during karaoke.

```typescript
const startRecording = ({ context }: { context: KaraokeContext }) => {
  const recordingManager = getRecordingManager()
  recordingManager.start()
  
  // Schedule segments based on lyrics timing
  const segments = prepareKaraokeSegments(context.lyrics)
  segments.forEach(segment => {
    recordingManager.scheduleSegment(segment)
  })
}
```

## Machine Composition

The song machine invokes the karaoke machine as a child actor:

```typescript
karaoke: {
  invoke: {
    id: 'karaokeMachine',
    src: karaokeMachine,
    input: ({ context }) => ({
      songId: context.songId,
      midiData: context.midiData,
      audioUrl: context.audioUrl,
      lyricsUrl: context.lyricsUrl,
      sessionSigs: context.sessionSigs,
    }),
    onDone: {
      target: 'purchased.ready',
      actions: assign({
        lastKaraokeScore: ({ event }) => event.output?.score,
      }),
    },
    onError: {
      target: 'purchased.ready',
      actions: assign({
        error: ({ event }) => event.error.message,
      }),
    },
  },
}
```

## React Integration

### Custom Hooks

#### `useSongMachine`
Provides song state and actions to React components.

```typescript
export function useSongMachine(songId: number) {
  const { address } = useAccount()
  
  const [state, send] = useMachine(songMachine, {
    input: { songId, userAddress: address },
  })
  
  // Derived state
  const isInKaraokeMode = state.matches('karaoke')
  const isKaraokePlaying = state.matches('karaoke') && 
    state.children.karaokeMachine?.getSnapshot().matches('playing')
  
  // Actions
  const checkAccess = useCallback(() => {
    send({ type: 'CHECK_ACCESS' })
  }, [send])
  
  return {
    state,
    send,
    isInKaraokeMode,
    isKaraokePlaying,
    checkAccess,
    // ... other derived state and actions
  }
}
```

#### `useKaraokeMachine`
Direct access to karaoke machine state (when needed).

```typescript
export function useKaraokeMachine(input: KaraokeContext) {
  const [state, send] = useMachine(karaokeMachine, { input })
  
  const isCountingDown = state.matches('countdown')
  const isPlaying = state.matches('playing')
  const countdownValue = state.context.countdown
  
  return {
    state,
    send,
    isCountingDown,
    isPlaying,
    countdownValue,
  }
}
```

### Component Usage

```typescript
function SongPage({ songId }: { songId: number }) {
  const {
    state,
    send,
    isInKaraokeMode,
    isKaraokePlaying,
    checkAccess,
  } = useSongMachine(songId)
  
  useEffect(() => {
    checkAccess()
  }, [checkAccess])
  
  if (isInKaraokeMode) {
    return <KaraokeView />
  }
  
  return (
    <div>
      {state.matches('purchased.ready') && (
        <button onClick={() => send({ type: 'START_KARAOKE' })}>
          Start Karaoke
        </button>
      )}
    </div>
  )
}
```

## Testing State Machines

XState provides excellent testing utilities:

```typescript
import { createActor } from 'xstate'
import { songMachine } from './song-machine'

describe('Song Machine', () => {
  it('should transition from idle to checkingAccess', () => {
    const actor = createActor(songMachine, {
      input: { songId: 1, userAddress: '0x123...' }
    })
    
    actor.start()
    expect(actor.getSnapshot().value).toBe('idle')
    
    actor.send({ type: 'CHECK_ACCESS' })
    expect(actor.getSnapshot().value).toBe('checkingAccess')
  })
  
  it('should handle purchase flow', async () => {
    const actor = createActor(songMachine)
    actor.start()
    
    // Mock services
    actor.send({ type: 'CHECK_ACCESS' })
    // ... test transitions
  })
})
```

## Debugging

### XState DevTools

The machines are configured for debugging:

```typescript
const songMachine = createMachine({
  // ... machine definition
}, {
  devTools: process.env.NODE_ENV === 'development'
})
```

### State Inspection

```typescript
// Log state changes
const [state, send] = useMachine(songMachine, {
  inspect: (event) => {
    console.log('State Machine Event:', event)
  }
})

// Current state information
console.log('Current state:', state.value)
console.log('Context:', state.context)
console.log('Can transition?', state.can({ type: 'START_KARAOKE' }))
```

## Best Practices

1. **Single Responsibility**: Each machine handles one domain
2. **Immutable Context**: Use assign() for context updates
3. **Side Effects in Services**: Keep actions pure
4. **Error Boundaries**: Handle all possible error states
5. **Testing**: Test all state transitions and edge cases