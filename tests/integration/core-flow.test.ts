import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { ethers } from 'ethers'
import ethers5 from 'ethers5'
import type { LitNodeClient } from '@lit-protocol/lit-node-client'

// Test utilities
import { getContract, getWallet, ensureCredits } from '../utils/contracts'
import { 
  createLitClient, 
  getSessionSigs, 
  PKP_PUBLIC_KEY,
  VOICE_GRADER_CID,
  SESSION_SETTLEMENT_CID
} from '../utils/lit-client'
import { 
  TEST_AUDIO_BASE64, 
  TEST_EXPECTED_TEXT, 
  generateTestSessionId,
  TEST_CREDITS_TO_USE,
  TEST_TIMEOUTS
} from '../utils/test-data'

describe('Complete Karaoke Flow', () => {
  let wallet: ethers5.Wallet
  let contract: ethers5.Contract
  let litClient: LitNodeClient
  
  beforeAll(async () => {
    // Setup wallet, contract, Lit client
    wallet = getWallet()
    contract = getContract()
    litClient = await createLitClient()
    
    console.log('🔧 Test setup complete')
    console.log('  Wallet:', wallet.address)
    console.log('  Contract:', contract.address)
    console.log('  PKP:', PKP_PUBLIC_KEY)
  }, TEST_TIMEOUTS.SETTLEMENT)

  afterAll(async () => {
    if (litClient) {
      await litClient.disconnect()
    }
  })

  it('executes complete voice credit settlement flow', async () => {
    // 1. SETUP: Ensure user has enough voice credits
    console.log('\n📋 Step 1: Setting up voice credits...')
    
    const initialBalance = await ensureCredits(contract, wallet, 10n)
    console.log(`✅ Initial balance: ${initialBalance} credits`)
    
    // Convert BigNumber to bigint for comparison
    const initialBalanceBigInt = BigInt(initialBalance.toString())
    expect(initialBalanceBigInt).toBeGreaterThanOrEqual(TEST_CREDITS_TO_USE)

    // 2. VOICE GRADING: Test actual Deepgram nova-3 integration with WebM audio
    console.log('\n🎤 Step 2: Testing voice grading with Deepgram nova-3 (WebM format)...')
    
    const sessionId = ethers.encodeBytes32String(generateTestSessionId())
    console.log(`Session ID: ${sessionId}`)
    
    const sessionSigs = await getSessionSigs(litClient, wallet)
    console.log('✅ Got session signatures')
    
    // Execute voice grader Lit Action (uses real Deepgram nova-3)
    const gradeResult = await litClient.executeJs({
      sessionSigs,
      ipfsId: VOICE_GRADER_CID,
      jsParams: {
        audioData: TEST_AUDIO_BASE64,
        expectedText: TEST_EXPECTED_TEXT,
        sessionId,
        lineIndex: 0
      }
    })
    
    const gradeResponse = JSON.parse(gradeResult.response)
    console.log('Voice grading result:', {
      success: gradeResponse.success,
      accuracy: gradeResponse.lineResult?.accuracy,
      transcript: gradeResponse.lineResult?.transcript
    })
    
    expect(gradeResponse.success).toBe(true)
    expect(gradeResponse.lineResult).toBeDefined()
    expect(gradeResponse.lineResult.accuracy).toBeGreaterThan(0)
    expect(gradeResponse.lineResult.transcript).toContain('hi')
    
    console.log(`✅ Voice graded with ${Math.round(gradeResponse.lineResult.accuracy * 100)}% accuracy`)

    // 3. SESSION SETTLEMENT: Test PKP v3 signing
    console.log('\n📝 Step 3: Testing session settlement with PKP v3...')
    
    const settlementResult = await litClient.executeJs({
      sessionSigs,
      ipfsId: SESSION_SETTLEMENT_CID,
      jsParams: {
        userId: wallet.address,
        sessionId,
        creditsUsed: TEST_CREDITS_TO_USE.toString(),
        pkpPublicKey: PKP_PUBLIC_KEY,
        contractAddress: contract.address,
        chain: 'baseSepolia'
      }
    })
    
    console.log('Raw settlement response:', settlementResult.response)
    console.log('Type of response:', typeof settlementResult.response)
    
    const settlement = typeof settlementResult.response === 'string' 
      ? JSON.parse(settlementResult.response)
      : settlementResult.response
      
    console.log('Settlement result:', {
      success: settlement.success,
      hasSignature: !!settlement.signature,
      messageHash: settlement.settlement?.messageHash
    })
    
    expect(settlement.success).toBe(true)
    expect(settlement.signature).toBeDefined()
    expect(settlement.settlement).toBeDefined()
    expect(settlement.settlement.creditsUsed).toBe(TEST_CREDITS_TO_USE.toString())
    
    console.log('✅ PKP v3 signed settlement successfully')

    // 4. SMART CONTRACT: Submit settlement and verify credit deduction
    console.log('\n⛓️  Step 4: Submitting settlement to smart contract...')
    
    const balanceBeforeSettlement = await contract.getVoiceCredits(wallet.address)
    console.log(`Balance before settlement: ${balanceBeforeSettlement}`)
    
    const tx = await contract.settleVoiceSession(
      wallet.address,
      sessionId,
      TEST_CREDITS_TO_USE,
      settlement.signature
    )
    
    console.log(`Transaction sent: ${tx.hash}`)
    const receipt = await tx.wait()
    console.log(`✅ Transaction confirmed in block ${receipt.blockNumber}`)
    
    const balanceAfterSettlement = await contract.getVoiceCredits(wallet.address)
    
    // Convert to bigint for calculations
    const beforeBigInt = BigInt(balanceBeforeSettlement.toString())
    const afterBigInt = BigInt(balanceAfterSettlement.toString())
    const creditsDeducted = beforeBigInt - afterBigInt
    
    console.log(`Balance after settlement: ${balanceAfterSettlement}`)
    console.log(`Credits deducted: ${creditsDeducted}`)
    
    expect(creditsDeducted).toBe(TEST_CREDITS_TO_USE)
    expect(afterBigInt).toBe(beforeBigInt - TEST_CREDITS_TO_USE)

    // 5. ANTI-REPLAY: Ensure same session can't be settled twice
    console.log('\n🛡️  Step 5: Testing anti-replay protection...')
    
    await expect(
      contract.settleVoiceSession(
        wallet.address,
        sessionId,
        TEST_CREDITS_TO_USE,
        settlement.signature
      )
    ).rejects.toThrow()
    
    console.log('✅ Double settlement properly rejected')

    // 6. FINAL VALIDATION: Summary
    console.log('\n🎉 Test Summary:')
    console.log(`  ✅ Deepgram nova-3 voice grading working`)
    console.log(`  ✅ PKP v3 session signatures working`) 
    console.log(`  ✅ Session settlement signing working`)
    console.log(`  ✅ Smart contract signature validation working`)
    console.log(`  ✅ Credit deduction math correct`)
    console.log(`  ✅ Anti-replay protection working`)
    console.log(`  📊 Total credits used: ${TEST_CREDITS_TO_USE}`)
    console.log(`  📊 Final balance: ${balanceAfterSettlement}`)
    
  }, TEST_TIMEOUTS.SETTLEMENT)
})