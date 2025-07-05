export const MusicStoreV2ABI = [
  {
    "inputs": [
      { "internalType": "address", "name": "_usdcAddress", "type": "address" },
      { "internalType": "address", "name": "_litPkpAddress", "type": "address" }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [],
    "name": "CREDITS_PER_PACK",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "SONG_PACK_PRICE",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "VOICE_PACK_PRICE",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "VOICE_CREDITS_PER_PACK",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "buyCreditPack",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "deadline", "type": "uint256" },
      { "internalType": "uint8", "name": "v", "type": "uint8" },
      { "internalType": "bytes32", "name": "r", "type": "bytes32" },
      { "internalType": "bytes32", "name": "s", "type": "bytes32" }
    ],
    "name": "buyCreditPackWithPermit",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "buyVoicePack",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "deadline", "type": "uint256" },
      { "internalType": "uint8", "name": "v", "type": "uint8" },
      { "internalType": "bytes32", "name": "r", "type": "bytes32" },
      { "internalType": "bytes32", "name": "s", "type": "bytes32" }
    ],
    "name": "buyVoicePackWithPermit",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "buyCombopack",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "deadline", "type": "uint256" },
      { "internalType": "uint8", "name": "v", "type": "uint8" },
      { "internalType": "bytes32", "name": "r", "type": "bytes32" },
      { "internalType": "bytes32", "name": "s", "type": "bytes32" }
    ],
    "name": "buyComboPackWithPermit",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getComboPackPrice",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "pure",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "user", "type": "address" },
      { "internalType": "uint256", "name": "songId", "type": "uint256" }
    ],
    "name": "checkAccess",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "user", "type": "address" },
      { "internalType": "uint256[]", "name": "songIds", "type": "uint256[]" }
    ],
    "name": "checkMultipleAccess",
    "outputs": [{ "internalType": "bool[]", "name": "", "type": "bool[]" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "user", "type": "address" }],
    "name": "getCredits",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "user", "type": "address" }],
    "name": "getVoiceCredits",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "bytes32", "name": "sessionId", "type": "bytes32" }],
    "name": "isSessionSettled",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "user", "type": "address" },
      { "internalType": "bytes32", "name": "sessionId", "type": "bytes32" },
      { "internalType": "uint256", "name": "creditsUsed", "type": "uint256" },
      { "internalType": "bytes", "name": "litSignature", "type": "bytes" }
    ],
    "name": "settleVoiceSession",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "songId", "type": "uint256" }],
    "name": "unlockSong",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "buyer", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "credits", "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "paid", "type": "uint256" }
    ],
    "name": "CreditsPurchased",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "user", "type": "address" },
      { "indexed": true, "internalType": "uint256", "name": "songId", "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "creditsRemaining", "type": "uint256" }
    ],
    "name": "SongUnlocked",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "buyer", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "paid", "type": "uint256" }
    ],
    "name": "VoicePackPurchased",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "buyer", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "credits", "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "paid", "type": "uint256" }
    ],
    "name": "VoiceCreditsAdded",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "user", "type": "address" },
      { "indexed": true, "internalType": "bytes32", "name": "sessionId", "type": "bytes32" },
      { "indexed": false, "internalType": "uint256", "name": "creditsUsed", "type": "uint256" }
    ],
    "name": "VoiceSessionSettled",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "buyer", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "songCredits", "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "voiceCredits", "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "totalPaid", "type": "uint256" }
    ],
    "name": "ComboPackPurchased",
    "type": "event"
  }
] as const;

export const CONTRACTS = {
  baseSepolia: {
    musicStore: '0xfb593e79CDFd4F1d8c9F1f0d6Ff75623bba42728', // KaraokeStore_V0_3_0 with Porto sessions
    karaokeStoreV030: '0xfb593e79CDFd4F1d8c9F1f0d6Ff75623bba42728', // KaraokeStore_V0_3_0 with Porto sessions
    usdc: '0x036CbD53842c5426634e7929541eC2318f3dCF7e', // Base Sepolia USDC
  },
} as const;

