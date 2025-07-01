import { createMachine, assign } from 'xstate';
import type { KaraokeContext, KaraokeEvent } from '../types';

export const karaokeMachine = createMachine({
  types: {} as {
    context: KaraokeContext;
    events: KaraokeEvent;
  },
  id: 'karaoke',
  // Skip permission check since we already checked in the parent component
  initial: 'countdown',
  context: ({ input }: { input?: Partial<KaraokeContext> }) => ({
    songId: input?.songId || 0,
    midiData: input?.midiData || new Uint8Array(),
    audioUrl: input?.audioUrl,
    lyricsUrl: input?.lyricsUrl,
    currentLineIndex: 0,
    score: 0,
    countdown: undefined,
  }),
  states: {
    checkingPermissions: {
      description: 'Checking microphone permissions',
      invoke: {
        id: 'checkPermissions',
        src: 'checkMicrophonePermission',
        onDone: {
          target: 'countdown',
        },
        onError: {
          target: 'needsPermission',
        },
      },
    },
    
    needsPermission: {
      description: 'Waiting for user to grant microphone permission',
      on: {
        REQUEST_PERMISSION: {
          target: 'checkingPermissions',
        },
      },
    },
    
    initializing: {
      description: 'Setting up karaoke session',
      initial: 'loadingAudio',
      states: {
        loadingAudio: {
          description: 'Loading audio buffer and MIDI data',
          invoke: {
            id: 'loadAudio',
            src: 'loadAudio',
            input: ({ context }) => context,
            onDone: {
              target: 'loadingLyrics',
              actions: assign({
                audioBuffer: ({ event }) => event.output.audioBuffer,
              }),
            },
            onError: {
              target: '#karaoke.error',
              actions: assign({
                error: ({ event }) => event.error instanceof Error ? event.error.message : String(event.error),
              }),
            },
          },
        },
        
        loadingLyrics: {
          description: 'Loading and parsing lyrics',
          invoke: {
            id: 'loadLyrics',
            src: 'loadLyrics',
            input: ({ context }) => context,
            onDone: {
              target: '#karaoke.ready',
              actions: assign({
                lyrics: ({ event }) => event.output,
              }),
            },
            onError: {
              target: '#karaoke.error',
              actions: assign({
                error: ({ event }) => event.error instanceof Error ? event.error.message : String(event.error),
              }),
            },
          },
        },
      },
    },
    
    ready: {
      description: 'Ready to start karaoke',
      on: {
        PLAY: 'countdown',
        LOAD_AUDIO: 'initializing',
      },
    },
    
    countdown: {
      description: 'Countdown before karaoke starts',
      entry: 'startCountdown',
      invoke: {
        id: 'countdownTimer',
        src: 'countdownTimer',
        onDone: {
          target: 'playing',
          actions: () => console.log('✅ Transitioning to playing state'),
        },
        onError: {
          actions: ({ event }) => console.error('❌ Countdown error:', event),
        },
      },
      on: {
        UPDATE_COUNTDOWN: {
          actions: assign({
            countdown: ({ event }) => event.value,
          }),
        },
        STOP: 'ready',
      },
    },
    
    playing: {
      description: 'Karaoke session active',
      entry: ['startPlayback', 'startLyricSync'],
      exit: ['stopPlayback', 'stopLyricSync'],
      initial: 'playingOnly',
      states: {
        playingOnly: {
          description: 'Playing without recording',
          on: {
            START_RECORDING: {
              target: 'recording',
              guard: 'canRecord',
            },
          },
        },
        
        recording: {
          description: 'Playing and recording user voice',
          entry: 'startRecording',
          exit: 'stopRecordingAndProcess',
          on: {
            STOP_RECORDING: {
              target: 'playingOnly',
            },
          },
        },
      },
      on: {
        PAUSE: 'paused',
        STOP: 'stopped',
        NEXT_LINE: {
          actions: assign({
            currentLineIndex: ({ context }) => 
              Math.min(context.currentLineIndex + 1, (context.lyrics?.length || 1) - 1),
          }),
        },
        PREVIOUS_LINE: {
          actions: assign({
            currentLineIndex: ({ context }) => 
              Math.max(context.currentLineIndex - 1, 0),
          }),
        },
      },
    },
    
    paused: {
      description: 'Karaoke session paused',
      entry: 'pausePlayback',
      on: {
        PLAY: 'playing',
        STOP: 'stopped',
      },
    },
    
    stopped: {
      description: 'Karaoke session stopped',
      entry: ['stopPlayback', 'calculateFinalScore'],
      initial: 'reviewing',
      states: {
        reviewing: {
          description: 'Reviewing performance',
          on: {
            SUBMIT_SCORE: 'submitting',
            RESTART: '#karaoke.ready',
          },
        },
        
        submitting: {
          description: 'Submitting score to blockchain',
          invoke: {
            id: 'submitScore',
            src: 'submitScore',
            input: ({ context }) => context,
            onDone: {
              target: 'submitted',
            },
            onError: {
              target: 'reviewing',
              actions: assign({
                error: ({ event }) => event.error instanceof Error ? event.error.message : String(event.error),
              }),
            },
          },
        },
        
        submitted: {
          description: 'Score submitted successfully',
          type: 'final',
        },
      },
    },
    
    error: {
      description: 'Error state',
      on: {
        RESTART: 'initializing',
      },
    },
  },
});