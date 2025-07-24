import { testWithSynpress } from '@synthetixio/synpress'
import { MetaMask, metaMaskFixtures } from '@synthetixio/synpress/playwright'
import basicSetup from '../wallet-setup/basic.setup'
import connectedSetup from '../wallet-setup/connected.setup'

// Create test instances with different wallet setups
export const testWithBasicWallet = testWithSynpress(metaMaskFixtures(basicSetup))
export const testWithConnectedWallet = testWithSynpress(metaMaskFixtures(connectedSetup))

// Helper to create MetaMask instance
export function createMetaMaskInstance(
  context: any,
  metamaskPage: any,
  walletSetup: typeof basicSetup | typeof connectedSetup,
  extensionId: string
) {
  return new MetaMask(
    context,
    metamaskPage,
    walletSetup.walletPassword,
    extensionId
  )
}