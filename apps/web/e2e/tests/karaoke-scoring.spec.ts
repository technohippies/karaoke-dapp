import { testWithSynpress } from '@synthetixio/synpress'
import { MetaMask, metaMaskFixtures } from '@synthetixio/synpress/playwright'
import connectedSetup from '../wallet-setup/connected.setup'

const test = testWithSynpress(metaMaskFixtures(connectedSetup))
const { expect } = test

test.describe('Karaoke Scoring Flow', () => {
  // This test assumes the song is already unlocked and user has voice credits
  test('should complete karaoke and receive score', async ({
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

    // Navigate to an unlocked song
    await page.goto('/s/1')
    await page.waitForLoadState('networkidle')

    // Start karaoke
    const startKaraokeButton = page.getByRole('button', { name: /Start Karaoke/i })
    await startKaraokeButton.click()

    // Confirm transaction to deduct voice credits
    await metamask.confirmTransaction()

    // Wait for countdown
    await expect(page.locator('[data-testid="karaoke-countdown"]')).toBeVisible()
    
    // Wait for countdown to finish and karaoke to start
    await page.waitForTimeout(4000) // 3 second countdown + buffer

    // Verify karaoke is playing
    await expect(page.locator('[data-testid="karaoke-progress"]')).toBeVisible()

    // For testing, we'll skip to the end or wait for a short song
    // In real scenario, the song would play through
    
    // Wait for karaoke to complete (this would be the full song duration)
    // For testing, we might need to mock or use a very short test song
    await page.waitForSelector('[data-testid="karaoke-complete"]', { timeout: 180000 })

    // After completion, the app will process the score
    // This requires another Lit Protocol signature
    
    // Signature 6: Lit Protocol Scoring Session (SIWE)
    const scoringSignButton = page.getByRole('button', { name: /Sign.*scoring/i })
    if (await scoringSignButton.isVisible({ timeout: 5000 })) {
      await scoringSignButton.click()
      await metamask.signSimpleMessage()
    }

    // Wait for score to be calculated
    await expect(page.locator('[data-testid="karaoke-score"]')).toBeVisible({ timeout: 30000 })

    // Verify score is displayed
    const scoreElement = page.locator('[data-testid="karaoke-score"]')
    const scoreText = await scoreElement.textContent()
    expect(scoreText).toMatch(/\d+/) // Should contain a number

    // Verify options to retry or go back
    await expect(page.getByRole('button', { name: /Try Again/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Back to Songs/i })).toBeVisible()
  })

  test('should save score to leaderboard', async ({ page }) => {
    // After completing a karaoke session, check if score appears in leaderboard
    await page.goto('/') // Home page often has leaderboard
    await page.waitForLoadState('networkidle')

    // Look for leaderboard section
    const leaderboard = page.locator('[data-testid="leaderboard"]')
    if (await leaderboard.isVisible()) {
      // Verify user's score appears
      const userScore = page.locator('[data-testid="user-score"]')
      await expect(userScore).toBeVisible()
    }
  })
})