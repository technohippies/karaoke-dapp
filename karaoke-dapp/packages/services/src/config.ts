/**
 * Configuration for Lit Protocol services
 */

// PKP Configuration from environment
export const PKP_CONFIG = {
  publicKey: process.env.LIT_PKP_PUBLIC_KEY || '',
  ethAddress: process.env.LIT_PKP_ETH_ADDRESS || '',
} as const;

// Lit Action CIDs
export const LIT_ACTION_CIDS = {
  voiceGrader: 'QmTgQGR33ETR79Ab5VFwzEYiHCCVjDQFozqYkdTwLnS4nb',
  finalGrader: 'QmYjyQA4tE1iHD5nSeZPoHuhxTWWFvqFJpa9oDHVVUQVmK',
  sessionSettlement: 'QmRHZLRQThj9oq4bgMRupjvwQUH4iVyFweHp1WGdYc25oy',
} as const;

// Network configuration
export const LIT_CONFIG = {
  network: process.env.LIT_NETWORK || 'datil-test',
} as const;