import { fromCallback } from 'xstate'

/**
 * Stop/Start Recording Service
 * 
 * Instead of continuous recording, we stop and restart MediaRecorder
 * for each segment to get valid, self-contained WebM files.
 */

interface RecordingServiceInput {
  mediaRecorder: MediaRecorder
  segmentId: number
  duration: number // How long to record in ms
}

export const segmentRecordingService = fromCallback<
  { type: 'RECORDING_COMPLETE'; audioBlob: Blob; segmentId: number },
  RecordingServiceInput
>(({ input, sendBack }) => {
  const { mediaRecorder, segmentId, duration } = input
  const chunks: Blob[] = []
  
  console.log(`🎬 Starting recording for segment ${segmentId}, duration: ${duration}ms`)
  
  // Collect chunks for this segment
  const handleData = (event: BlobEvent) => {
    if (event.data.size > 0) {
      chunks.push(event.data)
      console.log(`📦 Chunk received for segment ${segmentId}: ${event.data.size} bytes`)
    }
  }
  
  // When recording stops, create the blob
  const handleStop = () => {
    const audioBlob = new Blob(chunks, { type: 'audio/webm' })
    console.log(`✅ Segment ${segmentId} complete: ${audioBlob.size} bytes from ${chunks.length} chunks`)
    
    sendBack({
      type: 'RECORDING_COMPLETE',
      audioBlob,
      segmentId
    })
  }
  
  mediaRecorder.addEventListener('dataavailable', handleData)
  mediaRecorder.addEventListener('stop', handleStop)
  
  // Start recording
  try {
    mediaRecorder.start(100) // 100ms chunks
    
    // Stop after duration
    setTimeout(() => {
      if (mediaRecorder.state === 'recording') {
        console.log(`⏹️ Stopping recording for segment ${segmentId}`)
        mediaRecorder.stop()
      }
    }, duration)
  } catch (error) {
    console.error(`❌ Failed to start recording for segment ${segmentId}:`, error)
  }
  
  // Cleanup
  return () => {
    mediaRecorder.removeEventListener('dataavailable', handleData)
    mediaRecorder.removeEventListener('stop', handleStop)
    if (mediaRecorder.state === 'recording') {
      mediaRecorder.stop()
    }
  }
})