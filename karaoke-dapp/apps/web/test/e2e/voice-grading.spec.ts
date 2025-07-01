import { testWithSynpress } from '@synthetixio/synpress'
import { MetaMask, metaMaskFixtures } from '@synthetixio/synpress/playwright'
import fundedSetup from './wallet-setup/funded.setup'

const test = testWithSynpress(metaMaskFixtures(fundedSetup))
const { expect } = test

test.describe('Voice Grading Flow', () => {
  test.describe.configure({ mode: 'serial' });
  
  test('should record voice and get transcription during karaoke', async ({
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

    // Navigate to song and connect wallet (reusing purchase flow setup)
    await page.goto('/lorde/royals')
    
    await page.locator('button:has-text("Connect Wallet to Purchase")').click()
    await page.locator('button:has-text("MetaMask")').click()
    await metamask.connectToDapp()
    
    await page.waitForTimeout(2000)
    
    // Ensure we have MIDI downloaded (should be cached from previous tests)
    const downloadButton = page.locator('.fixed.bottom-0 button').first()
    const buttonText = await downloadButton.textContent()
    
    if (buttonText?.includes('Download')) {
      console.log('📥 Downloading MIDI...')
      await downloadButton.click()
      await page.waitForTimeout(2000)
      
      try {
        await metamask.confirmSignature()
        console.log('✅ Session signature confirmed')
      } catch (e) {
        console.log('ℹ️ No session signature needed')
      }
      
      await expect(page.locator('button:has-text("Start Karaoke")')).toBeVisible({ 
        timeout: 30000 
      })
    }
    
    console.log('🎵 Ready to start karaoke')
    
    // Click "Start Karaoke" button
    await page.locator('button:has-text("Start Karaoke")').click()
    
    console.log('🎤 Starting karaoke mode...')
    
    // Wait for countdown to appear and complete
    await expect(page.locator('text="3"')).toBeVisible({ timeout: 10000 })
    console.log('⏳ Countdown started')
    
    // Wait for countdown to finish (should take ~3 seconds)
    await page.waitForTimeout(4000)
    
    // Should now be in karaoke playing mode - just wait a bit since we see recording logs
    console.log('🎵 Karaoke started - recording system active')
    
    // Capture recording-related logs for the next 10 seconds
    const recordingLogs = []
    const logCapture = (msg) => {
      const text = msg.text()
      if (text.includes('Recording') || 
          text.includes('audio') || 
          text.includes('transcript') || 
          text.includes('grading') ||
          text.includes('🎤') ||
          text.includes('📼') ||
          text.includes('📊')) {
        recordingLogs.push(text)
        console.log('[Recording Log]:', text)
      }
    }
    
    page.on('console', logCapture)
    
    // Wait for more lyrics to be recorded (20 seconds to capture multiple lines and responses)
    console.log('🎤 Monitoring voice recording for 20 seconds to capture Lit Action responses...')
    await page.waitForTimeout(20000)
    
    page.off('console', logCapture)
    
    // Exit karaoke by clicking the X button
    const exitButton = page.locator('button:has-text("×"), button:has([data-icon="x"])')
    if (await exitButton.isVisible()) {
      await exitButton.click()
      console.log('🔚 Exited karaoke')
    }
    
    // Analyze the recording logs
    console.log(`\n📊 Recording Analysis:`)
    console.log(`Total recording logs: ${recordingLogs.length}`)
    
    const audioBlobs = recordingLogs.filter(log => log.includes('audio blob') || log.includes('size:'))
    const transcripts = recordingLogs.filter(log => log.includes('transcript') && !log.includes('empty'))
    const gradingResults = recordingLogs.filter(log => log.includes('similarity') || log.includes('accuracy'))
    
    console.log(`Audio blobs created: ${audioBlobs.length}`)
    console.log(`Transcripts received: ${transcripts.length}`)
    console.log(`Grading results: ${gradingResults.length}`)
    
    // Show sample logs
    if (audioBlobs.length > 0) {
      console.log('Sample audio blob:', audioBlobs[0])
    }
    if (transcripts.length > 0) {
      console.log('Sample transcript:', transcripts[0])
    }
    if (gradingResults.length > 0) {
      console.log('Sample grading:', gradingResults[0])
    }
    
    // Assertions
    expect(audioBlobs.length).toBeGreaterThan(0) // Should capture some audio
    
    // The key test: are we getting non-empty transcripts?
    const hasValidTranscripts = transcripts.some(log => 
      !log.includes('"transcript":""') && 
      !log.includes('transcript: ""') &&
      !log.includes('empty')
    )
    
    if (hasValidTranscripts) {
      console.log('✅ SUCCESS: Voice grading is working - got valid transcripts!')
    } else {
      console.log('❌ PROBLEM: All transcripts are empty')
      console.log('Debugging info:')
      console.log('- Audio blobs captured:', audioBlobs.length > 0 ? '✅' : '❌')
      console.log('- Grading service called:', gradingResults.length > 0 ? '✅' : '❌')
      console.log('- Session signatures working:', logs.some(l => l.includes('session')) ? '✅' : '❌')
      
      // Show all recording logs for debugging
      console.log('\nAll recording logs:')
      recordingLogs.forEach((log, i) => console.log(`${i + 1}. ${log}`))
    }
    
    expect(hasValidTranscripts).toBe(true) // This will fail and show the debug info
  })
})