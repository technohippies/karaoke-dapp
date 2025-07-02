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
  private options: RecordingManagerOptions
  private isRecording: boolean = false
  private scheduledRecordings: Map<number, NodeJS.Timeout> = new Map()
  private scheduledSegments: Set<number> = new Set()
  
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
        if (event.data.size > 0) {
          this.audioChunks.push(event.data)
        }
      }
      
      this.mediaRecorder.onstop = () => {
        // Add a small delay to ensure all chunks are received
        setTimeout(() => {
          if (this.currentSegment && this.audioChunks.length > 0) {
            this.processCurrentSegment()
          }
        }, 100)
      }
      
      this.isRecording = false
    } catch (error) {
      this.options.onError?.(error as Error)
    }
  }
  
  scheduleSegmentRecording(segment: KaraokeSegment, currentTimeMs: number) {
    if (!this.mediaRecorder) {
      console.warn('RecordingManager not initialized')
      return
    }
    
    // Skip if already scheduled
    if (this.scheduledSegments.has(segment.lyricLine.id)) {
      return
    }
    
    // Calculate when to start recording
    const startDelay = Math.max(0, segment.recordStartTime - currentTimeMs)
    const duration = segment.recordEndTime - segment.recordStartTime
    
    console.log(`📝 Scheduling segment ${segment.lyricLine.id}: "${segment.expectedText}" in ${startDelay}ms for ${duration}ms`)
    
    // Mark as scheduled
    this.scheduledSegments.add(segment.lyricLine.id)
    
    // Schedule the recording
    const timeout = setTimeout(() => {
      this.startRecordingSegment(segment, duration)
      this.scheduledRecordings.delete(segment.lyricLine.id)
    }, startDelay)
    
    this.scheduledRecordings.set(segment.lyricLine.id, timeout)
  }
  
  private startRecordingSegment(segment: KaraokeSegment, duration: number) {
    // Don't start if we're already recording or MediaRecorder is not ready
    if (this.isRecording || !this.mediaRecorder || this.mediaRecorder.state !== 'inactive') {
      console.warn(`⚠️ Skipping line ${segment.lyricLine.id} - recorder not ready (isRecording: ${this.isRecording}, state: ${this.mediaRecorder?.state})`)
      
      // Try again in a bit if the segment hasn't started yet
      const now = Date.now()
      if (segment.recordStartTime > now) {
        setTimeout(() => this.startRecordingSegment(segment, duration), 200)
      }
      return
    }
    
    // Clear chunks and set current segment
    this.audioChunks = []
    this.currentSegment = segment
    
    console.log(`🎤 Starting recording for line ${segment.lyricLine.id}: "${segment.expectedText}"`)
    
    // Start fresh recording
    try {
      this.mediaRecorder.start()
      this.isRecording = true
      
      // Schedule stop
      setTimeout(() => {
        if (this.isRecording && this.currentSegment?.lyricLine.id === segment.lyricLine.id) {
          console.log(`⏹️ Stopping recording for line ${segment.lyricLine.id}`)
          this.mediaRecorder?.stop()
          this.isRecording = false
        }
      }, duration)
    } catch (error) {
      console.error(`❌ Failed to start recording for line ${segment.lyricLine.id}:`, error)
      this.isRecording = false
    }
  }
  
  private processCurrentSegment() {
    if (!this.currentSegment || this.audioChunks.length === 0) {
      return
    }
    
    // Create audio blob
    const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' })
    
    console.log(`📊 Processing segment ${this.currentSegment.lyricLine.id}: "${this.currentSegment.expectedText}" - ${audioBlob.size} bytes`)
    
    const recordingSegment: RecordingSegment = {
      segmentId: `seg-${this.currentSegment.lyricLine.id}-${Date.now()}`,
      lyricLineId: this.currentSegment.lyricLine.id,
      startTime: this.currentSegment.recordStartTime,
      endTime: this.currentSegment.recordEndTime,
      audioBlob,
      expectedText: this.currentSegment.expectedText,
      keywords: this.currentSegment.keywords
    }
    
    this.options.onSegmentReady?.(recordingSegment)
    
    // Clear for next recording
    this.audioChunks = []
    this.currentSegment = null
  }
  
  dispose() {
    // Clear all scheduled recordings
    this.scheduledRecordings.forEach(timeout => clearTimeout(timeout))
    this.scheduledRecordings.clear()
    this.scheduledSegments.clear()
    
    // Stop any ongoing recording
    if (this.mediaRecorder) {
      if (this.mediaRecorder.state === 'recording') {
        this.mediaRecorder.stop()
      }
      this.mediaRecorder.stream.getTracks().forEach(track => track.stop())
      this.mediaRecorder = null
    }
    
    this.audioChunks = []
    this.currentSegment = null
    this.isRecording = false
  }
}