export const KaraokeStoreABI = [
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