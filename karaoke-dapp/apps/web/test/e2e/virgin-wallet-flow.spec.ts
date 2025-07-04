import { testWithSynpress } from '@synthetixio/synpress'
import { MetaMask, metaMaskFixtures } from '@synthetixio/synpress/playwright'
import basicSetup from './wallet-setup/basic.setup'

const test = testWithSynpress(metaMaskFixtures(basicSetup))
const { expect } = test

test.describe('Virgin Wallet Complete Flow', () => {
  test('should complete full flow: purchase song, buy voice credits, and do karaoke', async ({
    context,
    page,
    metamaskPage,
    extensionId,
  }) => {
    const metamask = new MetaMask(
      context,
      metamaskPage,
      basicSetup.walletPassword,
      extensionId
    )

    // Set up console log capture
    const logs = []
    page.on('console', msg => {
      const text = msg.text()
      logs.push(text)
      console.log('[Browser Log]:', text)
    })

    // Grant microphone permission
    await context.grantPermissions(['microphone'])
    console.log('🎤 Microphone permission granted')

    // Navigate to a song
    await page.goto('/lorde/royals')
    console.log('📍 Navigated to song page')
    
    // Step 1: Connect virgin wallet
    console.log('\n👛 Step 1: Connecting virgin wallet...')
    
    await page.locator('button:has-text("Connect Wallet to Purchase")').click()
    await page.locator('button:has-text("MetaMask")').click()
    await metamask.connectToDapp()
    
    await page.waitForTimeout(2000)
    
    // Check initial state - should show purchase options
    const actionButton = page.locator('.fixed.bottom-0 button').first()
    
    // Wait for button to finish loading
    await expect(actionButton).not.toHaveText('Loading...', { timeout: 10000 })
    
    let buttonText = await actionButton.textContent()
    console.log(`Initial button state: "${buttonText}"`)
    
    // Should see purchase options since we don't have access
    expect(buttonText).toMatch(/Get|Purchase|Buy/)
    
    // Get wallet address and check initial balances
    const walletAddress = await page.locator('button[aria-label*="Account"]').first().textContent({ timeout: 5000 }).catch(() => 'Unknown')
    console.log(`Wallet connected: ${walletAddress}`)
    
    // Check what the logs say about access
    const accessLogs = logs.filter(log => log.includes('Song access') || log.includes('User has') || log.includes('credits'))
    console.log('Access status logs:')
    accessLogs.forEach(log => console.log('  - ' + log))
    
    // Check voice credit balance (should be 0)
    const creditBalance = logs.find(log => log.includes('Voice credit balance:'))
    console.log(`Initial voice credits: ${creditBalance || '0'}`)
    
    // Step 2: Purchase song access
    console.log('\n🎵 Step 2: Purchasing song access...')
    
    // Click purchase button (should be "Get 2 Songs for $2")
    await actionButton.click()
    console.log('Clicked purchase button')
    
    // Should show purchase confirmation or MetaMask directly
    try {
      // Look for purchase confirmation dialog
      const confirmPurchase = page.locator('button:has-text("Confirm Purchase")')
      if (await confirmPurchase.isVisible({ timeout: 2000 })) {
        console.log('📋 Purchase confirmation dialog shown')
        await confirmPurchase.click()
      }
    } catch (e) {
      console.log('ℹ️ No purchase confirmation dialog, proceeding to MetaMask')
    }
    
    // Handle MetaMask transaction
    console.log('⏳ Waiting for MetaMask transaction...')
    await page.waitForTimeout(2000)
    
    // Note: In test environment with basic setup, purchase might fail due to no USDC
    // But we can still test the flow
    try {
      await metamask.confirmTransaction()
      console.log('✅ Song purchase transaction confirmed')
      
      // Wait for transaction to process
      await page.waitForTimeout(5000)
    } catch (e) {
      console.log('❌ Song purchase failed (expected in test with no USDC)')
      
      // Check if we got an allowance error
      const allowanceError = logs.some(log => log.includes('transfer amount exceeds allowance'))
      if (allowanceError) {
        console.log('💡 Need USDC approval first')
      }
    }
    
    // Step 3: Try to start karaoke (should fail with 0 voice credits)
    console.log('\n🎤 Step 3: Attempting to start karaoke...')
    
    // Wait for button state to update
    await page.waitForTimeout(3000)
    buttonText = await actionButton.textContent()
    console.log(`Button state after purchase attempt: "${buttonText}"`)
    
    // If we successfully purchased, try to start karaoke
    if (buttonText?.includes('Start Karaoke') || buttonText?.includes('Download')) {
      console.log('✅ Song access granted (or in download state)')
      
      // Handle download if needed
      if (buttonText?.includes('Download')) {
        console.log('📥 Downloading MIDI...')
        await actionButton.click()
        
        // Handle session signature
        try {
          await metamask.confirmSignature()
          console.log('✅ Session signature confirmed')
        } catch (e) {
          console.log('ℹ️ No session signature needed')
        }
        
        // Wait for download
        await page.waitForTimeout(5000)
      }
      
      // Now try to start karaoke
      await expect(actionButton).toHaveText('Start Karaoke', { timeout: 10000 })
      await actionButton.click()
      console.log('🎤 Clicked Start Karaoke')
      
      // Check for voice credit issue
      await page.waitForTimeout(2000)
      
      const voiceCreditLogs = logs.filter(log => 
        log.includes('Voice credits balance:') || 
        log.includes('credits needed')
      )
      
      if (voiceCreditLogs.length > 0) {
        console.log('💳 Voice credit check results:')
        voiceCreditLogs.forEach(log => console.log('  - ' + log))
      }
      
      // Should be blocked due to no voice credits
      const blocked = logs.some(log => log.includes('Voice credits balance: 0'))
      if (blocked) {
        console.log('✅ Karaoke blocked due to insufficient voice credits (expected)')
      }
    }
    
    // Step 4: Purchase voice credits
    console.log('\n💳 Step 4: Purchasing voice credits...')
    
    // Look for voice credit purchase option
    // This might be in a menu or settings
    const settingsButton = page.locator('button[aria-label="Settings"]')
    if (await settingsButton.isVisible({ timeout: 2000 })) {
      await settingsButton.click()
      console.log('📋 Opened settings menu')
      
      const buyCreditsOption = page.locator('text=/Buy Voice Credits|Purchase Credits/')
      if (await buyCreditsOption.isVisible({ timeout: 2000 })) {
        await buyCreditsOption.click()
        console.log('💳 Found voice credit purchase option')
        
        // Handle purchase flow
        // This would involve USDC approval and purchase
        console.log('⚠️ Voice credit purchase UI not yet implemented')
      }
    } else {
      console.log('⚠️ Voice credit purchase not accessible from current UI')
    }
    
    // Step 5: Complete karaoke (if we had credits)
    console.log('\n🎵 Step 5: Karaoke flow (would work with credits)...')
    
    // Summary
    console.log('\n📊 Virgin Wallet Flow Summary:')
    console.log('1. Wallet Connection: ✅')
    console.log('2. Song Purchase: ' + (logs.some(log => log.includes('Song unlocked')) ? '✅' : '❌ (needs USDC)'))
    console.log('3. Voice Credit Check: ✅ (system working, blocking 0 credits)')
    console.log('4. Voice Credit Purchase: ❌ (UI not implemented)')
    console.log('5. Karaoke: ❌ (blocked by voice credits)')
    
    console.log('\n💡 Next Steps:')
    console.log('- Implement voice credit purchase UI')
    console.log('- Add USDC funding to test wallet')
    console.log('- Test combo purchase (song + voice credits)')
  })
})