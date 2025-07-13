// Contract addresses - Using V5 only
export const KARAOKE_STORE_V5_ADDRESS = '0x91B69AC1Ac63C7CB850214d52b2f3d890FED557e' as const
export const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as const // Base Sepolia USDC

// Contract ABI - Will be imported from project
export { default as KARAOKE_STORE_V5_ABI } from '../../../abi/KaraokeStoreV5.json'

// USDC ABI (minimal)
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
export const LIT_NETWORK = 'yellowstone'
export const LIT_RPC_URL = 'https://base-sepolia.infura.io/v3/YOUR_INFURA_KEY' // User needs to set this

// PKP Details (from working implementation)
export const PKP_PUBLIC_KEY = '0x04bfa97b825a6ddd87ab8e59ffa17c5f03c089c89b93eef2c91dd1c213c9e48f829c039ad4d1f1f87e1dd38502b6c58f97c5b4854c4965ad9c5737a8a2fd6b19bd'
export const PKP_ADDRESS = '0xBc2296278633Cf8946321e94E0B71912315792a4'
export const LIT_ACTION_CID = 'QmcGpHHeMxXaQBPzLgFUxWkwgkRKJoX3YY5vLf41EvitLw' // Working CID from project