export const SIMPLE_KARAOKE_V2_ABI = [
  {
    "type": "constructor",
    "inputs": [
      {"name": "_usdcToken", "type": "address", "internalType": "address"},
      {"name": "_pkpAddress", "type": "address", "internalType": "address"}
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "COMBO_PRICE",
    "inputs": [],
    "outputs": [{"name": "", "type": "uint256", "internalType": "uint256"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "VOICE_PACK_PRICE",
    "inputs": [],
    "outputs": [{"name": "", "type": "uint256", "internalType": "uint256"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "SONG_PACK_PRICE",
    "inputs": [],
    "outputs": [{"name": "", "type": "uint256", "internalType": "uint256"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "voiceCredits",
    "inputs": [{"name": "", "type": "address", "internalType": "address"}],
    "outputs": [{"name": "", "type": "uint256", "internalType": "uint256"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "songCredits",
    "inputs": [{"name": "", "type": "address", "internalType": "address"}],
    "outputs": [{"name": "", "type": "uint256", "internalType": "uint256"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "hasUnlockedSong",
    "inputs": [
      {"name": "", "type": "address", "internalType": "address"},
      {"name": "", "type": "uint256", "internalType": "uint256"}
    ],
    "outputs": [{"name": "", "type": "bool", "internalType": "bool"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "buyCombopack",
    "inputs": [],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "buyVoicePack",
    "inputs": [],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "buySongPack",
    "inputs": [],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "unlockSong",
    "inputs": [{"name": "songId", "type": "uint256", "internalType": "uint256"}],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "startSession",
    "inputs": [{"name": "songId", "type": "uint256", "internalType": "uint256"}],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "activeUserSession",
    "inputs": [{"name": "", "type": "address", "internalType": "address"}],
    "outputs": [{"name": "", "type": "bytes32", "internalType": "bytes32"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "sessions",
    "inputs": [{"name": "", "type": "bytes32", "internalType": "bytes32"}],
    "outputs": [
      {"name": "user", "type": "address", "internalType": "address"},
      {"name": "songId", "type": "uint256", "internalType": "uint256"},
      {"name": "escrowAmount", "type": "uint256", "internalType": "uint256"},
      {"name": "creditsUsed", "type": "uint256", "internalType": "uint256"},
      {"name": "startTime", "type": "uint256", "internalType": "uint256"},
      {"name": "finalized", "type": "bool", "internalType": "bool"}
    ],
    "stateMutability": "view"
  },
  {
    "type": "event",
    "name": "CreditsPurchased",
    "inputs": [
      {"name": "user", "type": "address", "indexed": true, "internalType": "address"},
      {"name": "voiceAmount", "type": "uint256", "indexed": false, "internalType": "uint256"},
      {"name": "songAmount", "type": "uint256", "indexed": false, "internalType": "uint256"}
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "SongUnlocked",
    "inputs": [
      {"name": "user", "type": "address", "indexed": true, "internalType": "address"},
      {"name": "songId", "type": "uint256", "indexed": true, "internalType": "uint256"}
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "SessionStarted",
    "inputs": [
      {"name": "user", "type": "address", "indexed": true, "internalType": "address"},
      {"name": "songId", "type": "uint256", "indexed": true, "internalType": "uint256"},
      {"name": "sessionHash", "type": "bytes32", "indexed": false, "internalType": "bytes32"}
    ],
    "anonymous": false
  }
] as const