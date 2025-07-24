import { test, expect } from '@playwright/test'

test.describe('Basic App Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
  })

  test('should load the homepage', async ({ page }) => {
    // Check page title contains Karaoke in any language
    const title = await page.title()
    expect(title.toLowerCase()).toContain('karaoke')
    
    // Check for main elements
    await expect(page.locator('header')).toBeVisible()
    
    // Check for connect wallet button (might be in different languages)
    const connectButton = page.locator('button').filter({ hasText: /connect|wallet|连接|錢包/i })
    await expect(connectButton.first()).toBeVisible()
  })

  test('should display song list', async ({ page }) => {
    // Wait for song list to load - look for ListItem components
    const songItems = page.locator('.group.relative.flex') // Based on ListItem component structure
    await expect(songItems.first()).toBeVisible({ timeout: 15000 })
    
    // Verify at least one song is displayed
    const count = await songItems.count()
    expect(count).toBeGreaterThan(0)
  })

  test('should navigate to song detail page', async ({ page }) => {
    // Wait for songs to load
    const songItems = page.locator('.group.relative.flex')
    await songItems.first().waitFor({ state: 'visible', timeout: 15000 })
    
    // Click first song
    await songItems.first().click()
    
    // Verify navigation to song page
    await expect(page).toHaveURL(/\/s\/\d+/)
    
    // Wait for song page to load
    await page.waitForLoadState('networkidle')
    
    // Check for song page elements (title should be in h1)
    await expect(page.locator('h1').first()).toBeVisible()
  })

  test('should navigate to account page', async ({ page }) => {
    // Account link should be in header
    await page.getByRole('link', { name: /account|账户|賬戶/i }).click()
    
    // Verify navigation
    await expect(page).toHaveURL('/account')
    
    // Check for account page content
    await expect(page.locator('main')).toBeVisible()
  })
})