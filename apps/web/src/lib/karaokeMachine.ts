import { setup, assign } from 'xstate'

// Types
export interface Song {
  id: number
  title: string
  artist: string
  duration: string
  difficulty: string
  price: number
}

export interface SessionData {
  sessionHash: string
  escrowAmount: number
  songId: number
  chainId: number
  issuedAt: number
  expiresAt: number
  userAddress: string
  signature?: string
}

export interface KaraokeContext {
  // Wallet
  address: string | null
  isConnected: boolean
  
  // Credits
  voiceCredits: number
  songCredits: number
  usdcBalance: string
  
  // Songs
  songs: Song[]
  unlockedSongs: Record<number, boolean>
  selectedSong: Song | null
  
  // Session
  hasActiveSession: boolean
  sessionData: SessionData | null
  sessionAmount: number
  sessionSongId: number
  
  // Recording
  isRecording: boolean
  audioData: Uint8Array | null
  recordingDuration: number
  
  // Grading
  gradeResult: {
    grade: number
    creditsUsed: number
    nonce: number
    signature: string
  } | null
  
  // UI State
  error: string | null
  txHash: string | null
  
  // Contract state
  hasUsdcAllowance: boolean
  
  // Loading state
  dataLoaded: boolean
}

export type KaraokeEvent = 
  | { type: 'CONNECT_WALLET' }
  | { type: 'DISCONNECT_WALLET' }
  | { type: 'WALLET_CONNECTED'; address: string }
  | { type: 'WALLET_DISCONNECTED' }
  | { type: 'CREDITS_LOADED'; voiceCredits: number; songCredits: number }
  | { type: 'USDC_BALANCE_LOADED'; balance: string }
  | { type: 'ALLOWANCE_LOADED'; hasAllowance: boolean }
  | { type: 'UNLOCK_STATUS_LOADED'; songId: number; isUnlocked: boolean }
  | { type: 'SESSION_LOADED'; hasSession: boolean; amount: number; songId: number; sessionHash?: string; userAddress?: string }
  | { type: 'APPROVE_USDC' }
  | { type: 'BUY_CREDITS' }
  | { type: 'SELECT_SONG'; song: Song }
  | { type: 'UNLOCK_SONG'; song: Song }
  | { type: 'START_SESSION' }
  | { type: 'SESSION_STARTED'; sessionData: SessionData }
  | { type: 'START_RECORDING' }
  | { type: 'STOP_RECORDING'; audioData: Uint8Array; duration: number }
  | { type: 'SUBMIT_TO_LIT' }
  | { type: 'LIT_GRADING_COMPLETE'; grade: number; creditsUsed: number; nonce: number; signature: string }
  | { type: 'END_SESSION' }
  | { type: 'TRANSACTION_SUBMITTED'; hash: string }
  | { type: 'TRANSACTION_SUCCESS' }
  | { type: 'TRANSACTION_ERROR'; error: string }
  | { type: 'ERROR'; error: string }
  | { type: 'CLEAR_ERROR' }

// Define songs data
const SONGS: Song[] = [
  { 
    id: 1, 
    title: 'Bohemian Rhapsody', 
    artist: 'Queen', 
    duration: '5:55',
    difficulty: 'Hard',
    price: 1
  },
  { 
    id: 2, 
    title: 'Don\'t Stop Believin\'', 
    artist: 'Journey', 
    duration: '4:11',
    difficulty: 'Medium',
    price: 1
  },
  { 
    id: 3, 
    title: 'Sweet Caroline', 
    artist: 'Neil Diamond', 
    duration: '3:21',
    difficulty: 'Easy',
    price: 1
  },
]

