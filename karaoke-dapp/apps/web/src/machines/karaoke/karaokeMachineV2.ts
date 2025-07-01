import { createMachine, assign, fromPromise } from 'xstate';
import type { KaraokeContext, KaraokeEvent } from '../types';
import type { KaraokeSegment } from '../../utils/lyrics-parser';

// Promise actor for recording a single line with buffer
const recordLineActor = fromPromise<
  Blob,
  { segment: KaraokeSegment; stream: MediaStream }
>(async ({ input }) => {
  const { segment, stream } = input;
  
  return new Promise((resolve, reject) => {
    const chunks: Blob[] = [];
    const recorder = new MediaRecorder(stream, { 
      mimeType: 'audio/webm;codecs=opus' 
    });
    
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunks.push(event.data);
      }
    };
    
    recorder.onstop = () => {
      const audioBlob = new Blob(chunks, { type: 'audio/webm' });
      console.log(`🎤 Recorded line ${segment.lyricLine.id}, size: ${audioBlob.size}`);
      resolve(audioBlob);
    };
    
    recorder.onerror = reject;
    
    // Start recording
    recorder.start(100); // Get chunks every 100ms
    console.log(`🎤 Started recording line ${segment.lyricLine.id}: "${segment.expectedText}"`);
    
    // Stop after duration
    const duration = segment.recordEndTime - segment.recordStartTime;
    setTimeout(() => {
      recorder.stop();
    }, duration);
  });
});

// Promise actor for grading a segment
const gradeSegmentActor = fromPromise<
  { lineId: number; accuracy: number; transcript: string },
  { 
    audioBlob: Blob;
    expectedText: string;
    lineId: number;
    gradingService: any; // KaraokeGradingService
  }
>(async ({ input }) => {
  const { audioBlob, expectedText, lineId, gradingService } = input;
  
  const result = await gradingService.gradeSegment({
    audioBlob,
    expectedText,
    lyricLineId: lineId,
    keywords: expectedText.split(' ').filter(w => w.length > 3)
  });
  
  return {
    lineId,
    accuracy: result.similarity,
    transcript: result.transcript
  };
});

