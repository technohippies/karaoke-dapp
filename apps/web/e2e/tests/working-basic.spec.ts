import { test, expect } from '@playwright/test'

test.describe('Working Basic App Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
  })

  test('should load the homepage', async ({ page }) => {
    // Check page title - it's in Chinese but contains "OK" (from 卡拉OK)
    const title = await page.title()
    expect(title).toContain('OK')
    
    // Check for main elements
    await expect(page.locator('header')).toBeVisible()
    
    // Check for connect wallet button
    await expect(page.getByRole('button', { name: 'Connect Wallet' })).toBeVisible()
  })

  test('should display songs', async ({ page }) => {
    // Look for song links (they are anchor tags with song names)
    const songLinks = page.locator('a').filter({ hasText: /Royals|Dancing Queen/ })
    await expect(songLinks.first()).toBeVisible()
    
    // Verify we have at least one song
    const count = await songLinks.count()
    expect(count).toBeGreaterThan(0)
  })

  test('should navigate to song detail page', async ({ page }) => {
    // Click on "Royals" song
    await page.getByRole('link', { name: /Royals/ }).click()
    
    // Verify navigation to song page
    await expect(page).toHaveURL(/\/s\/\d+/)
    
    // Wait for page to load
    await page.waitForLoadState('networkidle')
    
    // Check that we're on a song page (should have different content than homepage)
    const pageContent = await page.locator('body').innerText()
    expect(pageContent).not.toContain('Dancing Queen') // Other songs shouldn't be visible
  })

  test('should show flashcards section', async ({ page }) => {
    // Check for flashcards section
    await expect(page.getByText('Your Flashcards')).toBeVisible()
    
    // Check for flashcard stats
    await expect(page.getByText('NEW')).toBeVisible()
    await expect(page.getByText('LEARNING')).toBeVisible()
    await expect(page.getByText('DUE')).toBeVisible()
  })
})