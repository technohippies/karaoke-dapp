// Contract addresses - Using V6 with batch grade support
export const KARAOKE_STORE_V5_ADDRESS = '0xF801A7F254386EC15225860C9b454461da0F8713' as const // V0.6.0 deployed 2025-07-13
export const USDC_ADDRESS = '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as const // Base Sepolia USDC

// Contract ABI - Inline the essential parts
export const KARAOKE_STORE_V5_ABI = [
  {
    name: 'buyCombopack',
    type: 'function',
    inputs: [],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    name: 'voiceCredits',
    type: 'function',
    inputs: [
      { name: '', type: 'address', internalType: 'address' }
    ],
    outputs: [
      { name: '', type: 'uint256', internalType: 'uint256' }
    ],
    stateMutability: 'view'
  },
  {
    name: 'songCredits',
    type: 'function',
    inputs: [
      { name: '', type: 'address', internalType: 'address' }
    ],
    outputs: [
      { name: '', type: 'uint256', internalType: 'uint256' }
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
      { name: 'songId', type: 'uint256', internalType: 'uint256' },
      { name: 'encryptedContentHash', type: 'bytes32', internalType: 'bytes32' }
    ],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    name: 'initializeSessionWithDelegation',
    type: 'function',
    inputs: [
      { name: 'songId', type: 'uint256', internalType: 'uint256' },
      { name: 'sessionKey', type: 'address', internalType: 'address' },
      { name: 'maxCredits', type: 'uint256', internalType: 'uint256' },
      { name: 'delegationDuration', type: 'uint256', internalType: 'uint256' }
    ],
    outputs: [],
    stateMutability: 'payable'
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
    name: 'endSessionWithBatchSignatures',
    type: 'function',
    inputs: [
      { name: 'sessionId', type: 'bytes32', internalType: 'bytes32' },
      { name: 'grades', type: 'tuple[]', internalType: 'struct LineGrade[]',
        components: [
          { name: 'lineIndex', type: 'uint256', internalType: 'uint256' },
          { name: 'accuracy', type: 'uint256', internalType: 'uint256' },
          { name: 'creditsUsed', type: 'uint256', internalType: 'uint256' }
        ]
      },
      { name: 'signatures', type: 'bytes[]', internalType: 'bytes[]' }
    ],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    name: 'pkpAddress',
    type: 'function',
    inputs: [],
    outputs: [{ name: '', type: 'address', internalType: 'address' }],
    stateMutability: 'view'
  },
  {
    name: 'setPkpAddress',
    type: 'function',
    inputs: [
      { name: '_pkpAddress', type: 'address', internalType: 'address' }
    ],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    name: 'owner',
    type: 'function',
    inputs: [],
    outputs: [{ name: '', type: 'address', internalType: 'address' }],
    stateMutability: 'view'
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
  },
  {
    name: 'activeUserSession',
    type: 'function',
    inputs: [
      { name: '', type: 'address', internalType: 'address' }
    ],
    outputs: [
      { name: '', type: 'bytes32', internalType: 'bytes32' }
    ],
    stateMutability: 'view'
  },
  {
    name: 'sessions',
    type: 'function',
    inputs: [
      { name: '', type: 'bytes32', internalType: 'bytes32' }
    ],
    outputs: [
      { name: 'user', type: 'address', internalType: 'address' },
      { name: 'songId', type: 'uint256', internalType: 'uint256' },
      { name: 'escrowAmount', type: 'uint256', internalType: 'uint256' },
      { name: 'creditsUsed', type: 'uint256', internalType: 'uint256' },
      { name: 'linesProcessed', type: 'uint256', internalType: 'uint256' },
      { name: 'startTime', type: 'uint256', internalType: 'uint256' },
      { name: 'finalized', type: 'bool', internalType: 'bool' }
    ],
    stateMutability: 'view'
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

// PKP Details (final working version with raw JavaScript upload)
export const PKP_PUBLIC_KEY = '0x042b303dcbe8d32e655ee2b82834e4a53055e731a6bd7d2be7c1ff8d688a68f93446e1cf88fcff81cf7682171f3d29c74d4911a0d24de9d502dc7dee3f8be9fe41'
export const PKP_ADDRESS = '0xe7674fe5EAfdDb2590462E58B821DcD17052F76D'
export const LIT_ACTION_CID = 'QmUzzsqGWftEnJd85mGiiKcH7j2cDeeNpEbcBzjdyhQtKb' // Raw JavaScript with Ethereum signed message prefix