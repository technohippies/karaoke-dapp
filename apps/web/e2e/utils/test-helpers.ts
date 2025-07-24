import { Page } from '@playwright/test'

export async function waitForWalletConnection(page: Page) {
  // Wait for wallet address to appear in the UI
  await page.waitForSelector('[data-testid="wallet-address"]', { timeout: 30000 })
}

export async function getWalletAddress(page: Page): Promise<string> {
  const addressElement = page.locator('[data-testid="wallet-address"]')
  const fullText = await addressElement.textContent()
  // Extract address from text (usually formatted as "0x1234...5678")
  const match = fullText?.match(/0x[a-fA-F0-9]+/)
  return match ? match[0] : ''
}

export async function navigateToSong(page: Page, songId: number) {
  await page.goto(`/s/${songId}`)
  await page.waitForLoadState('networkidle')
}

export async function checkCredits(page: Page): Promise<{
  songCredits: number
  voiceCredits: number
}> {
  // Navigate to account page to check credits
  await page.goto('/account')
  await page.waitForLoadState('networkidle')
  
  const songCreditsElement = page.locator('[data-testid="song-credits"]')
  const voiceCreditsElement = page.locator('[data-testid="voice-credits"]')
  
  const songCredits = parseInt(await songCreditsElement.textContent() || '0')
  const voiceCredits = parseInt(await voiceCreditsElement.textContent() || '0')
  
  return { songCredits, voiceCredits }
}

export async function waitForTransaction(page: Page, expectedMessage?: string) {
  // Wait for transaction confirmation toast/message
  const selector = expectedMessage 
    ? `text=/${expectedMessage}/i`
    : '[data-testid="transaction-success"]'
  
  await page.waitForSelector(selector, { timeout: 60000 })
}

export async function dismissModal(page: Page) {
  // Close any open modals
  const closeButton = page.locator('[aria-label="Close"]')
  if (await closeButton.isVisible()) {
    await closeButton.click()
  }
}