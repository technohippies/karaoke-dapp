import { fromCallback } from 'xstate'
import * as lamejs from '@breezystack/lamejs'

/**
 * PCM Recording Service
 * 
 * Uses Web Audio API to capture raw PCM audio and encodes segments
 * to MP3 format for clean, timestamp-correct audio files.
 */

interface RecordingServiceInput {
  mediaStream: MediaStream
  segmentCount: number
  recordingStartTime: number
  segments?: AudioSegment[]
}

interface AudioSegment {
  lyricLine: { id: number }
  recordStartTime: number  // Changed from startTime
  recordEndTime: number    // Changed from endTime
  expectedText: string
}

export const pcmRecordingService = fromCallback<any, RecordingServiceInput>(({ sendBack, input }) => {
  console.log('🎤 PCM Recording service starting...')
  
  const { mediaStream, recordingStartTime, segments = [] } = input
  console.log('📋 Segments received:', segments.length)
  if (segments.length > 0) {
    console.log('📋 First segment:', segments[0])
  }
  
  // Audio settings
  const SAMPLE_RATE = 48000
  const CHANNELS = 1
  const BIT_RATE = 128
  
  // Create audio context
  const audioContext = new AudioContext({ sampleRate: SAMPLE_RATE })
  const source = audioContext.createMediaStreamSource(mediaStream)
  
  // PCM buffer to store all samples
  let pcmBuffer: Float32Array[] = []
  let totalSamples = 0
  let isRecording = true
  
  // Create script processor (will be replaced with AudioWorklet in production)
  const bufferSize = 4096
  const scriptProcessor = audioContext.createScriptProcessor(bufferSize, CHANNELS, CHANNELS)
  
  // Capture PCM data
  scriptProcessor.onaudioprocess = (event) => {
    if (!isRecording) return
    
    const inputBuffer = event.inputBuffer
    const samples = inputBuffer.getChannelData(0)
    
    // Store copy of samples
    const samplesCopy = new Float32Array(samples)
    pcmBuffer.push(samplesCopy)
    totalSamples += samples.length
    
    // Log progress every second
    const secondsRecorded = totalSamples / SAMPLE_RATE
    if (Math.floor(secondsRecorded) !== Math.floor((totalSamples - samples.length) / SAMPLE_RATE)) {
      console.log(`🎙️ PCM captured: ${secondsRecorded.toFixed(1)}s (${totalSamples} samples)`)
    }
  }
  
  // Connect nodes
  source.connect(scriptProcessor)
  scriptProcessor.connect(audioContext.destination)
  
  console.log('✅ PCM recording started')
  
  // Segment processing
  let processedSegments = new Set<number>()
  let currentSegments = segments // Use the segments from input
  
  const checkAndProcessSegments = () => {
    if (!isRecording) return
    
    // Process segments directly instead of requesting
    processSegments(currentSegments)
  }
  
  // Process segments when received
  const processSegments = (segments: AudioSegment[]) => {
    const currentTime = Date.now() - recordingStartTime
    console.log(`⏱️ Checking segments at ${(currentTime/1000).toFixed(1)}s`)
    
    segments.forEach(segment => {
      if (processedSegments.has(segment.lyricLine.id)) return
      
      // Check if segment has ended (with 500ms buffer for processing)
      const timeUntilSegmentEnd = segment.recordEndTime + 500 - currentTime
      
      // Add debug logging for first segment
      if (segment.lyricLine.id === 1 && timeUntilSegmentEnd > 0) {
        console.log(`⏳ Segment 1 ends in ${(timeUntilSegmentEnd/1000).toFixed(1)}s`)
      }
      
      if (currentTime >= segment.recordEndTime + 500) {
        console.log(`📦 Processing segment ${segment.lyricLine.id}: "${segment.expectedText}"`)
        
        // Calculate sample positions
        const startSample = Math.floor((segment.recordStartTime / 1000) * SAMPLE_RATE)
        const endSample = Math.floor((segment.recordEndTime / 1000) * SAMPLE_RATE)
        
        console.log(`🔍 Segment ${segment.lyricLine.id} samples: ${startSample} - ${endSample} (${(endSample - startSample) / SAMPLE_RATE}s)`)
        
        // Extract PCM data for this segment
        const segmentPCM = extractPCMRange(startSample, endSample)
        
        if (segmentPCM && segmentPCM.length > 0) {
          try {
            // Encode to MP3
            const mp3Blob = encodePCMToMP3(segmentPCM, SAMPLE_RATE, CHANNELS, BIT_RATE)
            
            console.log(`🎵 Encoded segment ${segment.lyricLine.id}: ${mp3Blob.size} bytes`)
            
            // Send for grading
            sendBack({
              type: 'SEGMENT_READY',
              segment: {
                ...segment,
                audioBlob: mp3Blob
              }
            })
            
            processedSegments.add(segment.lyricLine.id)
          
            // Auto-download for debugging (first 3 segments)
            if (segment.lyricLine.id <= 3 && import.meta.env.DEV) {
              downloadSegment(mp3Blob, segment.lyricLine.id, segment.expectedText)
            }
            
            // Stop after 3 segments in dev mode
            if (segment.lyricLine.id === 3 && import.meta.env.DEV) {
              console.log('🎯 Development mode: Stopping after 3 segments')
              sendBack({ type: 'SONG_ENDED' } as any)
            }
          } catch (error) {
            console.error(`❌ Failed to process segment ${segment.lyricLine.id}:`, error)
          }
        } else {
          console.error(`❌ No PCM data for segment ${segment.lyricLine.id}`)
        }
      }
    })
  }
  
  // Extract PCM data for a sample range
  const extractPCMRange = (startSample: number, endSample: number): Float32Array | null => {
    if (startSample < 0 || endSample > totalSamples) {
      console.error(`❌ Sample range out of bounds: ${startSample}-${endSample}, total: ${totalSamples}`)
      return null
    }
    
    const segmentLength = endSample - startSample
    const segmentPCM = new Float32Array(segmentLength)
    
    let currentSample = 0
    let targetSample = 0
    
    // Iterate through buffer chunks to find our range
    for (const chunk of pcmBuffer) {
      const chunkEnd = currentSample + chunk.length
      
      if (chunkEnd > startSample && currentSample < endSample) {
        // This chunk contains samples we need
        const copyStart = Math.max(0, startSample - currentSample)
        const copyEnd = Math.min(chunk.length, endSample - currentSample)
        const copyLength = copyEnd - copyStart
        
        segmentPCM.set(
          chunk.subarray(copyStart, copyEnd),
          targetSample
        )
        
        targetSample += copyLength
      }
      
      currentSample = chunkEnd
      if (currentSample >= endSample) break
    }
    
    return segmentPCM
  }
  
  // Encode PCM to MP3
  const encodePCMToMP3 = (pcmData: Float32Array, sampleRate: number, channels: number, bitRate: number): Blob => {
    try {
      const encoder = new lamejs.Mp3Encoder(channels, sampleRate, bitRate)
      
      // Convert Float32 to Int16
      const samples = new Int16Array(pcmData.length)
      for (let i = 0; i < pcmData.length; i++) {
        const s = Math.max(-1, Math.min(1, pcmData[i]))
        samples[i] = s < 0 ? s * 0x8000 : s * 0x7FFF
      }
      
      // Encode in chunks
      const sampleBlockSize = 1152 // can be anything but make it a multiple of 576 to make encoders life easier
      const mp3Data: any[] = []
      
      for (let i = 0; i < samples.length; i += sampleBlockSize) {
        const sampleChunk = samples.subarray(i, i + sampleBlockSize)
        const mp3buf = encoder.encodeBuffer(sampleChunk)
        if (mp3buf.length > 0) {
          mp3Data.push(mp3buf)
        }
      }
      
      // Flush remaining data
      const mp3buf = encoder.flush()
      if (mp3buf.length > 0) {
        mp3Data.push(mp3buf)
      }
      
      // Create blob from array of Int8Arrays
      return new Blob(mp3Data, { type: 'audio/mp3' })
    } catch (error) {
      console.error('❌ MP3 encoding error:', error)
      throw error
    }
  }
  
  // Download helper for debugging
  const downloadSegment = (blob: Blob, segmentId: number, expectedText: string) => {
    const url = URL.createObjectURL(blob)
    
    setTimeout(() => {
      const a = document.createElement('a')
      a.href = url
      a.download = `segment${segmentId}.mp3`
      a.style.display = 'none'
      document.body.appendChild(a)
      a.click()
      setTimeout(() => {
        document.body.removeChild(a)
      }, 100)
      
      console.log(`📥 Auto-downloading segment${segmentId}.mp3 (${blob.size} bytes)`)
      console.log(`   Expected: "${expectedText}"`)
    }, segmentId * 500)
  }
  
  // Check for segments every second
  const interval = setInterval(checkAndProcessSegments, 1000)
  
  // Handle messages from parent
  const messageHandler = (event: any) => {
    if (event.data && event.data.type === 'SEGMENTS_DATA') {
      processSegments(event.data.segments)
    }
  }
  
  // Listen for segment data
  if (typeof window !== 'undefined') {
    window.addEventListener('message', messageHandler)
  }
  
  return () => {
    console.log('🛑 Stopping PCM recording...')
    isRecording = false
    
    scriptProcessor.disconnect()
    source.disconnect()
    audioContext.close()
    
    clearInterval(interval)
    
    if (typeof window !== 'undefined') {
      window.removeEventListener('message', messageHandler)
    }
    
    console.log(`📊 Total PCM captured: ${totalSamples} samples (${(totalSamples / SAMPLE_RATE).toFixed(1)}s)`)
  }
})