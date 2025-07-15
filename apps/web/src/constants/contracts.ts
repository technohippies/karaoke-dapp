// Contract addresses
// IMPORTANT: This MUST match the KARAOKE_CONTRACT in .env used for encryption
export const KARAOKE_CONTRACT_ADDRESS = '0x047eCeBC1C289b26210CDdc6a0BB343a2C984F5d' as const
export const USDC_ADDRESS = '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as const // Base Sepolia USDC

// PKP Details
export const PKP_PUBLIC_KEY = '0x042b303dcbe8d32e655ee2b82834e4a53055e731a6bd7d2be7c1ff8d688a68f93446e1cf88fcff81cf7682171f3d29c74d4911a0d24de9d502dc7dee3f8be9fe41' as const
export const PKP_ADDRESS = '0xe7674fe5EAfdDb2590462E58B821DcD17052F76D' as const

// Contract ABIs for Lit Protocol
export const HAS_UNLOCKED_SONG_ABI = {
  type: 'function',
  name: 'hasUnlockedSong',
  inputs: [
    { name: '', type: 'address', internalType: 'address' },
    { name: '', type: 'uint256', internalType: 'uint256' }
  ],
  outputs: [
    { name: '', type: 'bool', internalType: 'bool' }
  ],
  stateMutability: 'view'
} as const