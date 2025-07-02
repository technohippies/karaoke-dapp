import { test, expect } from '@playwright/test'
import { setupWallet } from './test-utils'

test.describe('Exercise Flow', () => {
  test('should navigate to exercise page and show exercises', async ({ page, context }) => {
    await setupWallet(context)
    
    // Navigate to home
    await page.goto('http://localhost:3000')
    
    // Navigate to progress page
    await page.goto('http://localhost:3000/progress')
    await expect(page.locator('h1:has-text("Your Progress")')).toBeVisible()
    
    // Click Practice Exercises button
    await page.locator('button:has-text("Practice Exercises")').click()
    
    // Should be on exercise page
    await expect(page).toHaveURL('http://localhost:3000/exercise')
    
    // Wait for exercises to load
    await page.waitForTimeout(2000)
    
    // Should show exercise instructions
    const instructions = page.locator('text="Say it back:"')
    await expect(instructions).toBeVisible({ timeout: 10000 })
    
    // Should show exercise content
    const exerciseContent = page.locator('[data-testid="say-it-back-line"]')
    await expect(exerciseContent).toBeVisible()
    
    // Should show recording button in footer
    const recordButton = page.locator('button:has-text("Hold to Record")')
    await expect(recordButton).toBeVisible()
  })
})