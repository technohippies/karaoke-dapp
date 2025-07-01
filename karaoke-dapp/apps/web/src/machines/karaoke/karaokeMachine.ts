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
    sessionSigs: input?.sessionSigs,
    currentLineIndex: 0,
    score: 0,
    countdown: undefined,
  }),
  states: {
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
      entry: assign({
        countdown: () => 3
      }),
      invoke: {
        id: 'countdownTimer',
        src: 'countdownTimer',
        onError: {
          actions: ({ event }) => console.error('❌ Countdown error:', event),
        },
      },
      on: {
        UPDATE_COUNTDOWN: [
          {
            target: 'playing',
            guard: ({ event }) => event.value === 0,
            actions: () => console.log('✅ Transitioning to playing state'),
          },
          {
            actions: assign({
              countdown: ({ event }) => event.value,
            }),
          },
        ],
        STOP: 'ready',
      },
    },
    
    playing: {
      description: 'Karaoke session active - playing and recording',
      entry: ['startPlayback', 'startLyricSync', 'startRecording'],
      exit: ['stopPlayback', 'stopLyricSync', 'stopRecordingAndProcess'],
      on: {
        COMPLETE: 'stopped',
        STOP: 'stopped',
        NEXT_LINE: {
          actions: assign({
            currentLineIndex: ({ context }) => 
              Math.min(context.currentLineIndex + 1, (context.lyrics?.length || 1) - 1),
          }),
        },
      },
    },
    
    stopped: {
      description: 'Karaoke session stopped',
      entry: ['stopPlayback', assign({
        score: ({ context }) => {
          const completion = context.currentLineIndex / (context.lyrics?.length || 1);
          return Math.round(completion * 100);
        }
      })],
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