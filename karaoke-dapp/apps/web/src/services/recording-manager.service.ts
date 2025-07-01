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

interface AudioChunkWithTime {
  chunk: Blob
  timestamp: number
}

interface SegmentWindow {
  segment: KaraokeSegment
  cutStartTime: number
  cutEndTime: number
  processed: boolean
}

export class RecordingManager {
  private mediaRecorder: MediaRecorder | null = null
  private audioChunks: AudioChunkWithTime[] = []
  private recordingStartTime: number = 0
  private options: RecordingManagerOptions
  private isRecording: boolean = false
  private segmentWindows: SegmentWindow[] = []
  private processingTimer: NodeJS.Timeout | null = null
  
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
      
      console.log(`🎙️ MediaRecorder initialized with mimeType: ${selectedMimeType}`)
      
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0 && this.isRecording) {
          const timestamp = Date.now() - this.recordingStartTime
          this.audioChunks.push({
            chunk: event.data,
            timestamp
          })
          console.log(`📼 Received audio chunk at ${timestamp}ms, size: ${event.data.size}, total chunks: ${this.audioChunks.length}`)
        }
      }
      
      this.mediaRecorder.onstop = () => {
        console.log('🛑 MediaRecorder stopped')
        // Process any remaining segments
        this.processAllSegments()
      }
      
      this.isRecording = false
    } catch (error) {
      this.options.onError?.(error as Error)
    }
  }
  
  startContinuousRecording() {
    if (!this.mediaRecorder || this.isRecording) {
      return
    }
    
    console.log('🎙️ Starting continuous recording')
    this.recordingStartTime = Date.now()
    this.audioChunks = []
    this.mediaRecorder.start(100) // Get chunks every 100ms
    this.isRecording = true
    
    // Start processing timer
    this.startProcessingTimer()
  }
  
  scheduleSegment(segment: KaraokeSegment, allSegments: KaraokeSegment[]) {
    // Create a window for this segment using its pre-calculated recording times
    const window: SegmentWindow = {
      segment,
      cutStartTime: segment.recordStartTime, // Already includes 500ms buffer before
      cutEndTime: segment.recordEndTime,     // Already includes 500ms buffer after
      processed: false
    }
    
    this.segmentWindows.push(window)
    
    console.log(`📝 Scheduled segment ${segment.lyricLine.id}:`, {
      text: segment.expectedText,
      cutStart: `${(segment.recordStartTime / 1000).toFixed(2)}s`,
      cutEnd: `${(segment.recordEndTime / 1000).toFixed(2)}s`,
      duration: `${((segment.recordEndTime - segment.recordStartTime) / 1000).toFixed(2)}s`
    })
  }
  
  private startProcessingTimer() {
    if (this.processingTimer) {
      clearInterval(this.processingTimer)
    }
    
    // Check every 500ms for segments ready to process
    this.processingTimer = setInterval(() => {
      this.processReadySegments()
    }, 500)
  }
  
  private processReadySegments() {
    const currentTime = Date.now() - this.recordingStartTime
    
    this.segmentWindows.forEach(window => {
      // Check if this window's end time has passed and it hasn't been processed
      if (!window.processed && currentTime >= window.cutEndTime) {
        this.processSegmentWindow(window)
        window.processed = true
      }
    })
  }
  
  private processSegmentWindow(window: SegmentWindow) {
    // Find all chunks within this window's time range
    const segmentChunks = this.audioChunks.filter(chunkData => 
      chunkData.timestamp >= window.cutStartTime && 
      chunkData.timestamp <= window.cutEndTime
    )
    
    if (segmentChunks.length === 0) {
      console.warn(`⚠️ No audio chunks found for segment ${window.segment.lyricLine.id}`)
      return
    }
    
    // Create audio blob from the chunks
    const audioBlob = new Blob(
      segmentChunks.map(c => c.chunk), 
      { type: 'audio/webm' }
    )
    
    // Check if we have non-silent audio
    const totalSize = segmentChunks.reduce((sum, c) => sum + c.chunk.size, 0)
    
    console.log(`🎤 Processing segment ${window.segment.lyricLine.id}:`, {
      text: window.segment.expectedText,
      chunks: segmentChunks.length,
      size: `${audioBlob.size} bytes`,
      totalChunkSize: `${totalSize} bytes`,
      timeRange: `${window.cutStartTime}ms - ${window.cutEndTime}ms`,
      mimeType: audioBlob.type
    })
    
    const recordingSegment: RecordingSegment = {
      segmentId: `seg-${window.segment.lyricLine.id}-${Date.now()}`,
      lyricLineId: window.segment.lyricLine.id,
      startTime: window.cutStartTime,
      endTime: window.cutEndTime,
      audioBlob,
      expectedText: window.segment.expectedText,
      keywords: window.segment.keywords
    }
    
    this.options.onSegmentReady?.(recordingSegment)
  }
  
  private processAllSegments() {
    // Process any remaining unprocessed segments
    this.segmentWindows.forEach(window => {
      if (!window.processed) {
        this.processSegmentWindow(window)
        window.processed = true
      }
    })
  }
  
  dispose() {
    if (this.processingTimer) {
      clearInterval(this.processingTimer)
      this.processingTimer = null
    }
    
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
    this.processAllSegments()
    
    this.audioChunks = []
    this.isRecording = false
    this.segmentWindows = []
  }
}