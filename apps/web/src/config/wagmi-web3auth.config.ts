import { createConfig, http } from 'wagmi'
import { base, baseSepolia, optimismSepolia } from 'wagmi/chains'

export const web3AuthWagmiConfig = createConfig({
  chains: [base, baseSepolia, optimismSepolia],
  transports: {
    [base.id]: http('https://mainnet.base.org'),
    [baseSepolia.id]: http('https://sepolia.base.org'),
    [optimismSepolia.id]: http('https://sepolia.optimism.io'),
  },
})