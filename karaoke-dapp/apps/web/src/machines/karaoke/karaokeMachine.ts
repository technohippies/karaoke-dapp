import { createMachine, assign, fromPromise, fromCallback } from 'xstate'
import type { KaraokeContext, KaraokeEvent } from '../types'
import type { KaraokeSegment } from '../../utils/lyrics-parser'
import type { RecordingSegment } from '../../services/recording-manager.service'
import { KaraokeGradingService } from '../../services/karaoke-grading.service'
import { FinalGradingService } from '../../services/final-grading.service'
import { pcmRecordingService } from './pcmRecorder'

interface AudioChunk {
  data: Blob
  timestamp: number
}

interface MergedKaraokeContext extends KaraokeContext {
  // Recording state
  mediaStream: MediaStream | null
  audioChunks: AudioChunk[]
  recordingStartTime: number | null
  
  // Segment tracking
  segments: KaraokeSegment[]
  processedSegments: Set<number>
  
  // Duration tracking for actual Deepgram usage
  totalRecordedDuration: number // in milliseconds
  segmentDurations: Map<number, number> // lineId -> duration in ms
  
  // Grading
  gradingService: KaraokeGradingService | null
  finalGradingService: FinalGradingService | null
  gradingResults: Map<number, { 
    transcript: string; 
    accuracy: number;
    signature?: string;
    expectedText: string;
    timestamp: number;
  }>
}

type MergedKaraokeEvent = KaraokeEvent
  | { type: 'START' }
  | { type: 'STOP' }
  | { type: 'RESTART' }
  | { type: 'AUDIO_CHUNK'; chunk: Blob; timestamp: number }
  | { type: 'SEGMENT_READY'; segment: KaraokeSegment }
  | { type: 'GRADING_COMPLETE'; lineId: number; transcript: string; accuracy: number; signature?: string; expectedText: string; timestamp: number }
  | { type: 'SONG_ENDED' }
  | { type: 'GET_SEGMENTS' }
  | { type: 'UPDATE_CONTEXT'; 
      segments?: KaraokeSegment[]; 
      gradingService?: KaraokeGradingService | null; 
      finalGradingService?: FinalGradingService | null;
      songId?: number;
      songTitle?: string;
      artistName?: string;
      userAddress?: string;
    }
  | { type: 'UPDATE_COUNTDOWN'; value: number }
  | { type: 'RETRY' }

// Timer service for countdown
const countdownTimer = fromCallback<{ type: 'UPDATE_COUNTDOWN'; value: number }, { duration: number }>(
  ({ input, sendBack }) => {
    let remaining = input.duration
    
    // Send initial value immediately
    sendBack({ type: 'UPDATE_COUNTDOWN', value: remaining })
    
    const interval = setInterval(() => {
      remaining--
      sendBack({ type: 'UPDATE_COUNTDOWN', value: remaining })
      
      if (remaining <= 0) {
        clearInterval(interval)
      }
    }, 1000)
    
    // Cleanup function
    return () => {
      clearInterval(interval)
    }
  }
)

// Setup Media Stream service
const setupMediaStream = fromPromise<MediaStream, void>(
  async () => {
    console.log('🎤 Setting up media stream...')
    const stream = await navigator.mediaDevices.getUserMedia({ 
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      } 
    })
    
    console.log('🎤 Got media stream:', stream.getAudioTracks().length, 'audio tracks')
    console.log('✅ Media stream ready for PCM recording')
    return stream
  }
)

