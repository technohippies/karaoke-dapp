// Re-export all constants from modular files
export * from './contracts'
export * from './pricing'
export * from './litProtocol'
export * from './networks'

// Import and re-export ABIs
import { SIMPLE_KARAOKE_ABI } from '../contracts/abis/SimpleKaraoke'
import { KARAOKE_SCHOOL_V4_ABI } from '../contracts/abis/KaraokeSchoolV4'

export const KARAOKE_ABI = SIMPLE_KARAOKE_ABI
export const KARAOKE_SCHOOL_ABI = KARAOKE_SCHOOL_V4_ABI