export const karaokeMachineV2 = createMachine({
  types: {} as {
    context: KaraokeContext & {
      segments: KaraokeSegment[];
      mediaStream?: MediaStream;
      gradingService?: any;
      currentSegmentIndex: number;
      recordingQueue: { segment: KaraokeSegment; audioBlob: Blob }[];
      lineScores: Map<number, number>;
    };
    events: KaraokeEvent | { type: 'AUDIO_TIME_UPDATE'; time: number } | { type: 'EXIT' } | { type: 'RETRY' };
    input: Partial<KaraokeContext & {
      segments: KaraokeSegment[];
      mediaStream?: MediaStream;
      gradingService?: any;
    }>;
  },
  id: 'karaokeV2',
  type: 'parallel',
  context: ({ input }) => ({
    songId: input?.songId || 0,
    midiData: input?.midiData || new Uint8Array(),
    audioUrl: input?.audioUrl,
    lyricsUrl: input?.lyricsUrl,
    sessionSigs: input?.sessionSigs,
    segments: input?.segments || [],
    mediaStream: input?.mediaStream,
    gradingService: input?.gradingService,
    currentSegmentIndex: 0,
    recordingQueue: [],
    lineScores: new Map(),
    currentLineIndex: 0,
    score: 0,
    countdown: undefined,
  }),
  
  states: {
    // Manages the overall karaoke session state
    session: {
      initial: 'initializing',
      states: {
        initializing: {
          invoke: {
            src: fromPromise(async () => {
              // Get microphone permission
              const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                  echoCancellation: true,
                  noiseSuppression: true,
                  autoGainControl: true
                } 
              });
              return stream;
            }),
            onDone: {
              target: 'countdown',
              actions: assign({
                mediaStream: ({ event }) => event.output
              })
            },
            onError: 'error'
          }
        },
        
        countdown: {
          entry: assign({ countdown: 3 }),
          invoke: {
            src: 'countdownTimer',
            onError: {
              actions: ({ event }) => console.error('Countdown error:', event)
            }
          },
          on: {
            UPDATE_COUNTDOWN: [
              {
                target: 'active',
                guard: ({ event }) => event.value === 0,
              },
              {
                actions: assign({
                  countdown: ({ event }) => event.value,
                })
              }
            ],
            EXIT: {
              actions: 'cleanupMediaStream'
            }
          }
        },
        
        active: {
          on: {
            STOP: 'stopped',
            COMPLETE: 'stopped',
            EXIT: {
              actions: 'cleanupMediaStream'
            }
          }
        },
        
        stopped: {
          entry: assign({
            score: ({ context }) => {
              // Calculate average score from all graded lines
              if (context.lineScores.size === 0) return 0;
              const total = Array.from(context.lineScores.values()).reduce((a, b) => a + b, 0);
              return Math.round(total / context.lineScores.size);
            }
          }),
          on: {
            RESTART: 'countdown',
            EXIT: {
              actions: 'cleanupMediaStream'
            }
          }
        },
        
        error: {
          on: {
            RETRY: 'initializing',
            EXIT: {
              actions: 'cleanupMediaStream'
            }
          }
        }
      }
    },
    
    // Manages line-by-line recording
    recording: {
      initial: 'idle',
      states: {
        idle: {
          on: {
            AUDIO_TIME_UPDATE: {
              target: 'checkingNextLine',
              guard: ({ context }) => context.currentLineIndex >= 0  // Always check for lines when active
            }
          }
        },
        
        checkingNextLine: {
          always: [
            {
              target: 'recordingLine',
              guard: ({ context, event }) => {
                if (event.type !== 'AUDIO_TIME_UPDATE') return false;
                const currentTimeMs = event.time * 1000;
                
                // Find the next segment to record
                const nextSegment = context.segments.find(seg => {
                  const timeUntilStart = seg.recordStartTime - currentTimeMs;
                  // Start recording if we're within 100ms of the start time
                  return timeUntilStart > -100 && timeUntilStart < 100;
                });
                
                return !!nextSegment;
              },
              actions: assign({
                currentSegmentIndex: ({ context, event }) => {
                  if (event.type !== 'AUDIO_TIME_UPDATE') return context.currentSegmentIndex;
                  const currentTimeMs = event.time * 1000;
                  
                  const index = context.segments.findIndex(seg => {
                    const timeUntilStart = seg.recordStartTime - currentTimeMs;
                    return timeUntilStart > -100 && timeUntilStart < 100;
                  });
                  
                  return index >= 0 ? index : context.currentSegmentIndex;
                }
              })
            },
            {
              target: 'idle'
            }
          ]
        },
        
        recordingLine: {
          invoke: {
            src: recordLineActor,
            input: ({ context }) => ({
              segment: context.segments[context.currentSegmentIndex],
              stream: context.mediaStream!
            }),
            onDone: {
              target: 'idle',
              actions: assign({
                recordingQueue: ({ context, event }) => {
                  const segment = context.segments[context.currentSegmentIndex];
                  return [...context.recordingQueue, {
                    segment,
                    audioBlob: event.output
                  }];
                }
              })
            },
            onError: {
              target: 'idle',
              actions: ({ event }) => console.error('Recording error:', event.error)
            }
          }
        }
      }
    },
    
    // Manages grading of recorded segments
    grading: {
      initial: 'idle',
      states: {
        idle: {
          always: {
            target: 'gradingSegment',
            guard: ({ context }) => context.recordingQueue.length > 0 && !!context.gradingService
          }
        },
        
        gradingSegment: {
          invoke: {
            src: gradeSegmentActor,
            input: ({ context }) => {
              const item = context.recordingQueue[0];
              return {
                audioBlob: item.audioBlob,
                expectedText: item.segment.expectedText,
                lineId: item.segment.lyricLine.id,
                gradingService: context.gradingService
              };
            },
            onDone: {
              target: 'idle',
              actions: assign({
                recordingQueue: ({ context }) => context.recordingQueue.slice(1),
                lineScores: ({ context, event }) => {
                  const newScores = new Map(context.lineScores);
                  newScores.set(event.output.lineId, event.output.accuracy);
                  
                  console.log(`📝 Line ${event.output.lineId} graded:`, {
                    accuracy: `${event.output.accuracy}%`,
                    transcript: event.output.transcript
                  });
                  
                  return newScores;
                }
              })
            },
            onError: {
              target: 'idle',
              actions: [
                ({ event }) => console.error('Grading error:', event.error),
                assign({
                  recordingQueue: ({ context }) => context.recordingQueue.slice(1)
                })
              ]
            }
          }
        }
      }
    }
  }
}).provide({
  actions: {
    cleanupMediaStream: ({ context }) => {
      // Stop all media tracks
      if (context.mediaStream) {
        context.mediaStream.getTracks().forEach((track: MediaStreamTrack) => track.stop());
      }
    }
  }
});