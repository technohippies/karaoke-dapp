/**
 * Configuration for Lit Protocol services
 */

// PKP Configuration from environment
export const PKP_CONFIG = {
  publicKey: '0x043a1a467808b48e40b0b4da67f75f15b09fe50c294f8aa664b70e51d16e76f973d30be74f3346f7f1ae551da35e93dae7cf5a8eb1ad5b7e3b443421cc078dc519',
  ethAddress: '0xE2000B0ce17f260c1f3068e424Edf73b0e5052BA',
} as const;

// Lit Action CIDs
export const LIT_ACTION_CIDS = {
  voiceGrader: 'QmTgQGR33ETR79Ab5VFwzEYiHCCVjDQFozqYkdTwLnS4nb',
  finalGrader: 'QmYjyQA4tE1iHD5nSeZPoHuhxTWWFvqFJpa9oDHVVUQVmK',
  sessionSettlement: 'QmPbYMT1qdSk14MXiejzpRNyDjw6vyrURfzYrNfHbZjVEG',
} as const;

// Network configuration
export const LIT_CONFIG = {
  network: process.env.LIT_NETWORK || 'datil-test',
} as const;