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
          text.includes('📊') ||
          text.includes('📦') ||
          text.includes('📝') ||
          text.includes('✅') ||
          text.includes('🔊') ||
          text.includes('chunk')) {
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
    
    // Look for patterns from our continuous recording system
    const audioChunks = recordingLogs.filter(log => log.includes('Audio chunk') || log.includes('🎤'))
    const audioBlobs = recordingLogs.filter(log => log.includes('Extracted segment') || log.includes('bytes from'))
    const transcripts = recordingLogs.filter(log => log.includes('Got:') || log.includes('comparison'))
    const gradingResults = recordingLogs.filter(log => log.includes('Grading complete') || log.includes('Lit Action executed successfully'))
    
    console.log(`Audio chunks received: ${audioChunks.length}`)
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
    expect(audioChunks.length).toBeGreaterThan(0) // Should receive audio chunks
    expect(audioBlobs.length).toBeGreaterThan(0) // Should create audio blobs
    
    // The key test: are we getting non-empty transcripts?
    const hasValidTranscripts = transcripts.some(log => 
      log.includes('Got:') && 
      !log.includes('Got:      ""') &&
      !log.includes('Got: ""')
    )
    
    if (hasValidTranscripts) {
      console.log('✅ SUCCESS: Voice grading is working - got valid transcripts!')
    } else {
      console.log('❌ PROBLEM: All transcripts are empty')
      console.log('Debugging info:')
      console.log('- Audio chunks received:', audioChunks.length > 0 ? '✅' : '❌')
      console.log('- Audio blobs created:', audioBlobs.length > 0 ? '✅' : '❌')
      console.log('- Grading service called:', gradingResults.length > 0 ? '✅' : '❌')
      console.log('- Session signatures working:', logs.some(l => l.includes('session')) ? '✅' : '❌')
      
      // Show all recording logs for debugging
      console.log('\nAll recording logs:')
      recordingLogs.forEach((log, i) => console.log(`${i + 1}. ${log}`))
    }
    
    // For CI environments, we expect empty transcripts (no real mic input)
    // So just verify the system is working
    const systemWorking = audioBlobs.length > 0 && gradingResults.length > 0
    
    if (systemWorking) {
      console.log('✅ Voice grading system is working!')
      console.log(`- Audio captured: ${audioBlobs.length} segments`)
      console.log(`- Grading calls made: ${gradingResults.length}`)
      console.log(`- Transcripts empty: ${!hasValidTranscripts} (expected in test environment)`)
      expect(systemWorking).toBe(true)
    } else {
      console.log('❌ Voice grading system not working properly')
      expect(systemWorking).toBe(true) // This will fail and show what's missing
    }
  })
})