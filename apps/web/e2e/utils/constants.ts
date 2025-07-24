// Test URLs
export const BASE_URL = 'http://localhost:3000'

// Test timeouts
export const TRANSACTION_TIMEOUT = 60000 // 60 seconds
export const SIGNATURE_TIMEOUT = 30000 // 30 seconds
export const CONTENT_LOAD_TIMEOUT = 30000 // 30 seconds

// Test song IDs (make sure these exist in your test data)
export const TEST_SONGS = {
  FREE_SONG: 1, // If you have any free songs
  PAID_SONG: 2,
  SHORT_SONG: 3, // For quicker karaoke tests
}

// Credit amounts from smart contract
export const CREDIT_COSTS = {
  SONG_UNLOCK: 1,
  KARAOKE_SESSION: 30,
}

// Package prices (in USDC)
export const PACKAGE_PRICES = {
  SONG_PACK: 7, // 10 songs
  VOICE_PACK: 7, // 300 voice credits  
  COMBO_PACK: 10, // 10 songs + 300 voice credits
}

// Expected wallet address from the private key in .env
// This is derived from PRIVATE_KEY=9e0edd10367b5a980347ffcbf15548ce4ab2912d1c78d7535f417528fae6433c
export const TEST_WALLET_ADDRESS = '0x8C9c3F5B86E83F3C03e909dC46b5C599Cb0AF89C'

// Network configuration
export const BASE_CHAIN_ID = 8453
export const BASE_RPC_URL = 'https://mainnet.base.org'