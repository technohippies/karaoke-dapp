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
        this.handleSegmentComplete()
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
    
    // Clear any existing scheduled stops
    this.clearScheduledStops()
    
    // Calculate when to start and stop recording
    const startDelay = Math.max(0, segment.recordStartTime - currentTimeMs)
    const stopDelay = segment.recordEndTime - currentTimeMs
    
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
      this.stopRecording()
    }, stopDelay)
    
    this.scheduledStops.set(segment.lyricLine.id, stopTimeout)
  }
  
  private startRecording(segment: KaraokeSegment) {
    if (this.isRecording) {
      // Stop current recording first
      this.stopRecording()
    }
    
    this.currentSegment = segment
    this.segmentStartTime = Date.now()
    this.audioChunks = []
    
    if (this.mediaRecorder?.state === 'inactive') {
      this.mediaRecorder.start()
      this.isRecording = true
      console.log(`🎤 Started recording for line: "${segment.expectedText}"`)
    }
  }
  
  private stopRecording() {
    if (this.mediaRecorder?.state === 'recording') {
      this.mediaRecorder.stop()
      this.isRecording = false
      console.log('⏹️ Stopped recording')
    }
  }
  
  private handleSegmentComplete() {
    if (this.audioChunks.length === 0 || !this.currentSegment) {
      return
    }
    
    const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' })
    console.log(`📦 Created audio blob: ${audioBlob.size} bytes for line "${this.currentSegment.expectedText}"`)
    
    const recordingSegment: RecordingSegment = {
      segmentId: `seg-${this.currentSegment.lyricLine.id}-${Date.now()}`,
      lyricLineId: this.currentSegment.lyricLine.id,
      startTime: this.segmentStartTime,
      endTime: Date.now(),
      audioBlob,
      expectedText: this.currentSegment.expectedText,
      keywords: this.currentSegment.keywords
    }
    
    this.options.onSegmentReady?.(recordingSegment)
    
    // Reset for next segment
    this.currentSegment = null
    this.audioChunks = []
  }
  
  private clearScheduledStops() {
    this.scheduledStops.forEach(timeout => clearTimeout(timeout))
    this.scheduledStops.clear()
  }
  
  dispose() {
    this.clearScheduledStops()
    
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