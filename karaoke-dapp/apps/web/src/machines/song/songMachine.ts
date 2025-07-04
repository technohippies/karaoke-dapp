import { createMachine, assign } from 'xstate';
import type { SongContext, SongEvent } from '../types';

export const songMachine = createMachine({
  types: {} as {
    context: SongContext;
    events: SongEvent;
  },
  id: 'song',
  initial: 'idle',
  context: ({ input }: { input?: { songId: number; userAddress?: string; songDuration?: number } }) => ({
    songId: input?.songId || 0,
    userAddress: input?.userAddress,
    songDuration: input?.songDuration,
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
        PURCHASE: 'purchasingWithPermit', // Skip approval, use permit!
        PURCHASE_BUNDLED: 'purchasingBundled', // New: Bundle everything with sendCalls!
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
      description: 'Processing purchase and unlock transaction (legacy)',
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
    
    purchasingWithPermit: {
      description: 'Processing purchase with permit (no separate approval needed!)',
      invoke: {
        id: 'purchaseAndUnlockWithPermit',
        src: 'purchaseAndUnlockWithPermit',
        input: ({ context }) => context,
        onDone: {
          target: 'purchased.checkingCache',
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
    
    purchasingBundled: {
      description: 'Processing bundled purchase with sendCalls (ONE transaction for everything!)',
      // This state is managed by the React component using useBundledPurchase hook
      on: {
        PURCHASE_SUCCESS: {
          target: 'purchased.checkingCache',
          actions: assign({
            tokenId: ({ event }) => event.txHash,
          }),
        },
        PURCHASE_ERROR: {
          target: 'unpurchased',
          actions: assign({
            error: ({ event }) => event.error,
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
                target: 'checkingVoiceCredits',
                guard: ({ context }) => !!context.sessionSigs,
              },
              {
                target: 'preparingKaraoke',
              },
            ],
            PURCHASE_VOICE_CREDITS: '#song.purchasingVoiceCredits',
            PURCHASE_COMBO_PACK: '#song.purchasingComboPack',
          },
        },
        
        preparingKaraoke: {
          description: 'Creating session signatures for karaoke',
          invoke: {
            id: 'createSessionForKaraoke',
            src: 'createSession',
            input: ({ context }) => context,
            onDone: {
              target: 'checkingVoiceCredits',
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

        checkingVoiceCredits: {
          description: 'Checking voice credits and fetching lyrics',
          initial: 'fetchingLyrics',
          states: {
            fetchingLyrics: {
              invoke: {
                id: 'fetchLyrics',
                src: 'fetchLyrics',
                input: ({ context }) => context,
                onDone: {
                  target: 'checkingBalance',
                  actions: assign({
                    lyrics: ({ event }) => event.output,
                  }),
                },
                onError: {
                  target: '#song.purchased.ready',
                  actions: assign({
                    error: () => 'Failed to fetch lyrics',
                  }),
                },
              },
            },
            checkingBalance: {
              invoke: {
                id: 'checkVoiceCredits',
                src: 'checkVoiceCredits',
                input: ({ context }) => context,
                onDone: [
                  {
                    target: 'waitingForConfirmation',
                    guard: ({ event }) => event.output.hasEnoughCredits,
                    actions: assign({
                      voiceCredits: ({ event }) => event.output.balance,
                      creditsNeeded: ({ event }) => event.output.creditsNeeded,
                    }),
                  },
                  {
                    target: '#song.purchased.ready',
                    actions: assign({
                      error: ({ event }) => `Insufficient voice credits. You have ${event.output.balance} but need ${event.output.creditsNeeded}`,
                      voiceCredits: ({ event }) => event.output.balance,
                      creditsNeeded: ({ event }) => event.output.creditsNeeded,
                    }),
                  },
                ],
                onError: {
                  target: '#song.purchased.ready',
                  actions: assign({
                    error: () => 'Failed to check voice credits',
                  }),
                },
              },
            },
            waitingForConfirmation: {
              on: {
                CONFIRM_CREDITS: 'generatingSignature',
                CANCEL_KARAOKE: '#song.purchased.ready',
              },
            },
            generatingSignature: {
              entry: assign({
                sessionId: () => crypto.randomUUID(), // Generate unique session ID
              }),
              invoke: {
                id: 'generateSignature',
                src: 'generateVoiceSessionSignature',
                input: ({ context }) => context,
                onDone: {
                  target: 'deductingCredits',
                  actions: assign({
                    pkpSignature: ({ event }) => event.output,
                  }),
                },
                onError: {
                  target: '#song.purchased.ready',
                  actions: assign({
                    error: () => 'Failed to generate signature',
                  }),
                },
              },
            },
            deductingCredits: {
              invoke: {
                id: 'deductCredits',
                src: 'deductVoiceCredits',
                input: ({ context }) => context,
                onDone: {
                  target: '#song.karaoke',
                },
                onError: {
                  target: '#song.purchased.ready',
                  actions: assign({
                    error: () => 'Failed to deduct voice credits',
                  }),
                },
              },
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
          sessionId: context.sessionId,
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

    purchasingVoiceCredits: {
      description: 'Purchasing voice credits',
      invoke: {
        id: 'purchaseVoiceCredits',
        src: 'purchaseVoiceCredits',
        input: ({ context }) => context,
        onDone: {
          target: 'purchased.ready',
          actions: assign({
            error: undefined,
          }),
        },
        onError: {
          target: 'purchased.ready',
          actions: assign({
            error: ({ event }) => event.error instanceof Error ? event.error.message : String(event.error),
          }),
        },
      },
    },

    purchasingComboPack: {
      description: 'Purchasing combo pack (song + voice credits)',
      invoke: {
        id: 'purchaseComboPack',
        src: 'purchaseComboPack',
        input: ({ context }) => context,
        onDone: {
          target: 'checkingAccess',
          actions: assign({
            error: undefined,
          }),
        },
        onError: {
          target: 'purchased.ready',
          actions: assign({
            error: ({ event }) => event.error instanceof Error ? event.error.message : String(event.error),
          }),
        },
      },
    },
  },
});