import { test } from '@playwright/test'

test('debug - show page content', async ({ page }) => {
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  
  // Take screenshot
  await page.screenshot({ path: 'homepage.png', fullPage: true })
  
  // Log page title
  console.log('Page title:', await page.title())
  
  // Log all visible text
  const bodyText = await page.locator('body').innerText()
  console.log('Page content:', bodyText.substring(0, 500))
  
  // Log all buttons
  const buttons = await page.locator('button').allInnerTexts()
  console.log('Buttons found:', buttons)
  
  // Log all links
  const links = await page.locator('a').allInnerTexts()
  console.log('Links found:', links)
  
  // Wait a bit to see the page
  await page.waitForTimeout(5000)
})