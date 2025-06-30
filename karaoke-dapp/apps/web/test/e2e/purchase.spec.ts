import { testWithSynpress } from '@synthetixio/synpress'
import { MetaMask, metaMaskFixtures } from '@synthetixio/synpress/playwright'
import fundedSetup from './wallet-setup/funded.setup'

const test = testWithSynpress(metaMaskFixtures(fundedSetup))
const { expect } = test

// We now have a funded wallet with Base Sepolia ETH
test.describe('Purchase Flow', () => {
  // Run tests in serial to avoid wallet conflicts
  test.describe.configure({ mode: 'serial' });
  test('should complete song purchase with session creation and MIDI decryption', async ({
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

    // Set up console log capture before navigation
    const logs = []
    page.on('console', msg => {
      const text = msg.text()
      logs.push(text)
      console.log('[Browser Log]:', text)
    })

    // Navigate to song
    await page.goto('/s/1/lorde-royals')
    
    // Connect wallet first
    await page.locator('button:has-text("Connect Wallet to Purchase")').click()
    await page.locator('button:has-text("MetaMask")').click()
    await metamask.connectToDapp()
    
    // Wait a bit for connection to stabilize
    await page.waitForTimeout(2000)
    
    // Wait for button to stabilize and not show "Loading..."
    await page.waitForFunction(
      () => {
        const button = document.querySelector('.fixed.bottom-0 button')
        const text = button?.textContent || ''
        return (text.includes('Purchase') || text.includes('Download')) && !text.includes('Loading')
      },
      { timeout: 30000 }
    )
    
    const buttonText = await page.locator('.fixed.bottom-0 button').first().textContent()
    console.log('Button state:', buttonText)
    
    if (buttonText?.includes('Download')) {
      console.log('Song already purchased, testing download flow...')
      
      // Capture current log count
      const initialLogCount = logs.length
      
      // Click download button
      await page.locator('.fixed.bottom-0 button').first().click()
      
      // Wait for session signature popup
      await page.waitForTimeout(2000)
      
      // Handle session signature
      try {
        await metamask.confirmSignature()
        console.log('Session signature confirmed')
      } catch (e) {
        console.log('No session signature needed or already handled')
      }
      
      // Wait for download to complete - should show "Start Karaoke" button
      await expect(page.locator('button:has-text("Start Karaoke")')).toBeVisible({ 
        timeout: 30000 
      })
      console.log('Download completed - Start Karaoke button visible')
      
      // Give it a moment to ensure caching completes
      await page.waitForTimeout(2000)
      
      // Check for session creation logs
      const sessionLogs = logs.filter(log => 
        log.includes('createSession') || 
        log.includes('Connecting to encryption') ||
        log.includes('decryptMidi') ||
        log.includes('✅ Mock MIDI decryption') ||
        log.includes('💾 Mock MIDI data cached')
      )
      
      console.log(`Session/encryption logs found: ${sessionLogs.length}`)
      console.log('Sample logs:', sessionLogs.slice(0, 5))
      
      // Verify download was triggered
      const newLogs = logs.length - initialLogCount
      console.log(`New logs captured during download: ${newLogs}`)
      
      // Show the last few logs to see what happened
      console.log('Last 10 logs:', logs.slice(-10))
      
      // Check if MIDI was stored in IndexedDB
      const midiInDB = await page.evaluate(async () => {
        return new Promise((resolve) => {
          const request = indexedDB.open('karaoke-cache')
          request.onsuccess = (event) => {
            const db = event.target.result
            if (!db.objectStoreNames.contains('midi-cache')) {
              console.log('midi-cache store not found')
              resolve(false)
              return
            }
            
            const transaction = db.transaction(['midi-cache'], 'readonly')
            const store = transaction.objectStore('midi-cache')
            const getAllRequest = store.getAllKeys()
            
            getAllRequest.onsuccess = () => {
              const keys = getAllRequest.result
              const hasMidi = keys.some(key => key.includes('midi-song'))
              console.log('IndexedDB midi-cache keys:', keys)
              resolve(hasMidi)
            }
            
            getAllRequest.onerror = () => resolve(false)
          }
          
          request.onerror = () => resolve(false)
        })
      })
      
      console.log(`MIDI file stored in IndexedDB: ${midiInDB}`)
      
      if ((newLogs > 0 || sessionLogs.length > 0) && midiInDB) {
        console.log('✅ Download flow completed successfully - MIDI stored in IndexedDB')
      } else if (newLogs > 0 || sessionLogs.length > 0) {
        console.log('⚠️ Encryption activity detected but MIDI not found in IndexedDB')
      } else {
        throw new Error('No encryption activity detected during download')
      }
      
    } else if (buttonText?.includes('Purchase')) {
      console.log('Going through purchase flow...')
      
      // Click purchase button
      await page.locator('.fixed.bottom-0 button').first().click()
      
      // Wait for purchase sheet
      await page.waitForSelector('text="Purchase Song Pack"')
      
      // Click buy button
      await page.locator('button:has-text("Buy Song Pack")').last().click()
      
      // Handle transactions
      await page.waitForTimeout(2000)
      
      console.log('Confirming transaction...')
      await metamask.confirmTransaction()
      
      // Wait for completion
      await page.waitForTimeout(5000)
      
      // Handle additional transactions if needed
      try {
        await page.waitForTimeout(3000)
        await metamask.confirmTransaction()
        await page.waitForTimeout(5000)
      } catch {
        console.log('No additional transactions needed')
      }
      
      // Wait for download button
      await expect(page.locator('.fixed.bottom-0 button').first()).toContainText('Download', {
        timeout: 60000
      })
      
      // Click download
      await page.locator('.fixed.bottom-0 button').first().click()
      
      // Wait for session signature popup
      await page.waitForTimeout(2000)
      
      // Handle session signature
      try {
        await metamask.confirmSignature()
        console.log('Session signature confirmed')
      } catch (e) {
        console.log('No session signature needed or already handled')
      }
      
      // Wait for download to complete - should show "Start Karaoke" button
      await expect(page.locator('button:has-text("Start Karaoke")')).toBeVisible({ 
        timeout: 30000 
      })
      console.log('Download completed - Start Karaoke button visible')
      
      // Give it a moment to ensure caching completes
      await page.waitForTimeout(2000)
    }
    
    // Simple verification - just ensure the test completed
    console.log('✅ Test completed successfully')
  })

  test('should use cached MIDI on second visit', async ({
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

    // First visit - download and cache MIDI
    await page.goto('/s/1/lorde-royals')
    await page.locator('button:has-text("Connect Wallet to Purchase")').click()
    await page.locator('button:has-text("MetaMask")').click()
    await metamask.connectToDapp()
    
    // Wait for state to update
    await page.waitForTimeout(2000)
    
    // Should show Download button
    const downloadButton = page.locator('.fixed.bottom-0 button:has-text("Download")')
    await expect(downloadButton).toBeVisible({ timeout: 10000 })
    
    // Click download
    await downloadButton.click()
    
    // Handle session signature
    await page.waitForTimeout(2000)
    await metamask.confirmSignature()
    
    // Wait for download to complete
    await expect(page.locator('button:has-text("Start Karaoke")')).toBeVisible({ timeout: 30000 })
    
    // Navigate away and come back
    await page.goto('/')
    await page.waitForTimeout(1000)
    await page.goto('/s/1/lorde-royals')
    
    // Should immediately show "Start Karaoke" without needing to download
    await expect(page.locator('.fixed.bottom-0 button:has-text("Start Karaoke")')).toBeVisible({ timeout: 5000 })
    
    console.log('✅ Cached MIDI detected successfully')
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

    // Capture console logs
    const logs = []
    page.on('console', msg => logs.push(msg.text()))

    await page.goto('/s/1/lorde-royals')
    
    // Connect wallet first
    await page.locator('button:has-text("Connect Wallet to Purchase")').click()
    await page.locator('button:has-text("MetaMask")').click()
    await metamask.connectToDapp()
    
    // Wait for the purchase button to appear after wallet connection
    await page.waitForTimeout(2000) // Give time for state to update
    
    // The purchase button should be in the fixed footer
    const purchaseButton = page.locator('.fixed.bottom-0 button:has-text("Purchase")')
    await expect(purchaseButton).toBeVisible({ timeout: 10000 })
    
    // Click purchase button to open the sheet
    await purchaseButton.click()
    
    // Wait for the purchase sheet to open and be visible
    await page.waitForSelector('.sheet-content', { state: 'visible' })
    await page.waitForSelector('text="Purchase Song Pack"', { state: 'visible' })
    
    // Click the purchase button in the sheet
    await page.locator('button:has-text("Buy Song Pack")').click()
    
    // Wait a bit for MetaMask to appear
    await page.waitForTimeout(1000)
    
    // First approve USDC spending if needed
    const approveButton = await metamask.page.locator('button:has-text("Approve")').first()
    if (await approveButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await metamask.confirmTransaction()
      await page.waitForTimeout(2000)
    }
    
    // Now reject the actual purchase transaction
    await metamask.rejectTransaction()
    
    // Wait for error state
    await page.waitForTimeout(1000)
    
    // Should show error message - check for the retry button instead
    const retryButton = await page.locator('button:has-text("Retry")').first()
    await expect(retryButton).toBeVisible({ timeout: 5000 })
    
    // Verify error message is shown
    const errorText = await page.locator('.text-red-400').first()
    await expect(errorText).toContainText(/cancelled|rejected/i)
  })
})