import { BASE_SEPOLIA_CHAIN_ID, BASE_MAINNET_CHAIN_ID, OPTIMISM_SEPOLIA_CHAIN_ID } from '../constants/networks';

export interface NetworkConfig {
  chainId: number;
  name: string;
  rpcUrl: string;
  contracts: {
    karaoke: string;
    usdc: string;
  };
  tableland: {
    chainId: number;
    songsTable: string;
  };
  explorer: string;
  isTestnet: boolean;
}

// Get environment variables with defaults
const DEFAULT_CHAIN_ID = import.meta.env.VITE_DEFAULT_CHAIN_ID 
  ? parseInt(import.meta.env.VITE_DEFAULT_CHAIN_ID) 
  : BASE_SEPOLIA_CHAIN_ID;

const NETWORK_NAME = import.meta.env.VITE_NETWORK_NAME || 'base-sepolia';


// Network configurations
export const NETWORKS: Record<string, NetworkConfig> = {
  'optimism-sepolia': {
    chainId: OPTIMISM_SEPOLIA_CHAIN_ID,
    name: 'Optimism Sepolia',
    rpcUrl: 'https://sepolia.optimism.io',
    contracts: {
      karaoke: import.meta.env.VITE_KARAOKE_CONTRACT || '',
      usdc: import.meta.env.VITE_OPTIMISM_SEPOLIA_USDC_ADDRESS || '0x5fd84259d66Cd46123540766Be93DFE6D43130D7',
    },
    tableland: {
      chainId: OPTIMISM_SEPOLIA_CHAIN_ID,
      songsTable: import.meta.env.VITE_SONGS_TABLE_NAME || 'karaoke_songs_11155420_11155420_181',
    },
    explorer: 'https://sepolia-optimism.etherscan.io',
    isTestnet: true,
  },
  'base-sepolia': {
    chainId: BASE_SEPOLIA_CHAIN_ID,
    name: 'Base Sepolia',
    rpcUrl: 'https://sepolia.base.org',
    contracts: {
      karaoke: import.meta.env.VITE_KARAOKE_CONTRACT || '',
      usdc: import.meta.env.VITE_BASE_SEPOLIA_USDC_ADDRESS || '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    },
    tableland: {
      // Split setup: Tableland on Optimism Sepolia even when contract is on Base Sepolia
      chainId: OPTIMISM_SEPOLIA_CHAIN_ID,
      songsTable: import.meta.env.VITE_SONGS_TABLE_NAME || '',
    },
    explorer: 'https://sepolia.basescan.org',
    isTestnet: true,
  },
  'base-mainnet': {
    chainId: BASE_MAINNET_CHAIN_ID,
    name: 'Base',
    rpcUrl: 'https://mainnet.base.org',
    contracts: {
      karaoke: import.meta.env.VITE_KARAOKE_CONTRACT || '',
      usdc: import.meta.env.VITE_BASE_MAINNET_USDC_ADDRESS || '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    },
    tableland: {
      chainId: BASE_MAINNET_CHAIN_ID,
      songsTable: import.meta.env.VITE_SONGS_TABLE_NAME || '',
    },
    explorer: 'https://basescan.org',
    isTestnet: false,
  },
};

// Debug logging
console.log('🔧 networks.config - Environment variables:', {
  VITE_DEFAULT_CHAIN_ID: import.meta.env.VITE_DEFAULT_CHAIN_ID,
  VITE_NETWORK_NAME: import.meta.env.VITE_NETWORK_NAME,
  VITE_KARAOKE_CONTRACT: import.meta.env.VITE_KARAOKE_CONTRACT,
  VITE_BASE_SEPOLIA_USDC_ADDRESS: import.meta.env.VITE_BASE_SEPOLIA_USDC_ADDRESS,
});

// Export the current network configuration
export const currentNetwork = NETWORKS[NETWORK_NAME] || NETWORKS['base-sepolia'];

console.log('🔧 networks.config - Current network:', {
  name: NETWORK_NAME,
  network: currentNetwork,
  karaokeContract: currentNetwork.contracts.karaoke,
  usdcAddress: currentNetwork.contracts.usdc,
});

// Export convenience helpers
export const isProduction = !currentNetwork.isTestnet;
export const defaultChainId = DEFAULT_CHAIN_ID;
export const tablelandChainId = currentNetwork.tableland.chainId;
export const songsTableName = currentNetwork.tableland.songsTable;

// Helper to get network config by chain ID
export function getNetworkByChainId(chainId: number): NetworkConfig | undefined {
  return Object.values(NETWORKS).find(network => network.chainId === chainId);
}

// Helper to check if a chain ID is supported
export function isSupportedChain(chainId: number): boolean {
  return Object.values(NETWORKS).some(network => network.chainId === chainId);
}