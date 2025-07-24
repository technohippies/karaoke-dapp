import { test, expect } from '@playwright/test'

test.describe('App Only Tests (No Wallet)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
  })

  test('should load homepage with correct elements', async ({ page }) => {
    // Verify page loaded
    await expect(page).toHaveURL('http://localhost:3000/')
    
    // Check title contains Karaoke (in Chinese)
    const title = await page.title()
    expect(title).toContain('卡拉OK')
    
    // Check header exists
    await expect(page.locator('header')).toBeVisible()
    
    // Check connect wallet button
    const connectButton = page.locator('button', { hasText: 'Connect Wallet' })
    await expect(connectButton).toBeVisible()
    
    // Take screenshot for debugging
    await page.screenshot({ path: 'homepage-loaded.png' })
  })

  test('should show song list', async ({ page }) => {
    // Look for song links
    const royalsLink = page.getByRole('link', { name: /Royals.*Lorde/s })
    await expect(royalsLink).toBeVisible({ timeout: 10000 })
    
    const dancingQueenLink = page.getByRole('link', { name: /Dancing Queen.*ABBA/s })
    await expect(dancingQueenLink).toBeVisible()
  })

  test('should navigate to song page', async ({ page }) => {
    // Click on Royals song
    const royalsLink = page.getByRole('link', { name: /Royals.*Lorde/s })
    await royalsLink.click()
    
    // Verify URL changed
    await expect(page).toHaveURL(/\/s\/\d+/)
    
    // Wait for page to load
    await page.waitForLoadState('networkidle')
    
    // Should show song-specific content (not the song list)
    const dancingQueenLink = page.getByRole('link', { name: /Dancing Queen.*ABBA/s })
    await expect(dancingQueenLink).not.toBeVisible()
  })

  test('should show flashcard stats', async ({ page }) => {
    // Check flashcard section
    await expect(page.getByText('Your Flashcards')).toBeVisible()
    await expect(page.getByText('NEW')).toBeVisible()
    await expect(page.getByText('LEARNING')).toBeVisible()
    await expect(page.getByText('DUE')).toBeVisible()
  })
})