# Karaoke Recording Fix - Merged Approach

## Issue Identified
The "simplified" approach that started MediaRecorder during countdown was causing WebM format issues because:
1. Chunks from countdown period were mixed with recording chunks
2. audioChunks array wasn't cleared when entering recording state
3. This caused invalid WebM segments when concatenating chunks

## Solution Applied
Reverted to the proven approach from commit d6a8933 with the following key changes:

### 1. MediaRecorder Start Timing
- **Removed**: Starting MediaRecorder during countdown
- **Restored**: Starting MediaRecorder when entering recording state
- **Result**: Clean chunk boundaries aligned with song start

### 2. Audio Chunks Management
- **Added**: Clear audioChunks array when entering recording state
- **Result**: No pre-song chunks contaminating the segments

### 3. First Line Handling
- **Updated**: First segment uses only its own chunks (no header prepending)
- **Result**: Clean WebM segments for all lines including the first

## Code Changes

### Countdown State
```typescript
// Before (problematic)
countdown: {
  entry: [
    // Started MediaRecorder during countdown
    context.mediaRecorder.start(100)
  ]
}

// After (fixed)
countdown: {
  entry: [
    // Just set countdown, no MediaRecorder start
    assign({ countdown: 3 })
  ]
}
```

### Recording State
```typescript
// Before (problematic)
recording: {
  entry: [
    // Assumed MediaRecorder already running
    // Did NOT clear audioChunks
    assign({
      recordingStartTime: () => Date.now(),
      processedSegments: () => new Set()
    })
  ]
}

// After (fixed)
recording: {
  entry: [
    // Start MediaRecorder here
    context.mediaRecorder.start(100),
    // Clear audioChunks for clean start
    assign({
      audioChunks: [],
      recordingStartTime: () => Date.now(),
      processedSegments: () => new Set()
    })
  ]
}
```

### Segment Processing
```typescript
// Simplified chunk selection for first segment
const allChunks = segment.lyricLine.id === 1 
  ? segmentChunks  // First segment has headers from fresh start
  : [...headerChunks, ...segmentChunks]  // Later segments need headers
```

## Expected Results
1. MediaRecorder starts cleanly when song begins
2. All chunks are properly timestamped from song start
3. First line captures audio correctly
4. WebM segments are valid and can be transcribed
5. No empty transcripts

## Testing
After these changes, test the karaoke flow and verify:
- First chunk timestamp should be close to 0ms
- All segments should produce valid audio blobs
- Transcripts should capture sung lyrics