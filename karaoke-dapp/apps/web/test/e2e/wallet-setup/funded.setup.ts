import { defineWalletSetup } from '@synthetixio/synpress'
import { MetaMask } from '@synthetixio/synpress/playwright'

// Funded test wallet configuration
const SEED_PHRASE = 'test test test test test test test test test test test junk' // Required first
const PRIVATE_KEY = '0x9e0edd10367b5a980347ffcbf15548ce4ab2912d1c78d7535f417528fae6433c'
const PASSWORD = 'Tester@1234'

export default defineWalletSetup(PASSWORD, async (context, walletPage) => {
  // Create a new MetaMask instance
  const metamask = new MetaMask(context, walletPage, PASSWORD)

  // Import initial wallet (required by MetaMask)
  await metamask.importWallet(SEED_PHRASE)
  
  // Import your funded wallet from private key
  await metamask.importWalletFromPrivateKey(PRIVATE_KEY)

  // Add Base Sepolia network
  await metamask.addNetwork({
    name: 'Base Sepolia',
    rpcUrl: 'https://sepolia.base.org',
    chainId: 84532,
    symbol: 'ETH',
    blockExplorerUrl: 'https://sepolia.basescan.org'
  })

  // Switch to Base Sepolia
  await metamask.switchNetwork('Base Sepolia')

  // The funded wallet address is:
  // 0x0C6433789d14050aF47198B2751f6689731Ca79C
})