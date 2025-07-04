import { createMachine, assign, fromPromise, fromCallback } from 'xstate'
import type { KaraokeContext, KaraokeEvent } from '../types'
import type { KaraokeSegment } from '../../utils/lyrics-parser'
import type { RecordingSegment } from '../../services/recording-manager.service'
import { KaraokeGradingService } from '../../services/karaoke-grading.service'
import { FinalGradingService } from '../../services/final-grading.service'

interface AudioChunk {
  data: Blob
  timestamp: number
}

interface MergedKaraokeContext extends KaraokeContext {
  // Recording state
  mediaRecorder: MediaRecorder | null
  audioChunks: AudioChunk[]
  recordingStartTime: number | null
  mediaRecorderStartTime: number | null // When MediaRecorder actually started
  
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

// Setup MediaRecorder service
const setupMediaRecorder = fromPromise<MediaRecorder, void>(
  async () => {
    console.log('🎤 Setting up MediaRecorder...')
    const stream = await navigator.mediaDevices.getUserMedia({ 
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      } 
    })
    
    console.log('🎤 Got media stream:', stream.getAudioTracks().length, 'audio tracks')
    
    const mimeTypes = ['audio/webm;codecs=opus', 'audio/webm']
    let selectedMimeType = 'audio/webm'
    
    for (const mimeType of mimeTypes) {
      if (MediaRecorder.isTypeSupported(mimeType)) {
        selectedMimeType = mimeType
        break
      }
    }
    
    console.log('🎤 Creating MediaRecorder with mime type:', selectedMimeType)
    const recorder = new MediaRecorder(stream, { mimeType: selectedMimeType })
    console.log('✅ MediaRecorder created successfully')
    return recorder
  }
)

// Continuous recording service
const recordingService = fromCallback<
  MergedKaraokeEvent,
  { 
    mediaRecorder: MediaRecorder
    segments: KaraokeSegment[]
    recordingStartTime: number
    mediaRecorderStartTime: number
    processedSegments: Set<number>
  }
