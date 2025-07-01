import type { KaraokeSegment } from '../utils/lyrics-parser';

export interface RecordingSegment {
  segmentId: string
  lyricLineId: number
  startTime: number
  endTime: number
  audioBlob: Blob
  expectedText: string
  keywords: string[]
}

export interface RecordingManagerOptions {
  onSegmentReady?: (segment: RecordingSegment) => void
  onError?: (error: Error) => void
}

export class RecordingManager {
  private mediaRecorder: MediaRecorder | null = null
  private audioChunks: Blob[] = []
  private currentSegment: KaraokeSegment | null = null
  private segmentStartTime: number = 0
  private options: RecordingManagerOptions
  private isRecording: boolean = false
  private scheduledStops: Map<number, NodeJS.Timeout> = new Map()
  private pendingSegments: Map<number, { segment: KaraokeSegment, startTime: number, chunks: Blob[], complete?: boolean }> = new Map()
  private recordingSegmentId: number | null = null // Track which segment is currently being recorded
  
  constructor(options: RecordingManagerOptions = {}) {
    this.options = options
  }
  
  async initialize(stream: MediaStream) {
    try {
      
      // Try different mime types in order of preference
      const mimeTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/ogg'
      ]
      
      let selectedMimeType = 'audio/webm'
      for (const mimeType of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mimeType)) {
          selectedMimeType = mimeType
          break
        }
      }
      
      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType: selectedMimeType
      })
      
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0 && this.recordingSegmentId !== null) {
          console.log(`📼 Received audio chunk, size: ${event.data.size}, for recording segment: ${this.recordingSegmentId}`)
          // Use the segment ID that was active when recording started, not the current one
          const segmentId = this.recordingSegmentId
          const pending = this.pendingSegments.get(segmentId)
          if (pending) {
            pending.chunks.push(event.data)
            console.log(`📼 Added chunk to pending segment ${segmentId}, total chunks: ${pending.chunks.length}`)
          } else {
            // This shouldn't happen if our logic is correct, but just in case
            console.warn(`📼 No pending segment found for ${segmentId}, adding to general chunks`)
            this.audioChunks.push(event.data)
          }
        }
      }
      
      this.mediaRecorder.onstop = () => {
        // Process all pending segments when recording stops
        this.processPendingSegments()
      }
      
      this.isRecording = false
    } catch (error) {
      this.options.onError?.(error as Error)
    }
  }
  
  startSegmentRecording(segment: KaraokeSegment, currentTimeMs: number) {
    if (!this.mediaRecorder) {
      console.warn('RecordingManager not initialized yet, skipping segment:', segment.expectedText)
      return
    }
    
    // Clear any existing scheduled stop for this segment only
    const existingStop = this.scheduledStops.get(segment.lyricLine.id)
    if (existingStop) {
      clearTimeout(existingStop)
      this.scheduledStops.delete(segment.lyricLine.id)
    }
    
    // Calculate when to start and stop recording
    const startDelay = Math.max(0, segment.recordStartTime - currentTimeMs)
    const stopDelay = segment.recordEndTime - currentTimeMs
    const duration = segment.recordEndTime - segment.recordStartTime
    
    console.log(`📼 Recording schedule for line ${segment.lyricLine.id}:`, {
      expectedText: segment.expectedText,
      startDelay: `${startDelay}ms`,
      stopDelay: `${stopDelay}ms`,
      duration: `${duration}ms`
    })
    
    // Schedule the start
    if (startDelay === 0) {
      this.startRecording(segment)
    } else {
      setTimeout(() => {
        this.startRecording(segment)
      }, startDelay)
    }
    
    // Schedule the stop
    const stopTimeout = setTimeout(() => {
      console.log(`⏰ Stop timeout triggered for line ${segment.lyricLine.id}`)
      this.stopRecording()
    }, stopDelay)
    
    console.log(`⏰ Scheduled stop for line ${segment.lyricLine.id} in ${stopDelay}ms`)
    this.scheduledStops.set(segment.lyricLine.id, stopTimeout)
  }
  
  private startRecording(segment: KaraokeSegment) {
    console.log(`🎤 Starting recording for line ${segment.lyricLine.id}: "${segment.expectedText}"`)
    
    if (this.isRecording && this.currentSegment && this.recordingSegmentId !== null) {
      // Save the current segment data before switching
      const segmentId = this.recordingSegmentId
      this.pendingSegments.set(segmentId, {
        segment: this.currentSegment,
        startTime: this.segmentStartTime,
        chunks: [...this.audioChunks]
      })
    }
    
    this.currentSegment = segment
    this.recordingSegmentId = segment.lyricLine.id // Set the recording segment ID
    this.segmentStartTime = Date.now()
    this.audioChunks = []
    
    // Make sure we have a pending segment entry for the new recording
    this.pendingSegments.set(segment.lyricLine.id, {
      segment: segment,
      startTime: this.segmentStartTime,
      chunks: []
    })
    
    if (this.mediaRecorder?.state === 'inactive') {
      // Start with timeslice to get regular chunks
      this.mediaRecorder.start(100) // Get chunks every 100ms
      this.isRecording = true
      console.log(`🎤 MediaRecorder started for line ${segment.lyricLine.id} with 100ms timeslice`)
    } else if (this.isRecording) {
      // If already recording, request data to flush current buffer
      this.mediaRecorder?.requestData()
      console.log(`🎤 Switching to line ${segment.lyricLine.id} (recorder already running)`)
    }
  }
  
  private stopRecording() {
    // This method is called when a segment ends, but we don't actually stop the MediaRecorder
    // We just process the completed segment
    console.log(`🛑 Segment recording ended for segmentId: ${this.recordingSegmentId}`)
    
    if (this.recordingSegmentId !== null) {
      // Request any buffered data
      this.mediaRecorder?.requestData()
      
      // Mark segment as complete after a small delay to ensure data arrives
      const segmentId = this.recordingSegmentId
      setTimeout(() => {
        const pending = this.pendingSegments.get(segmentId)
        if (pending) {
          pending.complete = true
          this.processCompletedSegments()
        }
      }, 100)
    }
  }
  
  private processCompletedSegments() {
    console.log(`📊 Processing completed segments`)
    
    // Process only segments marked as complete
    const completedIds: number[] = []
    
    this.pendingSegments.forEach((data, segmentId) => {
      if (data.complete && data.chunks.length > 0) {
        const audioBlob = new Blob(data.chunks, { type: 'audio/webm' })
        console.log(`🎤 Creating audio blob for line ${segmentId}, size: ${audioBlob.size} bytes`)
        
        const recordingSegment: RecordingSegment = {
          segmentId: `seg-${segmentId}-${Date.now()}`,
          lyricLineId: segmentId,
          startTime: data.startTime,
          endTime: Date.now(),
          audioBlob,
          expectedText: data.segment.expectedText,
          keywords: data.segment.keywords
        }
        
        this.options.onSegmentReady?.(recordingSegment)
        completedIds.push(segmentId)
      }
    })
    
    // Remove completed segments
    completedIds.forEach(id => this.pendingSegments.delete(id))
  }
  
  private processPendingSegments() {
    console.log(`📊 Processing ${this.pendingSegments.size} pending segments`)
    
    // Process all pending segments
    this.pendingSegments.forEach((data, segmentId) => {
      if (data.chunks.length > 0) {
        const audioBlob = new Blob(data.chunks, { type: 'audio/webm' })
        console.log(`🎤 Creating audio blob for line ${segmentId}, size: ${audioBlob.size} bytes`)
        
        const recordingSegment: RecordingSegment = {
          segmentId: `seg-${segmentId}-${Date.now()}`,
          lyricLineId: segmentId,
          startTime: data.startTime,
          endTime: Date.now(),
          audioBlob,
          expectedText: data.segment.expectedText,
          keywords: data.segment.keywords
        }
        
        this.options.onSegmentReady?.(recordingSegment)
      }
    })
    
    // Clear pending segments
    this.pendingSegments.clear()
    
    // Reset current state
    this.currentSegment = null
    this.audioChunks = []
    this.recordingSegmentId = null
  }
  
  private clearScheduledStops() {
    this.scheduledStops.forEach(timeout => clearTimeout(timeout))
    this.scheduledStops.clear()
  }
  
  dispose() {
    this.clearScheduledStops()
    
    // Don't need to save manually - chunks are already in pendingSegments
    
    if (this.mediaRecorder) {
      if (this.mediaRecorder.state === 'recording') {
        // Request final data and then stop
        this.mediaRecorder.requestData()
        this.mediaRecorder.stop()
      }
      this.mediaRecorder.stream.getTracks().forEach(track => track.stop())
      this.mediaRecorder = null
    }
    
    // Process any remaining segments
    this.processPendingSegments()
    
    this.audioChunks = []
    this.currentSegment = null
    this.isRecording = false
    this.recordingSegmentId = null
    this.pendingSegments.clear()
  }
  
  // Schedule multiple segments at once (useful for pre-scheduling)
  scheduleSegments(segments: KaraokeSegment[], currentTimeMs: number) {
    if (!this.mediaRecorder) {
      console.warn('RecordingManager not initialized yet, cannot schedule segments')
      return
    }
    
    segments.forEach(segment => {
      const delay = segment.recordStartTime - currentTimeMs
      if (delay > 0 && delay < 10000) { // Only schedule segments in the next 10 seconds
        setTimeout(() => {
          this.startSegmentRecording(segment, segment.recordStartTime)
        }, delay)
      }
    })
  }
}