# WebM Streaming Issue Analysis

## The Problem
MediaRecorder produces a continuous WebM stream where:
- Each chunk references previous chunks
- Chunks contain delta frames, not keyframes
- Simply concatenating chunks doesn't create valid WebM files

## Why Lines 2+ "Work" 
When we prepend header chunks to later segments, we're creating a file that:
- Has valid WebM headers
- But missing all the intermediate chunks
- Deepgram gets partial/corrupted audio

## Evidence
1. First segment (0-5000ms): 41 chunks, 78KB - Empty transcript
2. Can't be played by VLC/media players = Invalid WebM
3. Lines 2+ get partial transcripts = Corrupted but partially decodable

## Solutions

### Option 1: Stop/Start MediaRecorder per segment
```javascript
// Stop recorder
mediaRecorder.stop()
// Wait for last chunk
await new Promise(resolve => {
  mediaRecorder.onstop = resolve
})
// Start new recording for next segment
mediaRecorder.start(100)
```
**Pros**: Each segment is valid WebM
**Cons**: Gaps between segments, re-initialization delay

### Option 2: Use Web Audio API for Raw Audio
```javascript
const audioContext = new AudioContext()
const source = audioContext.createMediaStreamSource(stream)
const processor = audioContext.createScriptProcessor(4096, 1, 1)
// Collect raw PCM samples
```
**Pros**: Can slice audio at any point
**Cons**: More complex, need to encode audio

### Option 3: Server-side Processing
- Send full recording to server
- Use ffmpeg to extract segments
**Pros**: Reliable, professional tools
**Cons**: Not real-time

### Option 4: Use MediaRecorder with 'webm-chunk' format
Some browsers support extractable chunks:
```javascript
new MediaRecorder(stream, {
  mimeType: 'audio/webm;codecs=opus',
  videoBitsPerSecond: 0 // Audio only
})
```

## Recommendation
Try Option 1 first - it's the simplest and maintains real-time feedback.