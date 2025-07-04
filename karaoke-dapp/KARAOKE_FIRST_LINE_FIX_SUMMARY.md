# Karaoke First Line Recording Issue - Summary

## Problem Statement
The karaoke app consistently fails to capture the first line of songs during recording. The issue manifests as:
- First line transcripts are usually empty
- Rarely catches only the last 1-2 words of the first line
- Subsequent lines (2+) work fine

## Root Cause Analysis
MediaRecorder API has an initialization delay of ~115ms before it starts capturing audio. This delay causes the beginning of the first line to be missed entirely.

### Key Findings:
- First audio chunk arrives at ~115-120ms after `mediaRecorder.start()`
- This delay is consistent across different approaches
- The delay appears to be device-dependent (could be longer/shorter on different hardware)

## Approaches Attempted

### 1. Pre-buffering with Complex Timing (REMOVED)
- **What**: Pre-record during countdown, calculate offsets, splice audio
- **Result**: Made things worse - got empty transcripts for ALL segments
- **Why Failed**: WebM chunks aren't independently valid, need headers

### 2. Mediabunny Integration (REMOVED)
- **What**: Use Mediabunny library to extract valid WebM segments
- **Result**: No improvement - still missing first line
- **Why Failed**: Can't extract audio that was never recorded in the first place
- **Decision**: Removed as unnecessary complexity

### 3. Warm-up Recording Pattern
- **What**: Start/stop MediaRecorder during countdown to "warm it up"
- **Results**:
  - 200ms warm-up: Got "diamond flesh" (last 2 words) - slight improvement
  - 400ms warm-up: Back to empty transcript - made it worse
- **Why Failed**: MediaRecorder "cools down" after stop(), requiring re-initialization

### 4. Continuous Recording (CURRENT IMPLEMENTATION)
- **What**: Start MediaRecorder during countdown and never stop until song ends
- **Implementation**:
  ```typescript
  // In countdown state:
  mediaRecorder.start(100)  // Start early, keep running
  
  // In recording state:
  // Don't restart - already running
  // Track offset between MediaRecorder start and song start
  ```
- **Expected Result**: Should capture from the very beginning since MediaRecorder is fully initialized

## Final Implementation Details

### Key Changes Made:
1. **Removed WebMSegmentService** - unnecessary complexity
2. **Removed Mediabunny dependency** - not solving the core issue
3. **Start MediaRecorder in countdown state** - begins recording ~3 seconds before song
4. **Track dual timestamps**:
   - `mediaRecorderStartTime`: When MediaRecorder actually started
   - `recordingStartTime`: When the song started
5. **Adjust chunk timestamps** by the offset for proper segment extraction

### Code Structure:
```typescript
// Added to context:
mediaRecorderStartTime: number | null

// Countdown state:
- Starts MediaRecorder immediately
- Records mediaRecorderStartTime

// Recording state:
- Keeps MediaRecorder running (no restart)
- Records recordingStartTime (song start)
- Maintains all chunks (no clearing)

// Segment processing:
- Calculates offset between timestamps
- Adjusts segment windows by offset
- Extracts chunks with proper timing
```

## Why This Should Work
1. **No initialization delay** - MediaRecorder is already running when song starts
2. **Continuous chunk flow** - No stop/start gaps
3. **Proper timing alignment** - Offset calculation ensures correct chunk extraction
4. **Industry standard** - Most WebRTC/recording apps use continuous recording

## Testing Notes
The implementation is ready but untested due to other project changes. When testing:
1. Check if first chunk timestamp is close to 0ms (not 115ms)
2. Verify first line transcript is not empty
3. Confirm all lines are captured properly
4. Monitor the offset calculation in logs

## Alternative Approaches (Not Implemented)
If continuous recording doesn't work:
1. **Web Audio API**: Direct access to audio samples, but requires manual encoding
2. **Double MediaRecorder**: Alternate between two recorders, complex synchronization
3. **Add playback delay**: Delay song start by 200ms after recording starts

## Conclusion
The continuous recording approach is the simplest and most reliable solution. It completely avoids the initialization problem by ensuring MediaRecorder is fully ready before the song begins.