import { defineWalletSetup } from '@synthetixio/synpress'
import { MetaMask } from '@synthetixio/synpress/playwright'

// Test wallet configuration
const SEED_PHRASE = 'test test test test test test test test test test test junk'
const PASSWORD = 'Tester@1234'

export default defineWalletSetup(PASSWORD, async (context, walletPage) => {
  // Create a new MetaMask instance
  const metamask = new MetaMask(context, walletPage, PASSWORD)

  // Import the wallet using the seed phrase
  await metamask.importWallet(SEED_PHRASE)

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

  // The test wallet address for this seed phrase is:
  // 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
})