// OLD MediaRecorder service - replaced by PCM recorder
/*
const recordingService = fromCallback<
  MergedKaraokeEvent,
  { 
    mediaRecorder: MediaRecorder
    segments: KaraokeSegment[]
    recordingStartTime: number
    processedSegments: Set<number>
  }
>(({ input, sendBack }) => {
  console.log('🔴 Recording service invoked with:', {
    hasMediaRecorder: !!input.mediaRecorder,
    segmentCount: input.segments.length,
    recordingStartTime: input.recordingStartTime
  })
  const { mediaRecorder, segments, recordingStartTime, processedSegments } = input
  
  // Listen for audio chunks
  let chunkCount = 0
  let firstChunkTime: number | null = null
  let mediaRecorderActualStartTime: number | null = null
  
  // Log when ondataavailable is set up
  console.log(`📎 Setting up ondataavailable handler, MediaRecorder state: ${mediaRecorder.state}`)
  
  mediaRecorder.ondataavailable = async (event) => {
    if (event.data.size > 0) {
      chunkCount++
      const now = Date.now()
      // Calculate timestamp relative to recording start (song start)
      const chunkTimestamp = now - recordingStartTime
      
      // Special logging for first chunk
      if (chunkCount === 1) {
        firstChunkTime = now
        mediaRecorderActualStartTime = now - 100 // Approximate based on timeslice
        console.log(`🎤 FIRST CHUNK RECEIVED:`)
        console.log(`   Size: ${event.data.size} bytes`)
        console.log(`   Time since song start: ${chunkTimestamp}ms`)
        console.log(`   Absolute time: ${now}`)
        console.log(`   Recording start time was: ${recordingStartTime}`)
        console.log(`   Estimated MediaRecorder actual start: ${mediaRecorderActualStartTime}`)
      } else if (chunkCount <= 5) {
        console.log(`🎤 CHUNK ${chunkCount}: ${event.data.size} bytes at ${chunkTimestamp}ms from song start`)
      } else if (chunkCount % 10 === 0 && import.meta.env.DEV) {
        console.log(`🎤 Audio chunk ${chunkCount} received: ${event.data.size} bytes`)
      }
      
      // Clone the blob to ensure we're not storing a reference that gets reused
      const clonedBlob = new Blob([event.data], { type: event.data.type })
      
      sendBack({
        type: 'AUDIO_CHUNK',
        chunk: clonedBlob,
        timestamp: chunkTimestamp
      } as any)
    }
  }
  
  console.log('📼 Recording service started, monitoring segments...')
  
  // Monitor segment timing
  const checkSegments = setInterval(() => {
    const currentTime = Date.now() - recordingStartTime
    // Only log every 4 seconds to reduce spam
    if (currentTime % 4000 < 500 && import.meta.env.DEV) {
      console.log(`⏱️ Checking segments at ${currentTime}ms, total segments: ${segments.length}`)
    }
    
    segments.forEach(segment => {
      // segment.recordEndTime is in milliseconds from song start (calculated by smart split algorithm)
      // currentTime is milliseconds since recording started
      // These should align because recording starts when song starts
      
      const segmentEndTime = segment.recordEndTime
      
      // Add a 500ms buffer to ensure all audio chunks are captured
      // This is especially important for the first segment
      const processingTime = segmentEndTime + 500
      
      // If segment has ended (with buffer) and we haven't processed it
      if (currentTime > processingTime && !processedSegments.has(segment.lyricLine.id)) {
        console.log(`📦 Segment ${segment.lyricLine.id} ready for processing: "${segment.expectedText}" (ended at ${(segmentEndTime/1000).toFixed(2)}s, now ${(currentTime/1000).toFixed(2)}s)`)
        sendBack({ 
          type: 'SEGMENT_READY', 
          segment: segment 
        } as any)
      }
    })
  }, 500) // Check every 500ms
  
  // Cleanup
  return () => {
    clearInterval(checkSegments)
  }
})
*/

// Final grading service
const finalGradingActor = fromPromise<
  number,
  { 
    finalGradingService: FinalGradingService;
    gradingResults: Map<number, any>;
    segments: KaraokeSegment[];
  }
>(async ({ input }) => {
  const { finalGradingService, gradingResults, segments } = input
  
  // Concatenate all expected texts
  const fullExpectedText = segments
    .map(s => s.expectedText)
    .join(' ')
    .trim()
  
  console.log('🎯 Starting final grading...')
  const finalResult = await finalGradingService.calculateFinalScore(gradingResults, fullExpectedText)
  
  return finalResult.finalScore
})