export const karaokeMachine = setup({
  types: {
    context: {} as KaraokeContext,
    events: {} as KaraokeEvent,
  },
  actions: {
    setError: assign({
      error: ({ event }) => {
        if (event.type === 'ERROR' || event.type === 'TRANSACTION_ERROR') {
          return event.error
        }
        return null
      }
    }),
    
    clearError: assign({
      error: null
    }),
    
    setWalletConnected: assign({
      isConnected: true,
      address: ({ event }) => {
        if (event.type === 'WALLET_CONNECTED') {
          return event.address
        }
        return null
      }
    }),
    
    setWalletDisconnected: assign({
      isConnected: false,
      address: null,
      // Reset all user-specific data
      voiceCredits: 0,
      songCredits: 0,
      usdcBalance: '0.00',
      unlockedSongs: {},
      selectedSong: null,
      hasActiveSession: false,
      sessionData: null,
      audioData: null,
      gradeResult: null,
    }),
    
    updateCredits: assign(({ event }) => {
      if (event.type === 'CREDITS_LOADED') {
        return {
          voiceCredits: event.voiceCredits,
          songCredits: event.songCredits,
          dataLoaded: true
        }
      }
      return {}
    }),
    
    updateUsdcBalance: assign(({ event }) => {
      if (event.type === 'USDC_BALANCE_LOADED') {
        return {
          usdcBalance: event.balance
        }
      }
      return {}
    }),
    
    updateAllowance: assign({
      hasUsdcAllowance: ({ event }) => {
        if (event.type === 'ALLOWANCE_LOADED') {
          return event.hasAllowance
        }
        return false
      }
    }),
    
    updateUnlockStatus: assign({
      unlockedSongs: ({ context, event }) => {
        if (event.type === 'UNLOCK_STATUS_LOADED') {
          return {
            ...context.unlockedSongs,
            [event.songId]: event.isUnlocked
          }
        }
        return context.unlockedSongs
      }
    }),
    
    updateSession: assign(({ event }) => {
      if (event.type === 'SESSION_LOADED') {
        return {
          hasActiveSession: event.hasSession,
          sessionAmount: event.amount,
          sessionSongId: event.songId,
          sessionData: event.sessionHash ? {
            sessionHash: event.sessionHash,
            escrowAmount: event.amount,
            songId: event.songId,
            chainId: 84532, // Base Sepolia
            issuedAt: Math.floor(Date.now() / 1000),
            expiresAt: Math.floor(Date.now() / 1000) + 3600,
            userAddress: event.userAddress || ''
          } : null
        }
      }
      return {}
    }),
    
    selectSong: assign({
      selectedSong: ({ event }) => {
        if (event.type === 'SELECT_SONG') {
          console.log('📝 Setting selectedSong to:', event.song)
          return event.song
        }
        return null
      }
    }),
    
    setSessionStarted: assign({
      sessionData: ({ event }) => {
        if (event.type === 'SESSION_STARTED') {
          return {
            ...event.sessionData,
            chainId: event.sessionData.chainId || 84532 // Ensure chainId is always present
          }
        }
        return null
      },
      hasActiveSession: true
    }),
    
    setRecordingStarted: assign({
      isRecording: true,
      audioData: null,
      recordingDuration: 0
    }),
    
    setRecordingStopped: assign({
      isRecording: false,
      audioData: ({ event }) => {
        if (event.type === 'STOP_RECORDING') {
          return event.audioData
        }
        return null
      },
      recordingDuration: ({ event }) => {
        if (event.type === 'STOP_RECORDING') {
          return event.duration
        }
        return 0
      }
    }),
    
    setGradeResult: assign({
      gradeResult: ({ event }) => {
        if (event.type === 'LIT_GRADING_COMPLETE') {
          return {
            grade: event.grade,
            creditsUsed: event.creditsUsed,
            nonce: event.nonce,
            signature: event.signature
          }
        }
        return null
      }
    }),
    
    clearSession: assign({
      hasActiveSession: false,
      sessionData: null,
      sessionAmount: 0,
      sessionSongId: 0,
      audioData: null,
      gradeResult: null,
      recordingDuration: 0
    }),
    
    setTransactionHash: assign({
      txHash: ({ event }) => {
        if (event.type === 'TRANSACTION_SUBMITTED') {
          return event.hash
        }
        return null
      }
    }),
    
    clearTransaction: assign({
      txHash: null
    }),
  },
  
  guards: {
    hasNoCredits: ({ context }) => {
      return context.voiceCredits === 0 && context.songCredits === 0
    },
    
    needsVoiceCredits: ({ context }) => {
      return context.voiceCredits < 5 && !context.hasActiveSession
    },
    
    canSelectSongs: ({ context }) => {
      return context.voiceCredits >= 5 || context.hasActiveSession
    },
    
    hasActiveSession: ({ context }) => {
      return context.hasActiveSession
    },
    
    hasSelectedSong: ({ context }) => {
      return context.selectedSong !== null
    },
    
    songIsUnlocked: ({ context, event }) => {
      if (event.type === 'SELECT_SONG') {
        const isUnlocked = context.unlockedSongs[event.song.id] === true
        console.log('🔍 Checking if song is unlocked:', {
          songId: event.song.id,
          unlockedSongs: context.unlockedSongs,
          isUnlocked
        })
        return isUnlocked
      }
      if (!context.selectedSong) return false
      return context.unlockedSongs[context.selectedSong.id] === true
    },
    
    needsUsdcApproval: ({ context }) => {
      return !context.hasUsdcAllowance
    },
    
    hasEnoughUsdc: ({ context }) => {
      const balance = parseFloat(context.usdcBalance)
      return balance >= 3.00
    },
    
    hasAudioData: ({ context }) => {
      return context.audioData !== null && context.audioData.length > 0
    },
    
    hasGradeResult: ({ context }) => {
      return context.gradeResult !== null
    }
  }
}).createMachine({
  id: 'karaokeMachine',
  initial: 'disconnected',
  context: {
    // Wallet
    address: null,
    isConnected: false,
    
    // Credits
    voiceCredits: 0,
    songCredits: 0,
    usdcBalance: '0.00',
    
    // Songs
    songs: SONGS,
    unlockedSongs: { 1: false, 2: false, 3: false },
    selectedSong: null,
    
    // Session
    hasActiveSession: false,
    sessionData: null,
    sessionAmount: 0,
    sessionSongId: 0,
    
    // Recording
    isRecording: false,
    audioData: null,
    recordingDuration: 0,
    
    // Grading
    gradeResult: null,
    
    // UI State
    error: null,
    txHash: null,
    
    // Contract state
    hasUsdcAllowance: false,
    
    // Loading state
    dataLoaded: false,
  },
  
  states: {
    disconnected: {
      on: {
        CONNECT_WALLET: {
          target: 'connecting',
        },
        WALLET_CONNECTED: {
          target: 'loadingData',
          actions: ['setWalletConnected']
        }
      }
    },
    
    connecting: {
      on: {
        WALLET_CONNECTED: {
          target: 'loadingData',
          actions: ['setWalletConnected']
        },
        ERROR: {
          target: 'disconnected',
          actions: 'setError'
        }
      }
    },
    
    loadingData: {
      on: {
        CREDITS_LOADED: {
          actions: ['updateCredits']
        },
        USDC_BALANCE_LOADED: {
          actions: ['updateUsdcBalance']
        },
        ALLOWANCE_LOADED: {
          actions: ['updateAllowance']
        },
        UNLOCK_STATUS_LOADED: {
          actions: ['updateUnlockStatus']
        },
        SESSION_LOADED: {
          actions: ['updateSession']
        },
        DISCONNECT_WALLET: {
          target: 'disconnected',
          actions: 'setWalletDisconnected'
        }
      },
      
      always: [
        {
          target: 'signup',
          guard: ({ context }) => context.dataLoaded && context.voiceCredits === 0 && context.songCredits === 0
        },
        {
          target: 'buyCredits',
          guard: ({ context }) => context.dataLoaded && context.voiceCredits < 5 && !context.hasActiveSession
        },
        {
          target: 'selectSong',
          guard: ({ context }) => context.dataLoaded && (context.voiceCredits >= 5 || context.hasActiveSession)
        }
      ]
    },
    
    signup: {
      on: {
        APPROVE_USDC: {
          target: 'approvingUsdc',
          guard: 'needsUsdcApproval'
        },
        BUY_CREDITS: {
          target: 'buyingCredits',
          guard: { type: 'needsUsdcApproval', params: {}, negate: true }
        },
        USDC_BALANCE_LOADED: {
          actions: ['updateUsdcBalance']
        },
        ALLOWANCE_LOADED: {
          actions: ['updateAllowance']
        },
        CREDITS_LOADED: {
          actions: ['updateCredits'],
          target: 'loadingData'
        },
        DISCONNECT_WALLET: {
          target: 'disconnected',
          actions: 'setWalletDisconnected'
        }
      }
    },
    
    buyCredits: {
      on: {
        APPROVE_USDC: {
          target: 'approvingUsdc',
          guard: 'needsUsdcApproval'
        },
        BUY_CREDITS: {
          target: 'buyingCredits',
          guard: { type: 'needsUsdcApproval', params: {}, negate: true }
        },
        USDC_BALANCE_LOADED: {
          actions: ['updateUsdcBalance']
        },
        ALLOWANCE_LOADED: {
          actions: ['updateAllowance']
        },
        CREDITS_LOADED: {
          actions: ['updateCredits']
        },
        DISCONNECT_WALLET: {
          target: 'disconnected',
          actions: 'setWalletDisconnected'
        }
      }
    },
    
    approvingUsdc: {
      on: {
        TRANSACTION_SUBMITTED: {
          actions: 'setTransactionHash'
        },
        TRANSACTION_SUCCESS: {
          target: 'loadingData',
          actions: 'clearTransaction'
        },
        TRANSACTION_ERROR: {
          target: 'buyCredits',
          actions: ['setError', 'clearTransaction']
        }
      }
    },
    
    buyingCredits: {
      on: {
        TRANSACTION_SUBMITTED: {
          actions: 'setTransactionHash'
        },
        TRANSACTION_SUCCESS: {
          target: 'loadingData',
          actions: 'clearTransaction'
        },
        TRANSACTION_ERROR: {
          target: 'buyCredits',
          actions: ['setError', 'clearTransaction']
        }
      }
    },
    
    selectSong: {
      on: {
        SELECT_SONG: [
          {
            guard: 'songIsUnlocked',
            actions: ['selectSong', () => console.log('🚀 Song is unlocked, transitioning to karaoke state')],
            target: 'karaoke'
          },
          {
            actions: ['selectSong', () => console.log('🔒 Song is locked, need to unlock first')],
            target: 'selectSong'
          }
        ],
        UNLOCK_SONG: {
          target: 'unlockingSong'
        },
        CREDITS_LOADED: {
          actions: 'updateCredits'
        },
        SESSION_LOADED: {
          actions: 'updateSession'
        },
        UNLOCK_STATUS_LOADED: {
          actions: ['updateUnlockStatus']
        },
        DISCONNECT_WALLET: {
          target: 'disconnected',
          actions: 'setWalletDisconnected'
        }
      }
    },
    
    unlockingSong: {
      on: {
        TRANSACTION_SUBMITTED: {
          actions: 'setTransactionHash'
        },
        TRANSACTION_SUCCESS: {
          target: 'karaoke',
          actions: ['clearTransaction']
        },
        TRANSACTION_ERROR: {
          target: 'selectSong',
          actions: ['setError', 'clearTransaction']
        }
      }
    },
    
    karaoke: {
      entry: () => console.log('🎤 Entered karaoke state'),
      initial: 'idle',
      states: {
        idle: {
          entry: () => console.log('🎤 Entered karaoke.idle state'),
          always: [
            {
              target: 'recording',
              guard: 'hasActiveSession'
            }
          ],
          on: {
            START_SESSION: {
              target: 'startingSession',
              guard: { type: 'hasActiveSession', params: {}, negate: true }
            }
          }
        },
        
        startingSession: {
          on: {
            TRANSACTION_SUBMITTED: {
              actions: 'setTransactionHash'
            },
            SESSION_STARTED: {
              target: 'recording',
              actions: ['setSessionStarted', 'clearTransaction']
            },
            TRANSACTION_ERROR: {
              target: 'idle',
              actions: ['setError', 'clearTransaction']
            }
          }
        },
        
        recording: {
          entry: () => console.log('🎙️ Entered karaoke.recording state'),
          on: {
            START_RECORDING: {
              actions: 'setRecordingStarted'
            },
            STOP_RECORDING: {
              target: 'processing',
              actions: 'setRecordingStopped'
            }
          }
        },
        
        processing: {
          entry: [
            () => console.log('📤 Entered processing state, submitting to Lit...'),
            ({ self }) => {
              // Automatically submit to Lit when we have audio data
              self.send({ type: 'SUBMIT_TO_LIT' })
            }
          ],
          on: {
            LIT_GRADING_COMPLETE: {
              target: 'graded',
              actions: 'setGradeResult'
            },
            ERROR: {
              target: 'recording',
              actions: 'setError'
            }
          }
        },
        
        graded: {
          on: {
            END_SESSION: {
              target: 'endingSession'
            }
          }
        },
        
        endingSession: {
          on: {
            TRANSACTION_SUBMITTED: {
              actions: 'setTransactionHash'
            },
            TRANSACTION_SUCCESS: {
              target: '#karaokeMachine.selectSong',
              actions: ['clearSession', 'clearTransaction']
            },
            TRANSACTION_ERROR: {
              target: 'graded',
              actions: ['setError', 'clearTransaction']
            }
          }
        }
      },
      
      on: {
        CREDITS_LOADED: {
          actions: ['updateCredits']
        },
        UNLOCK_STATUS_LOADED: {
          actions: ['updateUnlockStatus']
        },
        SESSION_LOADED: {
          actions: ['updateSession']
        },
        USDC_BALANCE_LOADED: {
          actions: ['updateUsdcBalance']
        },
        DISCONNECT_WALLET: {
          target: 'disconnected',
          actions: 'setWalletDisconnected'
        }
      },
      onError: (error) => {
        console.error('❌ Error in karaoke state:', error)
      }
    }
  }
})