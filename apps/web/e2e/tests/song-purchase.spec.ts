import { testWithSynpress } from '@synthetixio/synpress'
import { MetaMask, metaMaskFixtures } from '@synthetixio/synpress/playwright'
import connectedSetup from '../wallet-setup/connected.setup'

const test = testWithSynpress(metaMaskFixtures(connectedSetup))
const { expect } = test

test.describe('Song Unlock and Karaoke Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
  })

  test('should complete full karaoke flow: purchase credits, unlock song, decrypt content, and start karaoke', async ({
    context,
    page,
    metamaskPage,
    extensionId,
  }) => {
    const metamask = new MetaMask(
      context,
      metamaskPage,
      connectedSetup.walletPassword,
      extensionId
    )

    // Step 1: Navigate to a song
    const songCard = page.locator('[data-testid="song-card"]').first()
    await songCard.click()
    await page.waitForURL(/\/s\/\d+/)
    
    // Step 2: Check if user needs credits
    const buyCreditsButton = page.getByRole('button', { name: /Buy Credits/i })
    if (await buyCreditsButton.isVisible()) {
      await buyCreditsButton.click()
      await page.waitForURL('/pricing')
      
      // Purchase combo pack (includes both song and voice credits)
      const comboPackButton = page.getByRole('button', { name: /Combo Pack/i })
      await comboPackButton.click()
      
      // Handle USDC approval if needed
      const approveButton = page.getByRole('button', { name: /Approve/i })
      if (await approveButton.isVisible()) {
        await approveButton.click()
        
        // Signature 1: USDC Approval
        await metamask.confirmTransaction()
        await expect(page.getByText(/Approved/i)).toBeVisible({ timeout: 30000 })
      }
      
      // Click purchase button
      const purchaseButton = page.getByRole('button', { name: /Purchase/i })
      await purchaseButton.click()
      
      // Signature 2: Purchase Transaction
      await metamask.confirmTransaction()
      await expect(page.getByText(/Purchase successful/i)).toBeVisible({ timeout: 30000 })
      
      // Navigate back to song
      await page.goBack()
    }
    
    // Step 3: Unlock the song if needed
    const unlockButton = page.getByRole('button', { name: /Unlock/i })
    if (await unlockButton.isVisible()) {
      await unlockButton.click()
      
      // Signature 3: Unlock Song Transaction
      await metamask.confirmTransaction()
      await expect(page.getByText(/Song unlocked/i)).toBeVisible({ timeout: 30000 })
    }
    
    // Step 4: Wait for content decryption
    // The app will request Lit Protocol session signatures
    
    // Signature 4: Lit Protocol Session for Decryption (SIWE)
    // This happens automatically but we wait for the sign button if it appears
    const signInButton = page.getByRole('button', { name: /Sign.*message/i })
    if (await signInButton.isVisible({ timeout: 5000 })) {
      await signInButton.click()
      await metamask.signSimpleMessage()
    }
    
    // Wait for content to load (lyrics and MIDI)
    await expect(page.locator('[data-testid="lyrics-display"]')).toBeVisible({ timeout: 30000 })
    
    // Step 5: Start karaoke
    const startKaraokeButton = page.getByRole('button', { name: /Start Karaoke/i })
    await startKaraokeButton.click()
    
    // Signature 5: Start Karaoke Transaction (deducts voice credits)
    await metamask.confirmTransaction()
    
    // Grant microphone permission if requested
    // Note: This is handled by browser, not testable with standard Playwright
    
    // Wait for karaoke session to start
    await expect(page.locator('[data-testid="karaoke-countdown"]')).toBeVisible({ timeout: 10000 })
    
    // Verify karaoke is running
    await expect(page.locator('[data-testid="karaoke-session"]')).toBeVisible()
  })

  test('should handle already unlocked song', async ({ page }) => {
    // Navigate to a previously unlocked song
    await page.goto('/s/1') // Assuming song 1 was unlocked in previous test
    await page.waitForLoadState('networkidle')
    
    // Should not see unlock button
    await expect(page.getByRole('button', { name: /Unlock/i })).not.toBeVisible()
    
    // Should see start karaoke button directly
    await expect(page.getByRole('button', { name: /Start Karaoke/i })).toBeVisible()
  })
})