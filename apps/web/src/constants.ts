// Contract addresses - Using V5 only
export const KARAOKE_STORE_V5_ADDRESS = '0x91B69AC1Ac63C7CB850214d52b2f3d890FED557e' as const
export const USDC_ADDRESS = '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as const // Base Sepolia USDC

// Contract ABI - Inline the essential parts
export const KARAOKE_STORE_V5_ABI = [
  {
    name: 'buyCombo',
    type: 'function',
    inputs: [],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    name: 'getUserCredits',
    type: 'function',
    inputs: [
      { name: 'user', type: 'address', internalType: 'address' }
    ],
    outputs: [
      { name: 'voice', type: 'uint256', internalType: 'uint256' },
      { name: 'song', type: 'uint256', internalType: 'uint256' }
    ],
    stateMutability: 'view'
  },
  {
    name: 'getActiveSession',
    type: 'function',
    inputs: [
      { name: 'user', type: 'address', internalType: 'address' }
    ],
    outputs: [
      { name: 'hasSession', type: 'bool', internalType: 'bool' },
      { name: 'sessionHash', type: 'bytes32', internalType: 'bytes32' },
      { name: 'amount', type: 'uint256', internalType: 'uint256' },
      { name: 'songId', type: 'uint256', internalType: 'uint256' }
    ],
    stateMutability: 'view'
  },
  {
    name: 'hasUnlockedSong',
    type: 'function',
    inputs: [
      { name: 'user', type: 'address', internalType: 'address' },
      { name: 'songId', type: 'uint256', internalType: 'uint256' }
    ],
    outputs: [
      { name: '', type: 'bool', internalType: 'bool' }
    ],
    stateMutability: 'view'
  },
  {
    name: 'unlockSong',
    type: 'function',
    inputs: [
      { name: 'songId', type: 'uint256', internalType: 'uint256' }
    ],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    name: 'startSession',
    type: 'function',
    inputs: [
      { name: 'songId', type: 'uint256', internalType: 'uint256' },
      { name: 'amount', type: 'uint256', internalType: 'uint256' }
    ],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    name: 'endSessionWithSignature',
    type: 'function',
    inputs: [
      { name: 'creditsUsed', type: 'uint256', internalType: 'uint256' },
      { name: 'score', type: 'uint256', internalType: 'uint256' },
      { name: 'nonce', type: 'uint256', internalType: 'uint256' },
      { name: 'pkpSignature', type: 'bytes', internalType: 'bytes' }
    ],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    name: 'SessionStarted',
    type: 'event',
    inputs: [
      { name: 'user', type: 'address', indexed: true, internalType: 'address' },
      { name: 'songId', type: 'uint256', indexed: false, internalType: 'uint256' },
      { name: 'amount', type: 'uint256', indexed: false, internalType: 'uint256' },
      { name: 'sessionHash', type: 'bytes32', indexed: false, internalType: 'bytes32' }
    ]
  }
] as const

// USDC ABI (minimal - just what we need)
export const USDC_ABI = [
  {
    name: 'approve',
    type: 'function',
    inputs: [
      { name: 'spender', type: 'address', internalType: 'address' },
      { name: 'amount', type: 'uint256', internalType: 'uint256' }
    ],
    outputs: [{ name: '', type: 'bool', internalType: 'bool' }],
    stateMutability: 'nonpayable'
  },
  {
    name: 'allowance',
    type: 'function',
    inputs: [
      { name: 'owner', type: 'address', internalType: 'address' },
      { name: 'spender', type: 'address', internalType: 'address' }
    ],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view'
  },
  {
    name: 'balanceOf',
    type: 'function',
    inputs: [
      { name: 'account', type: 'address', internalType: 'address' }
    ],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view'
  }
] as const

// Prices
export const COMBO_PRICE = 3_000_000n // 3 USDC (6 decimals)

// Lit Protocol Configuration
export const LIT_NETWORK = 'datil'
export const LIT_RPC_URL = 'https://sepolia.base.org' // Using public Base Sepolia RPC

// PKP Details (newly minted with current Lit Action permission)
export const PKP_PUBLIC_KEY = '0x042e2a2a872e757014fa06c99cac4c5dd8744cb1040e00efc1a45046714bcb9d2b7ef762577f7ee2714cfc8d89925d524271b754c90916ff6e42eb2046d3de885b'
export const PKP_ADDRESS = '0x223Dd2dc484187ACa659A571ee7E75f163A8dfa4'
export const LIT_ACTION_CID = 'QmdwiuVVcY7GV22ez7CBvZpsCj2hhK6PGj2H8PLKeSzLh4' // Current with signAndCombineEcdsa