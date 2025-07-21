// Network and RPC configurations
export const LIT_RPC_URL = import.meta.env.VITE_DEFAULT_CHAIN_ID === '8453' 
  ? 'https://mainnet.base.org' 
  : 'https://sepolia.base.org' as const

// Chain IDs
export const BASE_SEPOLIA_CHAIN_ID = 84532
export const BASE_MAINNET_CHAIN_ID = 8453
export const OPTIMISM_SEPOLIA_CHAIN_ID = 11155420

// Default chain for the app
export const DEFAULT_CHAIN_ID = Number(import.meta.env.VITE_DEFAULT_CHAIN_ID) || BASE_SEPOLIA_CHAIN_ID