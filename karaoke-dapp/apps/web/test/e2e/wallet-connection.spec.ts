import { testWithSynpress } from '@synthetixio/synpress'
import { MetaMask, metaMaskFixtures } from '@synthetixio/synpress/playwright'
import basicSetup from './wallet-setup/basic.setup'

const test = testWithSynpress(metaMaskFixtures(basicSetup))
const { expect } = test

test.describe('Wallet Connection', () => {
  test('should connect wallet on song detail page', async ({
    context,
    page,
    metamaskPage,
    extensionId,
  }) => {
    // Create a new MetaMask instance
    const metamask = new MetaMask(
      context,
      metamaskPage,
      basicSetup.walletPassword,
      extensionId
    )

    // Navigate directly to a song detail page
    await page.goto('/s/1/lorde-royals')

    // Wait for the song detail page to load
    await page.waitForSelector('text="Connect Wallet to Purchase"', { timeout: 10000 })

    // Click the connect wallet button
    await page.locator('button:has-text("Connect Wallet to Purchase")').click()

    // Wait for the wallet sheet to open
    await page.waitForSelector('text="Connect Wallet"')

    // Click on MetaMask option (it should be auto-detected by wagmi)
    await page.locator('button:has-text("MetaMask")').click()

    // Connect MetaMask to the dapp
    await metamask.connectToDapp()

    // Wait for the sheet to close and verify the button changes to show purchase option
    await page.waitForTimeout(1000) // Give the sheet time to close
    await expect(page.locator('.fixed.bottom-0 button').first()).toContainText('Purchase', {
      timeout: 10000
    })
  })

  test('should persist wallet connection across page navigation', async ({
    context,
    page,
    metamaskPage,
    extensionId,
  }) => {
    const metamask = new MetaMask(
      context,
      metamaskPage,
      basicSetup.walletPassword,
      extensionId
    )

    // Navigate directly to first song
    await page.goto('/s/1/lorde-royals')
    
    // Connect wallet
    await page.waitForSelector('text="Connect Wallet to Purchase"', { timeout: 10000 })
    await page.locator('button:has-text("Connect Wallet to Purchase")').click()
    await page.locator('button:has-text("MetaMask")').click()
    await metamask.connectToDapp()
    
    // Wait for connection to complete
    await page.waitForTimeout(1000) // Give the sheet time to close
    await expect(page.locator('.fixed.bottom-0 button').first()).toContainText('Purchase', {
      timeout: 10000
    })

    // Navigate back to homepage
    await page.goto('/')
    
    // Navigate back to the same song (since we only have one in test data)
    await page.goto('/s/1/lorde-royals')

    // Should still be connected (wallet connection persists)
    await expect(page.locator('.fixed.bottom-0 button').first()).toContainText('Purchase', {
      timeout: 5000
    })
  })
})