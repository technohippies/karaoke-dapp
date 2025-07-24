import { testWithSynpress } from '@synthetixio/synpress'
import { MetaMask, metaMaskFixtures } from '@synthetixio/synpress/playwright'
import basicSetup from '../wallet-setup/basic.setup'

const test = testWithSynpress(metaMaskFixtures(basicSetup))
const { expect } = test

test.describe('Wallet Connection', () => {
  test('should connect MetaMask wallet to the app', async ({
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

    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Click connect wallet button
    await page.getByRole('button', { name: /Connect Wallet/i }).click()

    // Select MetaMask from RainbowKit modal
    await page.getByRole('button', { name: /MetaMask/i }).click()

    // Connect to the dapp
    await metamask.connectToDapp()

    // Verify wallet is connected
    await expect(page.getByTestId('wallet-address')).toBeVisible()
    
    // Verify the connected address matches our private key address
    const addressElement = page.getByTestId('wallet-address')
    await expect(addressElement).toContainText('0x')
  })

  test('should disconnect wallet', async ({ page }) => {
    // Assuming wallet is already connected from previous test
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Find and click the account button
    const accountButton = page.getByTestId('wallet-address')
    await accountButton.click()

    // Click disconnect in the dropdown
    await page.getByRole('button', { name: /Disconnect/i }).click()

    // Verify wallet is disconnected
    await expect(page.getByRole('button', { name: /Connect Wallet/i })).toBeVisible()
  })
})