>(({ input, sendBack }) => {
  console.log('🔴 Recording service invoked with:', {
    hasMediaRecorder: !!input.mediaRecorder,
    segmentCount: input.segments.length,
    recordingStartTime: input.recordingStartTime,
    mediaRecorderStartTime: input.mediaRecorderStartTime
  })
  const { mediaRecorder, segments, recordingStartTime, mediaRecorderStartTime, processedSegments } = input
  
  // Listen for audio chunks
  let chunkCount = 0
  mediaRecorder.ondataavailable = async (event) => {
    if (event.data.size > 0) {
      chunkCount++
      // Calculate timestamp relative to when MediaRecorder started (not song start)
      const chunkTimestamp = Date.now() - mediaRecorderStartTime
      
      // Log first chunk and every 10th chunk
      if (chunkCount === 1) {
        console.log(`🎤 FIRST CHUNK: ${event.data.size} bytes at ${chunkTimestamp}ms from MediaRecorder start`)
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
    mediaRecorder: null,
    audioChunks: [],
    recordingStartTime: null,
    mediaRecorderStartTime: null,
    
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
      entry: () => console.log('🎬 In preparing state, about to setup MediaRecorder'),
      invoke: {
        src: setupMediaRecorder,
        onDone: {
          target: 'countdown',
          actions: [
            ({ event }) => console.log('✅ MediaRecorder setup complete:', event.output),
            assign({
              mediaRecorder: ({ event }) => event.output
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
        assign({ countdown: 3 }),
        // Start continuous recording during countdown to avoid initialization delay
        assign({
          mediaRecorderStartTime: () => Date.now()
        }),
        ({ context }) => {
          if (context.mediaRecorder && context.mediaRecorder.state === 'inactive') {
            try {
              console.log('🎤 Starting continuous recording during countdown...')
              context.mediaRecorder.start(100) // Get chunks every 100ms
              console.log('✅ MediaRecorder started early for seamless recording')
            } catch (error) {
              console.error('❌ Failed to start MediaRecorder during countdown:', error)
            }
          }
        }
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
        // MediaRecorder already running from countdown, just mark the start time
        ({ context }) => {
          if (context.mediaRecorder) {
            console.log('🎙️ MediaRecorder already running from countdown, state:', context.mediaRecorder.state)
            if (context.mediaRecorder.state !== 'recording') {
              // Fallback: start if not already recording
              console.warn('⚠️ MediaRecorder not recording, starting now...')
              try {
                context.mediaRecorder.start(100)
                console.log('✅ MediaRecorder started (fallback)')
              } catch (error) {
                console.error('❌ Failed to start MediaRecorder:', error)
              }
            }
          } else {
            console.error('❌ No MediaRecorder available in context')
          }
        },
        assign({
          audioChunks: () => [], // Initialize empty chunks array
          recordingStartTime: () => Date.now(),
          processedSegments: () => new Set()
        })
      ],
      
      invoke: {
        src: recordingService,
        input: ({ context }) => ({
          mediaRecorder: context.mediaRecorder!,
          segments: context.segments,
          recordingStartTime: context.recordingStartTime!,
          mediaRecorderStartTime: context.mediaRecorderStartTime!,
          processedSegments: context.processedSegments
        })
      },
      
      on: {
        AUDIO_CHUNK: {
          actions: assign({
            audioChunks: ({ context, event }) => {
              const newChunk = {
                data: (event as any).chunk,
                timestamp: (event as any).timestamp
              }
              const updatedChunks = [...context.audioChunks, newChunk]
              
              // Log every 50th chunk to verify continuous recording
              if (updatedChunks.length % 50 === 0) {
                console.log(`💾 Total chunks stored: ${updatedChunks.length}, latest timestamp: ${(newChunk.timestamp/1000).toFixed(2)}s`)
              }
              
              return updatedChunks
            }
          })
        },
        
        SEGMENT_READY: {
          actions: ({ context, event, self }) => {
            const segment = (event as any).segment as KaraokeSegment
            
            // Skip if already processed
            if (context.processedSegments.has(segment.lyricLine.id)) return
            
            console.log(`📦 Processing segment ${segment.lyricLine.id}: "${segment.expectedText}"`)
            
            // Calculate the offset between MediaRecorder start and song start
            const offset = context.recordingStartTime! - context.mediaRecorderStartTime!
            
            // Extract audio chunks for this segment's time window
            // Adjust segment times by the offset since chunks are timestamped from MediaRecorder start
            const segmentStart = segment.recordStartTime + offset
            const segmentEnd = segment.recordEndTime + offset
            
            // For WebM format, we need to include the initial chunks that contain headers
            // Get the first few chunks (headers) plus the segment-specific chunks
            const headerChunks = context.audioChunks.slice(0, 3) // First 3 chunks contain WebM headers
            const segmentChunks = context.audioChunks.filter(chunk => 
              chunk.timestamp >= segmentStart && 
              chunk.timestamp <= segmentEnd
            )
            
            // Combine headers with segment chunks (avoiding duplicates)
            const allChunks = segment.lyricLine.id === 1 ? segmentChunks : [...headerChunks, ...segmentChunks.filter(c => c.timestamp >= headerChunks[headerChunks.length - 1]?.timestamp || 0)]
            
            console.log(`🔍 Segment ${segment.lyricLine.id} chunk search:`, {
              offset: `${(offset/1000).toFixed(2)}s between MediaRecorder start and song start`,
              originalWindow: `${(segment.recordStartTime/1000).toFixed(2)}s - ${(segment.recordEndTime/1000).toFixed(2)}s`,
              adjustedWindow: `${(segmentStart/1000).toFixed(2)}s - ${(segmentEnd/1000).toFixed(2)}s`,
              totalChunks: context.audioChunks.length,
              chunkTimeRange: context.audioChunks.length > 0 ? 
                `${(context.audioChunks[0]?.timestamp/1000).toFixed(2)}s - ${(context.audioChunks[context.audioChunks.length - 1]?.timestamp/1000).toFixed(2)}s` : 'none',
              segmentChunks: segmentChunks.length,
              headerChunks: segment.lyricLine.id > 1 ? headerChunks.length : 0,
              totalChunksUsed: allChunks.length
            })
            
            if (allChunks.length === 0) {
              console.warn(`❌ No chunks found for segment ${segment.lyricLine.id} (${(segmentStart/1000).toFixed(2)}s - ${(segmentEnd/1000).toFixed(2)}s)`)
              return
            }
            
            // Create blob - ensure we're using fresh chunk data
            const chunkData = allChunks.map(c => c.data)
            console.log(`🎵 Creating blob from ${chunkData.length} chunks, first chunk size: ${chunkData[0]?.size || 0}`)
            
            const audioBlob = new Blob(
              chunkData,
              { type: 'audio/webm' }
            )
            
            console.log(`📦 Extracted segment ${segment.lyricLine.id}: ${audioBlob.size} bytes from ${allChunks.length} chunks`)
            
            // Verify blob is valid
            if (audioBlob.size === 0) {
              console.error(`❌ Created empty blob for segment ${segment.lyricLine.id}`)
              return
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
            console.log(`🎤 MediaRecorder state: ${context.mediaRecorder?.state}`)
              
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
        context.segments.forEach(segment => {
          if (!context.processedSegments.has(segment.lyricLine.id)) {
            console.log(`Processing remaining segment ${segment.lyricLine.id}`)
            // Would trigger SEGMENT_READY for remaining segments
          }
        })
      },
      always: 'completed'
    },
    
    completed: {
      initial: 'grading',
      
      states: {
        grading: {
          entry: ({ context }) => {
            if (context.mediaRecorder?.state === 'recording') {
              context.mediaRecorder.stop()
            }
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
      entry: ({ context }) => {
        if (context.mediaRecorder?.state === 'recording') {
          context.mediaRecorder.stop()
        }
        console.log('⏹️ Recording stopped by user')
      },
      type: 'final'
    },
    
    error: {
      type: 'final'
    }
  }
})