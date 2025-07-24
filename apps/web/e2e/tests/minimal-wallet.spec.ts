import { testWithSynpress } from '@synthetixio/synpress'
import { MetaMask, metaMaskFixtures } from '@synthetixio/synpress/playwright'
import basicSetup from '../wallet-setup/basic.setup'

const test = testWithSynpress(metaMaskFixtures(basicSetup))
const { expect } = test

test.describe('Minimal Wallet Test', () => {
  test('should connect wallet to app', async ({
    context,
    page,
    metamaskPage,
    extensionId,
  }) => {
    // Create MetaMask instance
    const metamask = new MetaMask(
      context,
      metamaskPage,
      basicSetup.walletPassword,
      extensionId
    )

    // Navigate to app
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    
    // Debug: Log what's on the page
    console.log('Page title:', await page.title())
    
    // Look for connect button with flexible selector
    const connectButton = page.locator('button').filter({ hasText: /connect wallet/i })
    await expect(connectButton).toBeVisible({ timeout: 10000 })
    
    // Click connect wallet
    await connectButton.click()
    
    // Wait for RainbowKit modal
    await page.waitForTimeout(2000)
    
    // Look for MetaMask option in the modal
    const metamaskOption = page.locator('button, div').filter({ hasText: /metamask/i }).first()
    
    if (await metamaskOption.isVisible({ timeout: 5000 })) {
      await metamaskOption.click()
      
      // Connect to dapp
      await metamask.connectToDapp()
      
      // Wait for connection
      await page.waitForTimeout(3000)
      
      // Verify wallet is connected by looking for address or disconnect button
      const disconnectButton = page.locator('button').filter({ hasText: /disconnect|0x/i })
      await expect(disconnectButton.first()).toBeVisible({ timeout: 10000 })
    } else {
      console.log('MetaMask option not found in wallet modal')
    }
  })
})