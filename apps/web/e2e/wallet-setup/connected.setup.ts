import { defineWalletSetup } from '@synthetixio/synpress'
import { MetaMask, getExtensionId } from '@synthetixio/synpress/playwright'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

// Get current directory in ES module
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Read PRIVATE_KEY from root .env file
const envPath = path.resolve(__dirname, '../../../../.env')
const envContent = fs.readFileSync(envPath, 'utf-8')
const privateKeyMatch = envContent.match(/PRIVATE_KEY=(.+)/)
const PRIVATE_KEY = privateKeyMatch ? privateKeyMatch[1].trim() : ''

if (!PRIVATE_KEY) {
  throw new Error('PRIVATE_KEY not found in root .env file')
}

const SEED_PHRASE = 'test test test test test test test test test test test junk'
const PASSWORD = 'Tester@1234'

export default defineWalletSetup(PASSWORD, async (context, walletPage) => {
  // Get extension ID for popup interactions
  const extensionId = await getExtensionId(context, 'MetaMask')
  
  const metamask = new MetaMask(context, walletPage, PASSWORD, extensionId)

  // Initialize with seed phrase first
  await metamask.importWallet(SEED_PHRASE)
  
  // Import the actual private key from .env
  await metamask.importWalletFromPrivateKey(PRIVATE_KEY)
  
  // Add Base network
  await metamask.addNetwork({
    name: 'Base',
    rpcUrl: 'https://mainnet.base.org',
    chainId: 8453,
    symbol: 'ETH',
    blockExplorerUrl: 'https://basescan.org',
  })
  
  // Switch to Base network
  await metamask.switchNetwork('Base')
  
  // Handle MetaMask popups after setup
  await walletPage.waitForTimeout(2000)
  
  try {
    const whatsNewClose = walletPage.locator('section:has-text("What\'s new") [data-testid="popover-close"]')
    if (await whatsNewClose.isVisible({ timeout: 1000 })) {
      await whatsNewClose.click()
      await walletPage.waitForTimeout(500)
    }
  } catch (e) {
    // Continue if popup doesn't exist
  }
  
  try {
    const networkSwitchClose = walletPage.locator('section:has-text("You have switched") [data-testid="popover-close"]')
    if (await networkSwitchClose.isVisible({ timeout: 1000 })) {
      await networkSwitchClose.click()
      await walletPage.waitForTimeout(500)
    }
  } catch (e) {
    // Continue if popup doesn't exist
  }
})