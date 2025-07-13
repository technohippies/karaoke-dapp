import { http, createConfig, createStorage } from 'wagmi'
import { baseSepolia } from 'wagmi/chains'
import { injected } from 'wagmi/connectors'

// Wagmi configuration for Base Sepolia
export const wagmiConfig = createConfig({
  chains: [baseSepolia],
  connectors: [
    injected(), // MetaMask and other browser wallets
  ],
  storage: createStorage({ storage: localStorage }),
  transports: {
    [baseSepolia.id]: http(),
  },
})