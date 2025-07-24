import { testWithSynpress } from '@synthetixio/synpress'
import { MetaMask, metaMaskFixtures } from '@synthetixio/synpress/playwright'
import basicSetup from '../wallet-setup/basic.setup'

const test = testWithSynpress(metaMaskFixtures(basicSetup))
const { expect } = test

test.describe('Simple Connection Test', () => {
  test('should load the app homepage', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    
    // Check that the app loaded
    await expect(page).toHaveTitle(/Karaoke/i)
    
    // Check for connect wallet button
    const connectButton = page.getByRole('button', { name: /Connect Wallet/i })
    await expect(connectButton).toBeVisible()
  })
})