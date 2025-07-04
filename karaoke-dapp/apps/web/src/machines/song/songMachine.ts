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
            target: 'canUnlock',
            guard: 'canUnlock',
            actions: assign({
              credits: ({ event }) => event.output.credits,
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
        PURCHASE: 'approvingUSDC',
      },
    },

    canUnlock: {
      description: 'User has credits available - show unlock button',
      on: {
        UNLOCK: 'unlocking',
      },
    },

    unlocking: {
      description: 'Using credit to unlock song',
      invoke: {
        id: 'unlockSong',
        src: 'unlockSong',
        input: ({ context }) => context,
        onDone: [
          {
            target: 'purchased.ready',
            guard: ({ event }) => !!event.output.midiData,
            actions: assign({
              tokenId: ({ event }) => event.output.tokenId,
              midiData: ({ event }) => event.output.midiData,
              audioUrl: ({ event }) => event.output.audioUrl,
              lyricsUrl: ({ event }) => event.output.lyricsUrl,
            }),
          },
          {
            target: 'purchased.checkingCache',
            actions: assign({
              tokenId: ({ event }) => event.output.tokenId,
            }),
          },
        ],
        onError: {
          target: 'canUnlock',
          actions: assign({
            error: ({ event }) => event.error instanceof Error ? event.error.message : String(event.error),
          }),
        },
      },
    },
    
    approvingUSDC: {
      description: 'Approving USDC spending',
      invoke: {
        id: 'approveUSDC',
        src: 'approveUSDC',
        input: ({ context }) => context,
        onDone: {
          target: 'purchasing',
        },
        onError: {
          target: 'unpurchased',
          actions: assign({
            error: ({ event }) => event.error instanceof Error ? event.error.message : String(event.error),
          }),
        },
      },
    },
    
    purchasing: {
      description: 'Processing purchase and unlock transaction',
      invoke: {
        id: 'purchaseAndUnlock',
        src: 'purchaseAndUnlock',
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
                actions: [
                  ({ event }) => {
                    console.log('🎯 Cached MIDI guard passed, transitioning to ready with:', {
                      hasMidiData: !!event.output.midiData,
                      midiDataLength: event.output.midiData?.length,
                      audioUrl: event.output.audioUrl,
                      lyricsUrl: event.output.lyricsUrl
                    });
                  },
                  assign({
                    midiData: ({ event }) => event.output.midiData,
                    audioUrl: ({ event }) => event.output.audioUrl,
                    lyricsUrl: ({ event }) => event.output.lyricsUrl,
                  }),
                ],
              },
              {
                target: 'needsDownload',
                actions: [
                  ({ event }) => {
                    console.log('⚠️ No cached MIDI found, transitioning to needsDownload with:', {
                      output: event.output,
                      hasEncryptedCid: !!event.output?.encryptedCid
                    });
                  },
                  assign({
                    encryptedCid: ({ event }) => {
                      console.log('📝 Assigning encryptedCid from checkCache:', event.output?.encryptedCid);
                      return event.output?.encryptedCid;
                    },
                  }),
                ],
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
                  target: '#song.error',
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
                  target: '#song.error',
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
            START_KARAOKE: [
              {
                target: '#song.karaoke',
                guard: ({ context }) => !!context.sessionSigs,
              },
              {
                target: 'preparingKaraoke',
              },
            ],
          },
        },
        
        preparingKaraoke: {
          description: 'Creating session signatures for karaoke',
          invoke: {
            id: 'createSessionForKaraoke',
            src: 'createSession',
            input: ({ context }) => context,
            onDone: {
              target: '#song.karaoke',
              actions: assign({
                sessionSigs: ({ event }) => event.output,
              }),
            },
            onError: {
              target: 'ready',
              actions: assign({
                error: ({ event }) => event.error instanceof Error ? event.error.message : String(event.error),
              }),
            },
          },
        },
      },
    },
    
    karaoke: {
      description: 'Karaoke mode active',
      invoke: {
        id: 'karaokeMachine',
        src: 'karaokeMachine',
        input: ({ context }) => ({
          songId: context.songId,
          userAddress: context.userAddress,
          midiData: context.midiData,
          audioUrl: context.audioUrl,
          lyricsUrl: context.lyricsUrl,
          sessionSigs: context.sessionSigs,
        }),
        onDone: {
          target: 'purchased.ready',
          actions: assign({
            // Store the final score if needed
            lastKaraokeScore: ({ event }) => event.output?.score,
          }),
        },
        onError: {
          target: 'purchased.ready',
          actions: assign({
            error: ({ event }) => event.error instanceof Error ? event.error.message : String(event.error),
          }),
        },
      },
      on: {
        EXIT: 'purchased.ready',
      },
    },
    
    error: {
      description: 'Error state with retry option',
      on: {
        RETRY: 'purchased.needsDownload',
      },
    },
  },
});