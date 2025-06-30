import { testWithSynpress } from '@synthetixio/synpress'
import { MetaMask, metaMaskFixtures } from '@synthetixio/synpress/playwright'
import fundedSetup from './wallet-setup/funded.setup'

const test = testWithSynpress(metaMaskFixtures(fundedSetup))
const { expect } = test

// We now have a funded wallet with Base Sepolia ETH
test.describe('Purchase Flow', () => {
  // Run tests in serial to avoid wallet conflicts
  test.describe.configure({ mode: 'serial' });
  test('should complete song purchase', async ({
    context,
    page,
    metamaskPage,
    extensionId,
  }) => {
    const metamask = new MetaMask(
      context,
      metamaskPage,
      fundedSetup.walletPassword,
      extensionId
    )

    // Navigate to song
    await page.goto('/s/1/lorde-royals')
    
    // Connect wallet first
    await page.locator('button:has-text("Connect Wallet to Purchase")').click()
    await page.locator('button:has-text("MetaMask")').click()
    await metamask.connectToDapp()
    
    // Wait for purchase button
    await page.waitForTimeout(1000)
    await expect(page.locator('.fixed.bottom-0 button').first()).toContainText('Purchase')
    
    // Click purchase - this opens the purchase sheet
    await page.locator('.fixed.bottom-0 button').first().click()
    
    // Wait for the purchase sheet to open
    await page.waitForSelector('text="Purchase Track"')
    
    // Click the purchase button in the sheet
    await page.locator('button:has-text("Purchase")').last().click()
    
    // Wait a moment for the transaction to be initiated
    await page.waitForTimeout(2000)
    
    // We need to handle multiple transactions:
    // 1. USDC approval (if first time)
    // 2. Credit pack purchase
    // 3. Song unlock
    
    // First transaction - might be USDC approval or credit purchase
    console.log('Confirming first transaction...')
    await metamask.confirmTransaction()
    
    // Wait for first transaction to complete
    await page.waitForTimeout(5000)
    
    // Check if we need a second transaction (credit pack purchase after approval)
    try {
      console.log('Checking for second transaction...')
      await page.waitForTimeout(3000)
      await metamask.confirmTransaction()
      
      // Wait for second transaction
      await page.waitForTimeout(5000)
      
      // Check for third transaction (song unlock)
      try {
        console.log('Checking for third transaction...')
        await page.waitForTimeout(3000)
        await metamask.confirmTransaction()
      } catch {
        console.log('No third transaction needed')
      }
    } catch {
      console.log('No second transaction needed (might already have credits)')
    }
    
    // Wait for purchase to complete
    // First check if there's an error
    const errorElement = page.locator('.text-red-400')
    try {
      await errorElement.waitFor({ state: 'visible', timeout: 5000 })
      const errorText = await errorElement.textContent()
      console.error('Purchase failed with error:', errorText)
    } catch {
      // No error visible
    }
    
    await expect(page.locator('.fixed.bottom-0 button').first()).toContainText('Download', {
      timeout: 60000 // Give more time for potential double transaction
    })
  })

  test('should handle transaction rejection', async ({
    context,
    page,
    metamaskPage,
    extensionId,
  }) => {
    const metamask = new MetaMask(
      context,
      metamaskPage,
      fundedSetup.walletPassword,
      extensionId
    )

    await page.goto('/s/1/lorde-royals')
    await page.locator('button:has-text("Connect Wallet to Purchase")').click()
    await page.locator('button:has-text("MetaMask")').click()
    await metamask.connectToDapp()
    
    await page.waitForTimeout(1000)
    await page.locator('.fixed.bottom-0 button').first().click()
    
    // Wait for the purchase sheet to open
    await page.waitForSelector('text="Purchase Track"')
    
    // Click the purchase button in the sheet
    await page.locator('button:has-text("Purchase")').last().click()
    
    // Wait for MetaMask popup
    await page.waitForTimeout(2000)
    
    // Reject the transaction
    await metamask.rejectTransaction()
    
    // Should show error message
    await expect(page.getByText(/transaction cancelled|rejected/i)).toBeVisible({ timeout: 5000 })
    
    // Should still show purchase button (not downloaded)
    await expect(page.locator('.fixed.bottom-0 button').first()).toContainText('Purchase')
  })
})