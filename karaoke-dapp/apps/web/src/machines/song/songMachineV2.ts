import { createMachine, assign } from 'xstate';
import type { SongContext, SongEvent } from '../types';

// Extended context for Porto and MetaMask Smart Account support
interface ExtendedSongContext extends SongContext {
  isPortoWallet?: boolean;
  portoSessionId?: string;
  portoSessionKey?: string;
  isMetaMaskSmartAccount?: boolean;
  metaMaskSessionId?: string;
  metaMaskSessionKey?: string;
  useV030Contract?: boolean; // Use new contract for session wallets
}

export const songMachineV2 = createMachine({
  types: {} as {
    context: ExtendedSongContext;
    events: SongEvent | 
      { type: 'PORTO_DETECTED'; isPorto: boolean } |
      { type: 'METAMASK_SMART_ACCOUNT_DETECTED'; isSmartAccount: boolean };
  },
  id: 'song',
  initial: 'detectingWallet',
  context: ({ input }: { input?: { songId: number; userAddress?: string; songDuration?: number } }) => ({
    songId: input?.songId || 0,
    userAddress: input?.userAddress,
    songDuration: input?.songDuration,
    isPortoWallet: false,
    isMetaMaskSmartAccount: false,
    useV030Contract: false,
  }),
  on: {
    UPDATE_ADDRESS: {
      actions: assign({
        userAddress: ({ event }) => event.address,
      }),
    },
    PORTO_DETECTED: {
      actions: assign({
        isPortoWallet: ({ event }) => event.isPorto,
        useV030Contract: ({ event }) => event.isPorto, // Use V0.3.0 for Porto
      }),
    },
    METAMASK_SMART_ACCOUNT_DETECTED: {
      actions: assign({
        isMetaMaskSmartAccount: ({ event }) => event.isSmartAccount,
        useV030Contract: ({ event }) => event.isSmartAccount, // Use V0.3.0 for MetaMask SA
      }),
    },
  },
  states: {
    detectingWallet: {
      description: 'Detecting wallet capabilities',
      invoke: [
        {
          id: 'detectPorto',
          src: 'checkPortoConnection',
          onDone: {
            actions: assign({
              isPortoWallet: ({ event }) => event.output,
              useV030Contract: ({ event, context }) => event.output || context.useV030Contract,
            }),
          },
          onError: {
            // Continue without Porto
          },
        },
        {
          id: 'detectMetaMask',
          src: 'checkMetaMaskSmartAccount',
          onDone: {
            actions: assign({
              isMetaMaskSmartAccount: ({ event }) => event.output,
              useV030Contract: ({ event, context }) => event.output || context.useV030Contract,
            }),
          },
          onError: {
            // Continue without MetaMask SA
          },
        },
      ],
      after: {
        1000: 'idle', // Move to idle after 1 second regardless
      },
    },

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
        PURCHASE: [
          {
            target: 'purchasingWithPortoSession',
            guard: ({ context }) => {
              console.log('🔍 Checking Porto guard:', { isPortoWallet: context.isPortoWallet });
              return context.isPortoWallet === true;
            },
          },
          {
            target: 'purchasingWithMetaMaskSession',
            guard: ({ context }) => {
              console.log('🔍 Checking MetaMask guard:', { 
                isMetaMaskSmartAccount: context.isMetaMaskSmartAccount,
                contextType: typeof context.isMetaMaskSmartAccount,
                context: context 
              });
              return context.isMetaMaskSmartAccount === true;
            },
          },
          {
            target: 'purchasingWithPermit',
          },
        ],
      },
    },

    canUnlock: {
      description: 'User has credits available - show unlock button',
      on: {
        UNLOCK: [
          {
            target: 'unlockingWithPortoSession',
            guard: ({ context }) => context.isPortoWallet === true,
          },
          {
            target: 'unlocking',
          },
        ],
      },
    },

    // Porto-specific purchase flow (bundled with session)
    purchasingWithPortoSession: {
      description: 'Purchasing with Porto bundled transaction + session',
      invoke: {
        id: 'purchaseWithPortoSession',
        src: 'purchaseWithPortoSession',
        input: ({ context }) => ({
          ...context,
          isNewUser: !context.credits || context.credits === 0,
        }),
        onDone: {
          target: 'purchased.portoSessionActive',
          actions: assign({
            tokenId: ({ event }) => event.output.transactionHash,
            portoSessionId: ({ event }) => event.output.sessionId,
            portoSessionKey: ({ event }) => event.output.sessionKeyAddress,
          }),
        },
        onError: {
          target: 'error',
          actions: assign({
            error: ({ event }) => event.error instanceof Error ? event.error.message : String(event.error),
          }),
        },
      },
    },

    // MetaMask Smart Account purchase flow (bundled with session)
    purchasingWithMetaMaskSession: {
      description: 'Purchasing with MetaMask bundled transaction + session',
      invoke: {
        id: 'purchaseWithMetaMaskSession',
        src: 'purchaseWithMetaMaskSession',
        input: ({ context }) => ({
          ...context,
          isNewUser: !context.credits || context.credits === 0,
        }),
        onDone: {
          target: 'purchased.metaMaskSessionActive',
          actions: assign({
            tokenId: ({ event }) => event.output.transactionHash,
            metaMaskSessionId: ({ event }) => event.output.sessionId,
            metaMaskSessionKey: ({ event }) => event.output.sessionKeyAddress,
          }),
        },
        onError: {
          target: 'error',
          actions: assign({
            error: ({ event }) => event.error instanceof Error ? event.error.message : String(event.error),
          }),
        },
      },
    },

    // Porto-specific unlock flow (with session initialization)
    unlockingWithPortoSession: {
      description: 'Unlocking with Porto and initializing session',
      invoke: {
        id: 'unlockWithPortoSession',
        src: 'initializePortoSession',
        input: ({ context }) => context,
        onDone: {
          target: 'purchased.portoSessionActive',
          actions: assign({
            tokenId: ({ event }) => event.output.transactionHash,
            portoSessionId: ({ event }) => event.output.sessionId,
            portoSessionKey: ({ event }) => event.output.sessionKey,
          }),
        },
        onError: {
          target: 'error',
          actions: assign({
            error: ({ event }) => event.error instanceof Error ? event.error.message : String(event.error),
          }),
        },
      },
    },

    // Standard purchase flow (existing)
    purchasingWithPermit: {
      description: 'Purchasing using EIP-2612 permit signature',
      invoke: {
        id: 'purchaseWithPermit',
        src: 'purchaseAndUnlockWithPermit',
        input: ({ context }) => context,
        onDone: {
          target: 'purchased',
          actions: assign({
            tokenId: ({ event }) => event.output.tokenId,
          }),
        },
        onError: {
          target: 'error',
          actions: assign({
            error: ({ event }) => event.error instanceof Error ? event.error.message : String(event.error),
          }),
        },
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
          target: 'error',
          actions: assign({
            error: ({ event }) => event.error instanceof Error ? event.error.message : String(event.error),
          }),
        },
      },
    },

    purchased: {
      description: 'Song purchased - accessing content',
      initial: 'checkingCache',
      states: {
        checkingCache: {
          description: 'Checking local cache for MIDI data',
          invoke: {
            id: 'checkCache',
            src: 'checkCache',
            input: ({ context }) => context,
            onDone: [
              {
                target: 'ready',
                guard: ({ event }) => !!event.output.midiData,
                actions: assign({
                  midiData: ({ event }) => event.output.midiData,
                  audioUrl: ({ event }) => event.output.audioUrl,
                  lyricsUrl: ({ event }) => event.output.lyricsUrl,
                }),
              },
              {
                target: 'needsDownload',
                actions: assign({
                  encryptedCid: ({ event }) => event.output?.encryptedCid,
                }),
              },
            ],
            onError: {
              target: 'needsDownload',
            },
          },
        },

        // Porto session active state
        portoSessionActive: {
          description: 'Porto session is active - ready for gasless karaoke',
          on: {
            START_KARAOKE: 'karaokeWithPortoSession',
            END_SESSION: 'finalizingPortoSession',
          },
        },

        // MetaMask session active state
        metaMaskSessionActive: {
          description: 'MetaMask session is active - ready for gasless karaoke',
          on: {
            START_KARAOKE: 'karaokeWithMetaMaskSession',
            END_SESSION: 'finalizingMetaMaskSession',
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
              description: 'Caching decrypted MIDI data',
              invoke: {
                id: 'cacheMidi',
                src: 'cacheMidi',
                input: ({ context }) => context,
                onDone: {
                  target: '#song.purchased.ready',
                },
                onError: {
                  // Even if caching fails, we have the data
                  target: '#song.purchased.ready',
                },
              },
            },
          },
        },
        
        ready: {
          description: 'Ready to play - all content loaded',
          on: {
            START_KARAOKE: [
              {
                target: 'karaokeWithPortoSession',
                guard: ({ context }) => !!context.portoSessionId,
              },
              {
                target: 'karaokeWithMetaMaskSession',
                guard: ({ context }) => !!context.metaMaskSessionId,
              },
              {
                // If user has MetaMask Smart Account but no session, initialize one
                target: 'initializingMetaMaskSession',
                guard: ({ context }) => {
                  const shouldInitialize = context.isMetaMaskSmartAccount === true && !context.metaMaskSessionId;
                  console.log('🔍 Checking if should initialize MetaMask session:', {
                    isMetaMaskSmartAccount: context.isMetaMaskSmartAccount,
                    hasMetaMaskSessionId: !!context.metaMaskSessionId,
                    shouldInitialize
                  });
                  return shouldInitialize;
                },
              },
              {
                target: 'preparingKaraoke',
              },
            ],
          },
        },

        // Initialize MetaMask session for users who already own the song
        initializingMetaMaskSession: {
          description: 'Initializing MetaMask session for gasless karaoke',
          invoke: {
            id: 'initializeMetaMaskSession',
            src: 'initializeMetaMaskSessionForKaraoke',
            input: ({ context }) => context,
            onDone: {
              target: 'karaokeWithMetaMaskSession',
              actions: assign({
                metaMaskSessionId: ({ event }) => event.output.sessionId,
                metaMaskSessionKey: ({ event }) => event.output.sessionKeyAddress,
              }),
            },
            onError: {
              target: 'ready',
              actions: assign({
                error: ({ event }) => {
                  const errorMsg = event.error instanceof Error ? event.error.message : String(event.error);
                  console.error('❌ MetaMask session initialization failed:', errorMsg);
                  return errorMsg;
                },
              }),
            },
          },
        },

        // Gasless karaoke with Porto session
        karaokeWithPortoSession: {
          description: 'Starting karaoke with Porto session (no credit check needed!)',
          initial: 'fetchingLyrics',
          states: {
            fetchingLyrics: {
              invoke: {
                id: 'fetchLyrics',
                src: 'fetchLyrics',
                input: ({ context }) => context,
                onDone: {
                  target: 'ready',
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
            ready: {
              on: {
                START_KARAOKE: '#song.karaoke',
                CANCEL: '#song.purchased.ready',
              },
            },
          },
        },

        // Gasless karaoke with MetaMask session
        karaokeWithMetaMaskSession: {
          description: 'Starting karaoke with MetaMask session (no credit check needed!)',
          initial: 'fetchingLyrics',
          states: {
            fetchingLyrics: {
              invoke: {
                id: 'fetchLyrics',
                src: 'fetchLyrics',
                input: ({ context }) => context,
                onDone: {
                  // Automatically start karaoke after fetching lyrics
                  target: '#song.karaoke',
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
          },
        },

        // Standard karaoke flow (existing)
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
                sessionId: () => crypto.randomUUID(),
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
                    error: ({ event }) => event.error instanceof Error ? event.error.message : String(event.error),
                  }),
                },
              },
            },
            deductingCredits: {
              invoke: {
                id: 'deductCredits',
                src: 'deductVoiceCredits',
                input: ({ context }) => ({
                  ...context,
                  isMetaMaskSmartAccount: context.isMetaMaskSmartAccount,
                  metaMaskSessionId: context.metaMaskSessionId,
                }),
                onDone: {
                  target: 'ready',
                },
                onError: {
                  target: '#song.purchased.ready',
                  actions: assign({
                    error: ({ event }) => event.error instanceof Error ? event.error.message : String(event.error),
                  }),
                },
              },
            },
            ready: {
              on: {
                START_KARAOKE: '#song.karaoke',
                CANCEL: '#song.purchased.ready',
              },
            },
          },
        },

        finalizingPortoSession: {
          description: 'Finalizing Porto session',
          invoke: {
            id: 'finalizePortoSession',
            src: 'finalizePortoSession',
            onDone: {
              target: 'ready',
              actions: assign({
                portoSessionId: () => undefined,
                portoSessionKey: () => undefined,
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

        finalizingMetaMaskSession: {
          description: 'Finalizing MetaMask session',
          invoke: {
            id: 'finalizeMetaMaskSession',
            src: 'finalizeMetaMaskSession',
            input: ({ context }) => ({
              sessionId: context.metaMaskSessionId,
              songId: context.songId
            }),
            onDone: {
              target: 'ready',
              actions: assign({
                metaMaskSessionId: () => undefined,
                metaMaskSessionKey: () => undefined,
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

    purchasingVoiceCredits: {
      description: 'Purchasing voice credits',
      invoke: {
        id: 'purchaseVoiceCredits',
        src: 'purchaseVoiceCreditsWithPermit',
        input: ({ context }) => context,
        onDone: {
          target: 'purchased.checkingVoiceCredits',
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
      description: 'Purchasing combo pack',
      invoke: {
        id: 'purchaseComboPack',
        src: 'purchaseComboPackWithPermit',
        input: ({ context }) => context,
        onDone: {
          target: 'purchased.checkingVoiceCredits',
        },
        onError: {
          target: 'purchased.ready',
          actions: assign({
            error: ({ event }) => event.error instanceof Error ? event.error.message : String(event.error),
          }),
        },
      },
    },

    karaoke: {
      description: 'Karaoke in progress',
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
          // Porto-specific
          portoSessionId: context.portoSessionId,
          portoSessionKey: context.portoSessionKey,
          // MetaMask-specific
          metaMaskSessionId: context.metaMaskSessionId,
          metaMaskSessionKey: context.metaMaskSessionKey,
        }),
        onDone: {
          target: 'purchased.ready',
          actions: assign({
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
        END_KARAOKE: [
          {
            target: 'purchased.finalizingPortoSession',
            guard: ({ context }) => !!context.portoSessionId,
          },
          {
            target: 'purchased.finalizingMetaMaskSession',
            guard: ({ context }) => !!context.metaMaskSessionId,
          },
          {
            target: 'purchased.ready',
          },
        ],
        ERROR: {
          target: 'purchased.ready',
          actions: assign({
            error: ({ event }) => event.error,
          }),
        },
      },
    },

    error: {
      description: 'Error state',
      on: {
        RETRY: 'idle',
      },
    },
  },
});

// Guards
export const songGuardsV2 = {
  hasAccess: ({ event }: any) => event.output?.hasAccess === true,
  canUnlock: ({ event }: any) => event.output?.canUnlock === true,
  hasValidSession: ({ event }: any) => event.output !== null,
};