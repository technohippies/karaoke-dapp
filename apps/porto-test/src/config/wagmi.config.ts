import { createConfig, http } from 'wagmi'
import { base, baseSepolia } from 'wagmi/chains'
import { porto } from 'porto/wagmi'

// Log Porto connector creation
console.log('Creating Porto connector...')
const portoConnector = porto({
  // Default dialog mode - uses iframe at id.porto.sh
  // Optional: specify fee token
  // feeToken: 'USDC',
})
console.log('Porto connector created:', portoConnector)

export const config = createConfig({
  chains: [base, baseSepolia],
  connectors: [portoConnector],
  transports: {
    [base.id]: http(),
    [baseSepolia.id]: http(),
  },
})

console.log('Wagmi config created:', config)