export const karaokeMachine = createMachine({
  types: {} as {
    context: MergedKaraokeContext
    events: MergedKaraokeEvent
    input: Partial<MergedKaraokeContext>
  },
  
  id: 'karaoke',
  initial: 'preparing',
  
  context: ({ input }) => ({
    // Base context
    songId: input?.songId || 0,
    userAddress: input?.userAddress,
    songTitle: input?.songTitle,
    artistName: input?.artistName,
    midiData: input?.midiData || new Uint8Array(),
    audioUrl: input?.audioUrl,
    lyricsUrl: input?.lyricsUrl,
    sessionSigs: input?.sessionSigs,
    currentLineIndex: 0,
    score: 0,
    countdown: undefined,
    
    // Recording context
    mediaStream: null,
    audioChunks: [],
    recordingStartTime: null,
    
    // Segment tracking
    segments: input?.segments || [],
    processedSegments: new Set(),
    
    // Duration tracking
    totalRecordedDuration: 0,
    segmentDurations: new Map(),
    
    // Grading
    gradingService: input?.gradingService || null,
    finalGradingService: input?.finalGradingService || null,
    gradingResults: new Map()
  }),
  
  on: {
    UPDATE_CONTEXT: {
      actions: assign({
        segments: ({ event }) => event.type === 'UPDATE_CONTEXT' ? (event.segments || []) : [],
        gradingService: ({ event }) => event.type === 'UPDATE_CONTEXT' ? (event.gradingService || null) : null,
        finalGradingService: ({ event }) => event.type === 'UPDATE_CONTEXT' ? (event.finalGradingService || null) : null,
        songId: ({ event, context }) => event.type === 'UPDATE_CONTEXT' && event.songId !== undefined ? event.songId : context.songId,
        songTitle: ({ event, context }) => event.type === 'UPDATE_CONTEXT' && event.songTitle !== undefined ? event.songTitle : context.songTitle,
        artistName: ({ event, context }) => event.type === 'UPDATE_CONTEXT' && event.artistName !== undefined ? event.artistName : context.artistName,
        userAddress: ({ event, context }) => event.type === 'UPDATE_CONTEXT' && event.userAddress !== undefined ? event.userAddress : context.userAddress
      })
    }
  },
  states: {
    idle: {
      on: {
        START: {
          target: 'preparing',
          actions: () => console.log('🚀 Transitioning from idle to preparing')
        }
      }
    },
    
    preparing: {
      entry: () => console.log('🎬 In preparing state, about to setup media stream'),
      invoke: {
        src: setupMediaStream,
        onDone: {
          target: 'countdown',
          actions: [
            ({ event }) => console.log('✅ Media stream setup complete:', event.output),
            assign({
              mediaStream: ({ event }) => event.output
            })
          ]
        },
        onError: {
          target: 'error',
          actions: [
            ({ event }) => console.error('❌ MediaRecorder setup failed:', event),
            assign({
              error: () => 'Failed to setup recording'
            })
          ]
        }
      }
    },
    
    countdown: {
      entry: [
        () => console.log('⏰ Entered countdown state'),
        assign({ countdown: 3 })
      ],
      invoke: {
        src: countdownTimer,
        input: { duration: 3 },
        onDone: {
          target: 'recording',
          actions: () => console.log('✅ Countdown timer completed, transitioning to recording')
        },
        onError: {
          target: 'error',
          actions: ({ event }) => console.error('❌ Countdown timer failed:', event)
        }
      },
      on: {
        UPDATE_COUNTDOWN: [
          {
            target: 'recording',
            guard: ({ event }) => {
              const value = (event as any).value
              console.log('⏰ UPDATE_COUNTDOWN received with value:', value, 'checking if 0')
              return value === 0
            },
            actions: () => console.log('✅ Countdown reached 0, transitioning to recording')
          },
          {
            actions: [
              ({ event }) => console.log('⏰ Countdown update:', (event as any).value),
              assign({
                countdown: ({ event }) => (event as any).value
              })
            ]
          }
        ],
        STOP: 'stopped'
      }
    },
    
    recording: {
      entry: [
        () => console.log('🎬 ENTERED RECORDING STATE!'),
        // PCM recording starts automatically via the invoked service
        assign({
          audioChunks: [], // Keep for compatibility but not used
          recordingStartTime: () => {
            const time = Date.now()
            console.log(`📌 Recording start time set to: ${time}`)
            return time
          },
          processedSegments: () => new Set()
        })
      ],
      
      invoke: {
        src: pcmRecordingService,
        input: ({ context }) => ({
          mediaStream: context.mediaStream!,
          segmentCount: context.segments.length,
          recordingStartTime: context.recordingStartTime!,
          segments: context.segments
        })
      },
      
      on: {
        GET_SEGMENTS: {
          actions: ({ context }) => {
            // Send segments data to PCM recorder via postMessage
            if (typeof window !== 'undefined') {
              window.postMessage({
                type: 'SEGMENTS_DATA',
                segments: context.segments
              }, '*')
            }
          }
        },
        
        // AUDIO_CHUNK handler removed - PCM recorder handles audio internally
        
        SEGMENT_READY: {
          actions: ({ context, event, self }) => {
            const segment = (event as any).segment
            
            // Skip if already processed
            if (context.processedSegments.has(segment.lyricLine.id)) return
            
            console.log(`📦 Received segment ${segment.lyricLine.id} from PCM recorder: "${segment.expectedText}"`)
            
            // The PCM recorder already created the audio blob
            const audioBlob = segment.audioBlob
            
            if (!audioBlob) {
              console.error(`❌ No audio blob in segment ${segment.lyricLine.id}`)
              return
            }
            
            console.log(`📦 Segment ${segment.lyricLine.id}: ${audioBlob.size} bytes (MP3)`)
            
            // Verify blob is valid
            if (audioBlob.size === 0) {
              console.error(`❌ Created empty blob for segment ${segment.lyricLine.id}`)
              return
            }
            
            // DEBUG: Download all segments for analysis
            if (segment.lyricLine.id <= 3 && import.meta.env.DEV) {
              const url = URL.createObjectURL(audioBlob)
              console.log(`🎵 DEBUG: Segment ${segment.lyricLine.id} blob URL: ${url}`)
              
              // Store URLs for manual access
              ;(window as any)[`segment${segment.lyricLine.id}Url`] = url
              
              // MP3 files are auto-downloaded by the PCM recorder
            }
            
            // Mark as processed
            context.processedSegments.add(segment.lyricLine.id)
            
            // Grade segment asynchronously
            if (context.gradingService) {
              const recordingSegment: RecordingSegment = {
                segmentId: `seg-${segment.lyricLine.id}-${Date.now()}`,
                lyricLineId: segment.lyricLine.id,
                startTime: segment.recordStartTime,
                endTime: segment.recordEndTime,
                audioBlob,
                expectedText: segment.expectedText,
                keywords: segment.keywords
              }
              
              console.log(`🎯 Starting grading for segment ${segment.lyricLine.id}: "${segment.expectedText}"`)
            console.log(`🎤 Recording service active`)
              
              context.gradingService.gradeSegment(recordingSegment).then(result => {
                console.log(`✅ Grading complete for segment ${segment.lyricLine.id}`)
                self.send({
                  type: 'GRADING_COMPLETE',
                  lineId: segment.lyricLine.id,
                  transcript: result.transcript,
                  accuracy: result.similarity,
                  signature: result.signature,
                  expectedText: result.expectedText,
                  timestamp: Date.now()
                })
              }).catch((error: Error) => {
                console.error(`❌ Failed to grade segment ${segment.lyricLine.id}:`, error)
              })
            } else {
              console.warn(`⚠️ No grading service available for segment ${segment.lyricLine.id}`)
            }
          }
        },
        
        GRADING_COMPLETE: [
          {
            // In development, stop after 3 lines
            target: 'completed',
            guard: ({ context, event }) => {
              if (event.type !== 'GRADING_COMPLETE') return false
              const newResultsCount = context.gradingResults.size + 1
              const isDevelopment = import.meta.env.DEV || process.env.NODE_ENV === 'development'
              if (isDevelopment && newResultsCount >= 3) {
                console.log(`🎯 Development mode: Stopping after ${newResultsCount} lines`)
                return true
              }
              return false
            },
            actions: [
              assign({
                gradingResults: ({ context, event }) => {
                  if (event.type !== 'GRADING_COMPLETE') return context.gradingResults
                  const newResults = new Map(context.gradingResults)
                  newResults.set(event.lineId, {
                    transcript: event.transcript,
                    accuracy: event.accuracy,
                    signature: event.signature,
                    expectedText: event.expectedText,
                    timestamp: event.timestamp
                  })
                  return newResults
                }
              }),
              () => console.log('📋 Stopping early for development testing')
            ]
          },
          {
            actions: assign({
              gradingResults: ({ context, event }) => {
                if (event.type !== 'GRADING_COMPLETE') return context.gradingResults
                const newResults = new Map(context.gradingResults)
                newResults.set(event.lineId, {
                  transcript: event.transcript,
                  accuracy: event.accuracy,
                  signature: event.signature,
                  expectedText: event.expectedText,
                  timestamp: event.timestamp
                })
                return newResults
              }
            })
          }
        ],
        
        SONG_ENDED: 'processingRemaining',
        STOP: 'stopped'
      }
    },
    
    processingRemaining: {
      entry: ({ context }) => {
        // Process any remaining segments
        // Skip logging remaining segments in dev mode
        const unprocessedCount = context.segments.filter(s => !context.processedSegments.has(s.lyricLine.id)).length
        if (unprocessedCount > 0) {
          console.log(`📊 Skipped ${unprocessedCount} remaining segments (dev mode)`)
        }
      },
      always: 'completed'
    },
    
    completed: {
      initial: 'grading',
      
      states: {
        grading: {
          entry: ({ context }) => {
            // PCM recorder will stop automatically when the service is stopped
            console.log(`🏁 Processing final score for ${context.gradingResults.size} segments...`)
          },
          
          invoke: {
            src: finalGradingActor,
            input: ({ context }) => ({
              finalGradingService: context.finalGradingService!,
              gradingResults: context.gradingResults,
              segments: context.segments
            }),
            onDone: {
              target: 'done',
              actions: assign({
                score: ({ event }) => event.output
              })
            },
            onError: {
              target: 'done',
              actions: [
                ({ event }) => console.error('❌ Final grading failed:', event),
                // Fallback to average score
                assign({
                  score: ({ context }) => {
                    let totalAccuracy = 0
                    context.gradingResults.forEach(result => {
                      totalAccuracy += result.accuracy
                    })
                    return context.gradingResults.size > 0 
                      ? Math.round((totalAccuracy / context.gradingResults.size) * 100)
                      : 0
                  }
                })
              ]
            }
          }
        },
        
        done: {
          type: 'final',
          entry: async ({ context }) => {
            // Process completed session data
            try {
              const { karaokeDataPipeline } = await import('@karaoke-dapp/services')
              
              // Extract final result data from context
              const finalResult = {
                finalScore: context.score || 0,
                accuracy: context.score ? context.score / 100 : 0,
                songTitle: context.songTitle || 'Unknown',
                artistName: context.artistName || 'Unknown',
                startTime: Date.now() - 300000, // Approximate
                fullTranscript: Array.from(context.gradingResults.values())
                  .map(r => r.transcript)
                  .join(' ')
              }
              
              // Debug logging for userAddress
              console.log('🔍 Karaoke machine context before processing session:', {
                userAddress: context.userAddress,
                hasUserAddress: !!context.userAddress,
                songTitle: context.songTitle,
                artistName: context.artistName,
                sessionId: context.sessionId,
                songId: context.songId
              })
              
              // Process the session
              await karaokeDataPipeline.processCompletedSession(
                context.sessionId || '',
                context.songId || 1,
                context.gradingResults,
                {
                  ...finalResult,
                  songTitle: context.songTitle || finalResult.songTitle,
                  artistName: context.artistName || finalResult.artistName
                },
                context.userAddress || ''
              )
              
              console.log('✅ Session data processed and queued for sync')
            } catch (error) {
              console.error('❌ Failed to process session data:', error)
            }
          }
        }
      },
      
      on: {
        RESTART: 'countdown'
      }
    },
    
    stopped: {
      entry: () => {
        // PCM recorder will stop automatically when the service is stopped
        console.log('⏹️ Recording stopped by user')
      },
      type: 'final'
    },
    
    error: {
      type: 'final'
    }
  }
})