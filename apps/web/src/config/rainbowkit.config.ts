import '@rainbow-me/rainbowkit/styles.css';
import { connectorsForWallets } from '@rainbow-me/rainbowkit';
import {
  metaMaskWallet,
  coinbaseWallet,
  rainbowWallet,
  injectedWallet,
} from '@rainbow-me/rainbowkit/wallets';
import { createJoyIdWallet } from '@joyid/rainbowkit';
import { createConfig, http } from 'wagmi';
import { base, baseSepolia, optimismSepolia } from 'wagmi/chains';

// Get RPC URLs from environment variables
const baseSepoliaRpcUrl = import.meta.env.VITE_BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org';

// Determine JoyID URL based on network (testnet for Base Sepolia, mainnet for Base)
const isTestnet = import.meta.env.VITE_DEFAULT_CHAIN_ID === '84532'; // Base Sepolia chain ID
const joyidAppURL = isTestnet ? 'https://testnet.joyid.dev' : 'https://app.joy.id';

// Create JoyID wallet
const joyidWallet = createJoyIdWallet({
  name: 'Karaoke Quest',
  logo: 'https://fav.farm/🎤',
  joyidAppURL,
});

// Configure connectors without WalletConnect
const connectors = connectorsForWallets(
  [
    {
      groupName: 'Recommended',
      wallets: [
        joyidWallet,
        injectedWallet,
        metaMaskWallet,
        coinbaseWallet,
        rainbowWallet,
      ],
    },
  ],
  {
    appName: 'Karaoke Quest',
    projectId: 'dummy', // Required but won't be used since we're not using WalletConnect
  }
);

export const rainbowConfig = createConfig({
  connectors,
  chains: [base, baseSepolia, optimismSepolia],
  transports: {
    [base.id]: http('https://mainnet.base.org'),
    [baseSepolia.id]: http(baseSepoliaRpcUrl),
    [optimismSepolia.id]: http('https://sepolia.optimism.io'),
  },
});