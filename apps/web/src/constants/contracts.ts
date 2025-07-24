import { currentNetwork } from '../config/networks.config'

// Contract addresses
// IMPORTANT: This MUST match the KARAOKE_CONTRACT in .env used for encryption
export const KARAOKE_CONTRACT_ADDRESS = currentNetwork.contracts.karaoke as `0x${string}`

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