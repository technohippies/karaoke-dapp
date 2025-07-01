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
  private pendingSegments: Map<number, { segment: KaraokeSegment, startTime: number, chunks: Blob[] }> = new Map()
  
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
        if (event.data.size > 0 && this.currentSegment) {
          console.log(`📼 Received audio chunk, size: ${event.data.size}, for line: ${this.currentSegment.lyricLine.id}`)
          // Store chunks with their segment info
          const segmentId = this.currentSegment.lyricLine.id
          const pending = this.pendingSegments.get(segmentId)
          if (pending) {
            pending.chunks.push(event.data)
            console.log(`📼 Added chunk to pending segment ${segmentId}, total chunks: ${pending.chunks.length}`)
          } else {
            this.audioChunks.push(event.data)
            console.log(`📼 Added chunk to audio chunks, total: ${this.audioChunks.length}`)
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
    
    if (this.isRecording && this.currentSegment) {
      // Save the current segment data before switching
      const segmentId = this.currentSegment.lyricLine.id
      this.pendingSegments.set(segmentId, {
        segment: this.currentSegment,
        startTime: this.segmentStartTime,
        chunks: [...this.audioChunks]
      })
    }
    
    this.currentSegment = segment
    this.segmentStartTime = Date.now()
    this.audioChunks = []
    
    if (this.mediaRecorder?.state === 'inactive') {
      this.mediaRecorder.start()
      this.isRecording = true
      console.log(`🎤 MediaRecorder started for line ${segment.lyricLine.id}`)
    } else if (this.isRecording) {
      // If already recording, we're just switching segments
      // The MediaRecorder keeps running
      console.log(`🎤 Switching to line ${segment.lyricLine.id} (recorder already running)`)
    }
  }
  
  private stopRecording() {
    console.log(`🛑 Stop recording called, state: ${this.mediaRecorder?.state}`)
    if (this.mediaRecorder?.state === 'recording') {
      // Save current segment before stopping
      if (this.currentSegment) {
        const segmentId = this.currentSegment.lyricLine.id
        console.log(`🛑 Saving current segment ${segmentId} with ${this.audioChunks.length} chunks`)
        this.pendingSegments.set(segmentId, {
          segment: this.currentSegment,
          startTime: this.segmentStartTime,
          chunks: [...this.audioChunks]
        })
      }
      
      this.mediaRecorder.stop()
      this.isRecording = false
    }
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
  }
  
  private clearScheduledStops() {
    this.scheduledStops.forEach(timeout => clearTimeout(timeout))
    this.scheduledStops.clear()
  }
  
  dispose() {
    this.clearScheduledStops()
    
    // Save any pending recording before disposing
    if (this.currentSegment && this.audioChunks.length > 0) {
      const segmentId = this.currentSegment.lyricLine.id
      this.pendingSegments.set(segmentId, {
        segment: this.currentSegment,
        startTime: this.segmentStartTime,
        chunks: [...this.audioChunks]
      })
    }
    
    if (this.mediaRecorder) {
      if (this.mediaRecorder.state === 'recording') {
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