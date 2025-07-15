/**
 * Centralized Contract Configuration
 * 
 * This file is the single source of truth for contract addresses.
 * It ensures consistency between encryption scripts and the web app.
 * 
 * IMPORTANT: Always use this configuration for any contract-related operations.
 */

import { config } from 'dotenv'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

// Load environment variables
const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: join(__dirname, '..', '.env') })

// Validate required environment variables
if (!process.env.KARAOKE_CONTRACT) {
  throw new Error('KARAOKE_CONTRACT environment variable is required in .env')
}

export const CONTRACTS = {
  // Main karaoke contract - used for all operations
  KARAOKE: process.env.KARAOKE_CONTRACT as `0x${string}`,
  
  // Chain configuration
  CHAIN_ID: 84532, // Base Sepolia
  CHAIN_NAME: 'baseSepolia' as const,
  
  // Other contracts
  USDC: '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as `0x${string}`,
} as const

// PKP Configuration
export const PKP_CONFIG = {
  PUBLIC_KEY: process.env.PKP_PUBLIC_KEY || '0x042b303dcbe8d32e655ee2b82834e4a53055e731a6bd7d2be7c1ff8d688a68f93446e1cf88fcff81cf7682171f3d29c74d4911a0d24de9d502dc7dee3f8be9fe41',
  ETH_ADDRESS: process.env.PKP_ETH_ADDRESS || '0xe7674fe5EAfdDb2590462E58B821DcD17052F76D',
  TOKEN_ID: process.env.PKP_TOKEN_ID,
} as const

// Lit Protocol Configuration
export const LIT_CONFIG = {
  NETWORK: 'datil-dev' as const, // Change to 'datil' for production
  ACTION_CID: process.env.LIT_ACTION_CID || 'QmZTr3g3QLMnteqpozbMdhoaEitZaEDY5CqMAucXyM9yfk',
  SIMPLE_V1_ACTION_CID: process.env.SIMPLE_V1_LIT_ACTION_CID || 'QmZjhnhuYzFomkbYJRj4zXDjL2LZhaR93oUk8MXPJ8s1o8',
} as const

// Validate contract addresses
function validateAddress(address: string): address is `0x${string}` {
  return /^0x[a-fA-F0-9]{40}$/.test(address)
}

if (!validateAddress(CONTRACTS.KARAOKE)) {
  throw new Error(`Invalid KARAOKE contract address: ${CONTRACTS.KARAOKE}`)
}

// Export a function to get access control conditions
export function getAccessControlConditions(songId: number) {
  return [
    {
      contractAddress: CONTRACTS.KARAOKE,
      standardContractType: '',
      chain: CONTRACTS.CHAIN_NAME,
      method: 'hasUnlockedSong',
      parameters: [':userAddress', songId.toString()],
      returnValueTest: {
        comparator: '=',
        value: 'true'
      }
    }
  ]
}

// Log configuration on import (only in development)
if (process.env.NODE_ENV !== 'production') {
  console.log('🔧 Contract Configuration Loaded:', {
    karaoke: CONTRACTS.KARAOKE,
    chain: CONTRACTS.CHAIN_NAME,
    pkp: PKP_CONFIG.ETH_ADDRESS,
  })
}