// KaraokeStore V0.3.0 ABI with Porto session support
export const KaraokeStoreV030ABI = [
  // Purchase functions with permit
  {
    name: 'buyComboPackWithPermit',
    type: 'function',
    inputs: [
      { name: 'deadline', type: 'uint256' },
      { name: 'v', type: 'uint8' },
      { name: 'r', type: 'bytes32' },
      { name: 's', type: 'bytes32' }
    ],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    name: 'buySongPackWithPermit',
    type: 'function',
    inputs: [
      { name: 'deadline', type: 'uint256' },
      { name: 'v', type: 'uint8' },
      { name: 'r', type: 'bytes32' },
      { name: 's', type: 'bytes32' }
    ],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    name: 'buyVoicePackWithPermit',
    type: 'function',
    inputs: [
      { name: 'deadline', type: 'uint256' },
      { name: 'v', type: 'uint8' },
      { name: 'r', type: 'bytes32' },
      { name: 's', type: 'bytes32' }
    ],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  
  // Song access
  {
    name: 'unlockSong',
    type: 'function',
    inputs: [{ name: 'songId', type: 'uint256' }],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    name: 'checkAccess',
    type: 'function',
    inputs: [
      { name: 'user', type: 'address' },
      { name: 'songId', type: 'uint256' }
    ],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view'
  },
  
  // Session management
  {
    name: 'initializeSession',
    type: 'function',
    inputs: [
      { name: 'songId', type: 'uint256' },
      { name: 'sessionKey', type: 'address' },
      { name: 'maxCredits', type: 'uint256' }
    ],
    outputs: [{ name: 'sessionId', type: 'bytes32' }],
    stateMutability: 'nonpayable'
  },
  {
    name: 'processKaraokeLine',
    type: 'function',
    inputs: [
      { name: 'sessionId', type: 'bytes32' },
      { name: 'lineIndex', type: 'uint256' },
      { name: 'accuracy', type: 'uint256' },
      { name: 'creditsForLine', type: 'uint256' },
      { name: 'pkpSignature', type: 'bytes' }
    ],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    name: 'finalizeSession',
    type: 'function',
    inputs: [{ name: 'sessionId', type: 'bytes32' }],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    name: 'getSession',
    type: 'function',
    inputs: [{ name: 'sessionId', type: 'bytes32' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'user', type: 'address' },
          { name: 'songId', type: 'uint256' },
          { name: 'sessionKey', type: 'address' },
          { name: 'startTime', type: 'uint256' },
          { name: 'maxCredits', type: 'uint256' },
          { name: 'creditsUsed', type: 'uint256' },
          { name: 'linesProcessed', type: 'uint256' },
          { name: 'finalized', type: 'bool' }
        ]
      }
    ],
    stateMutability: 'view'
  },
  
  // Credit queries
  {
    name: 'getCredits',
    type: 'function',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view'
  },
  {
    name: 'getVoiceCredits',
    type: 'function',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view'
  },
  
  // Events
  {
    name: 'SessionStarted',
    type: 'event',
    inputs: [
      { indexed: true, name: 'sessionId', type: 'bytes32' },
      { indexed: true, name: 'user', type: 'address' },
      { indexed: true, name: 'songId', type: 'uint256' },
      { indexed: false, name: 'sessionKey', type: 'address' }
    ]
  },
  {
    name: 'LineProcessed',
    type: 'event',
    inputs: [
      { indexed: true, name: 'sessionId', type: 'bytes32' },
      { indexed: false, name: 'lineIndex', type: 'uint256' },
      { indexed: false, name: 'accuracy', type: 'uint256' },
      { indexed: false, name: 'creditsUsed', type: 'uint256' }
    ]
  },
  {
    name: 'SessionFinalized',
    type: 'event',
    inputs: [
      { indexed: true, name: 'sessionId', type: 'bytes32' },
      { indexed: false, name: 'totalCreditsUsed', type: 'uint256' },
      { indexed: false, name: 'totalLines', type: 'uint256' }
    ]
  }
] as const;