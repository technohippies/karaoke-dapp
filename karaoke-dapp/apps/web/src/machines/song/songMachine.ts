import { createMachine, assign } from 'xstate';
import type { SongContext, SongEvent } from '../types';

export const songMachine = createMachine({
  types: {} as {
    context: SongContext;
    events: SongEvent;
  },
  id: 'song',
  initial: 'idle',
  context: ({ input }: { input?: { songId: number; userAddress?: string } }) => ({
    songId: input?.songId || 0,
    userAddress: input?.userAddress,
    currentLineIndex: 0,
    score: 0,
  }),
  on: {
    UPDATE_ADDRESS: {
      actions: assign({
        userAddress: ({ event }) => event.address,
      }),
    },
  },
  states: {
    idle: {
      on: {
        CHECK_ACCESS: 'checkingAccess',
      },
    },
    
    checkingAccess: {
      description: 'Checking if user has purchased this song',
      invoke: {
        id: 'checkAccess',
        src: 'checkAccess',
        input: ({ context }) => context,
        onDone: [
          {
            target: 'purchased',
            guard: 'hasAccess',
            actions: assign({
              tokenId: ({ event }) => event.output.tokenId,
            }),
          },
          {
            target: 'unpurchased',
          },
        ],
        onError: {
          target: 'error',
          actions: assign({
            error: ({ event }) => event.error instanceof Error ? event.error.message : String(event.error),
          }),
        },
      },
    },
    
    unpurchased: {
      description: 'Song not purchased - show purchase button',
      on: {
        PURCHASE: 'purchasing',
      },
    },
    
    purchasing: {
      description: 'Processing purchase transaction',
      invoke: {
        id: 'purchaseSong',
        src: 'purchaseSong',
        input: ({ context }) => context,
        onDone: {
          target: 'purchased',
          actions: assign({
            tokenId: ({ event }) => event.output.tokenId,
          }),
        },
        onError: {
          target: 'unpurchased',
          actions: assign({
            error: ({ event }) => event.error instanceof Error ? event.error.message : String(event.error),
          }),
        },
      },
    },
    
    purchased: {
      description: 'Song purchased - check if downloaded',
      initial: 'checkingCache',
      states: {
        checkingCache: {
          description: 'Checking IndexedDB for cached MIDI',
          invoke: {
            id: 'checkCache',
            src: 'checkCache',
            input: ({ context }) => context,
            onDone: [
              {
                target: 'ready',
                guard: 'hasCachedMidi',
                actions: assign({
                  midiData: ({ event }) => event.output.midiData,
                  audioUrl: ({ event }) => event.output.audioUrl,
                  lyricsUrl: ({ event }) => event.output.lyricsUrl,
                }),
              },
              {
                target: 'needsDownload',
                actions: assign({
                  encryptedCid: ({ event }) => event.output.encryptedCid,
                }),
              },
            ],
            onError: {
              target: 'needsDownload',
            },
          },
        },
        
        needsDownload: {
          description: 'MIDI not cached - show download button',
          on: {
            DOWNLOAD: 'downloading',
          },
        },
        
        downloading: {
          description: 'Downloading and decrypting MIDI with Lit Protocol',
          initial: 'checkingSession',
          states: {
            checkingSession: {
              description: 'Checking for valid Lit session',
              invoke: {
                id: 'checkSession',
                src: 'checkSession',
                input: ({ context }) => context,
                onDone: [
                  {
                    target: 'decrypting',
                    guard: 'hasValidSession',
                    actions: assign({
                      sessionSigs: ({ event }) => event.output,
                    }),
                  },
                  {
                    target: 'creatingSession',
                  },
                ],
              },
            },
            
            creatingSession: {
              description: 'Creating Lit Protocol session signature',
              invoke: {
                id: 'createSession',
                src: 'createSession',
                input: ({ context }) => context,
                onDone: {
                  target: 'decrypting',
                  actions: assign({
                    sessionSigs: ({ event }) => event.output,
                  }),
                },
                onError: {
                  target: '#song.purchased.needsDownload',
                  actions: assign({
                    error: ({ event }) => event.error instanceof Error ? event.error.message : String(event.error),
                  }),
                },
              },
            },
            
            decrypting: {
              description: 'Decrypting MIDI file',
              invoke: {
                id: 'decryptMidi',
                src: 'decryptMidi',
                input: ({ context }) => context,
                onDone: {
                  target: 'caching',
                  actions: assign({
                    midiData: ({ event }) => event.output.midiData,
                    audioUrl: ({ event }) => event.output.audioUrl,
                    lyricsUrl: ({ event }) => event.output.lyricsUrl,
                  }),
                },
                onError: {
                  target: '#song.purchased.needsDownload',
                  actions: assign({
                    error: ({ event }) => event.error instanceof Error ? event.error.message : String(event.error),
                  }),
                },
              },
            },
            
            caching: {
              description: 'Saving decrypted MIDI to IndexedDB',
              invoke: {
                id: 'cacheMidi',
                src: 'cacheMidi',
                input: ({ context }) => context,
                onDone: {
                  target: '#song.purchased.ready',
                },
                onError: {
                  target: '#song.purchased.ready',
                },
              },
            },
          },
        },
        
        ready: {
          description: 'Song ready to play - show start karaoke button',
          on: {
            START_KARAOKE: '#song.startingKaraoke',
          },
        },
      },
    },
    
    startingKaraoke: {
      description: 'Transitioning to karaoke mode',
      entry: 'navigateToKaraoke',
      type: 'final',
    },
    
    error: {
      description: 'Error state with retry option',
      on: {
        RETRY: 'idle',
      },
    },
  },
});