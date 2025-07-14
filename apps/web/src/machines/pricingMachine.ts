import { setup, assign } from 'xstate'

export interface PricingContext {
  // User state
  isFirstPurchase: boolean
  hasWallet: boolean
  hasUsdcBalance: boolean
  usdcBalance: string
  hasAllowance: boolean
  
  // Pricing
  selectedType: 'combo' | 'voice' | 'song' | null
  comboPrice: number
  voiceCreditsPrice: number
  songCreditsPrice: number
  
  // Transaction state
  txHash: string | null
  error: string | null
}

export type PricingEvent = 
  | { type: 'WALLET_CONNECTED'; hasAllowance: boolean; balance: string; isFirstPurchase: boolean }
  | { type: 'WALLET_DISCONNECTED' }
  | { type: 'SELECT_COMBO' }
  | { type: 'SELECT_VOICE_CREDITS' }
  | { type: 'SELECT_SONG_CREDITS' }
  | { type: 'APPROVE_USDC' }
  | { type: 'PURCHASE' }
  | { type: 'TRANSACTION_SUBMITTED'; hash: string }
  | { type: 'TRANSACTION_SUCCESS' }
  | { type: 'TRANSACTION_ERROR'; error: string }
  | { type: 'CLEAR_ERROR' }
  | { type: 'RESET' }

export const pricingMachine = setup({
  types: {
    context: {} as PricingContext,
    events: {} as PricingEvent,
  },
  actions: {
    setWalletConnected: assign({
      hasWallet: true,
      hasUsdcBalance: ({ event }) => {
        if (event.type === 'WALLET_CONNECTED') {
          return parseFloat(event.balance) >= 3.0
        }
        return false
      },
      usdcBalance: ({ event }) => {
        if (event.type === 'WALLET_CONNECTED') {
          return event.balance
        }
        return '0.00'
      },
      hasAllowance: ({ event }) => {
        if (event.type === 'WALLET_CONNECTED') {
          return event.hasAllowance
        }
        return false
      },
      isFirstPurchase: ({ event }) => {
        if (event.type === 'WALLET_CONNECTED') {
          return event.isFirstPurchase
        }
        return true
      },
      selectedType: ({ event }) => {
        // Auto-select combo for first-time users
        if (event.type === 'WALLET_CONNECTED' && event.isFirstPurchase) {
          return 'combo'
        }
        return null
      }
    }),
    
    setWalletDisconnected: assign({
      hasWallet: false,
      hasUsdcBalance: false,
      usdcBalance: '0.00',
      hasAllowance: false,
      selectedType: null,
      error: null,
      txHash: null
    }),
    
    selectCombo: assign({
      selectedType: 'combo'
    }),
    
    selectVoiceCredits: assign({
      selectedType: 'voice'
    }),
    
    selectSongCredits: assign({
      selectedType: 'song'
    }),
    
    setTransaction: assign({
      txHash: ({ event }) => {
        if (event.type === 'TRANSACTION_SUBMITTED') {
          return event.hash
        }
        return null
      }
    }),
    
    setError: assign({
      error: ({ event }) => {
        if (event.type === 'TRANSACTION_ERROR') {
          return event.error
        }
        return null
      }
    }),
    
    clearError: assign({
      error: null
    }),
    
    clearTransaction: assign({
      txHash: null
    }),
    
    reset: assign({
      selectedType: null,
      error: null,
      txHash: null
    })
  },
  
  guards: {
    hasWallet: ({ context }) => context.hasWallet,
    needsApproval: ({ context }) => !context.hasAllowance,
    hasInsufficientBalance: ({ context }) => !context.hasUsdcBalance,
    isComboSelected: ({ context }) => context.selectedType === 'combo',
    isFirstPurchase: ({ context }) => context.isFirstPurchase,
    hasPlanSelected: ({ context }) => context.selectedType !== null
  }
}).createMachine({
  id: 'pricingMachine',
  initial: 'disconnected',
  context: {
    isFirstPurchase: true,
    hasWallet: false,
    hasUsdcBalance: false,
    usdcBalance: '0.00',
    hasAllowance: false,
    selectedType: null,
    comboPrice: 3.0,
    voiceCreditsPrice: 1.0,
    songCreditsPrice: 2.0,
    txHash: null,
    error: null
  },
  
  states: {
    disconnected: {
      on: {
        WALLET_CONNECTED: {
          target: 'selectingPlan',
          actions: 'setWalletConnected'
        }
      }
    },
    
    selectingPlan: {
      on: {
        SELECT_COMBO: {
          actions: 'selectCombo'
        },
        SELECT_VOICE_CREDITS: {
          actions: 'selectVoiceCredits'
        },
        SELECT_SONG_CREDITS: {
          actions: 'selectSongCredits'
        },
        PURCHASE: [
          {
            target: 'needsApproval',
            guard: 'needsApproval'
          },
          {
            target: 'insufficientBalance',
            guard: 'hasInsufficientBalance'
          },
          {
            target: 'purchasing',
            guard: 'hasPlanSelected'
          }
        ],
        WALLET_DISCONNECTED: {
          target: 'disconnected',
          actions: 'setWalletDisconnected'
        },
        CLEAR_ERROR: {
          actions: 'clearError'
        }
      }
    },
    
    needsApproval: {
      on: {
        APPROVE_USDC: {
          target: 'approving'
        },
        WALLET_DISCONNECTED: {
          target: 'disconnected',
          actions: 'setWalletDisconnected'
        }
      }
    },
    
    approving: {
      on: {
        TRANSACTION_SUBMITTED: {
          actions: 'setTransaction'
        },
        TRANSACTION_SUCCESS: {
          target: 'selectingPlan',
          actions: ['clearTransaction', ({ self }) => {
            // Update allowance and try purchase again
            self.send({ type: 'WALLET_CONNECTED', hasAllowance: true, balance: '3.00', isFirstPurchase: true })
          }]
        },
        TRANSACTION_ERROR: {
          target: 'needsApproval',
          actions: ['setError', 'clearTransaction']
        }
      }
    },
    
    insufficientBalance: {
      on: {
        WALLET_DISCONNECTED: {
          target: 'disconnected',
          actions: 'setWalletDisconnected'
        },
        RESET: {
          target: 'selectingPlan',
          actions: 'reset'
        }
      }
    },
    
    purchasing: {
      on: {
        TRANSACTION_SUBMITTED: {
          actions: 'setTransaction'
        },
        TRANSACTION_SUCCESS: {
          target: 'success',
          actions: 'clearTransaction'
        },
        TRANSACTION_ERROR: {
          target: 'selectingPlan',
          actions: ['setError', 'clearTransaction']
        }
      }
    },
    
    success: {
      on: {
        RESET: {
          target: 'selectingPlan',
          actions: 'reset'
        },
        WALLET_DISCONNECTED: {
          target: 'disconnected',
          actions: 'setWalletDisconnected'
        }
      }
    }
  }
})