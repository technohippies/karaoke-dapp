// Re-export all constants from modular files
export * from './contracts'
export * from './pricing'
export * from './litProtocol'
export * from './networks'

// Import and re-export ABIs
import { KaraokeStoreABI } from '../contracts/abis/KaraokeStore'
import { SIMPLE_KARAOKE_ABI } from '../contracts/abis/SimpleKaraoke'
import { USDCABI } from '../contracts/abis/USDC'

export const KARAOKE_STORE_ABI = SIMPLE_KARAOKE_ABI // Use Clean SimpleKaraoke ABI
export const USDC_ABI = USDCABI

// For backward compatibility, keep the old V5 reference but use clean ABI
export const KARAOKE_STORE_V5_ABI = SIMPLE_KARAOKE_ABI