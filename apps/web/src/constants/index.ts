// Re-export all constants from modular files
export * from './contracts'
export * from './pricing'
export * from './litProtocol'
export * from './networks'

// Import and re-export ABIs
import { SIMPLE_KARAOKE_ABI } from '../contracts/abis/SimpleKaraoke'
import { USDCABI } from '../contracts/abis/USDC'

export const KARAOKE_ABI = SIMPLE_KARAOKE_ABI
export const USDC_ABI = USDCABI