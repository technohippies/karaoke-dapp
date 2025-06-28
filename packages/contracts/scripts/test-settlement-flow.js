#!/usr/bin/env node
import { ethers } from 'ethers';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../../../.env') });

const KARAOKE_STORE_ADDRESS = process.env.KARAOKE_STORE_ADDRESS || '0xb55d11F5b350cA770e31de13c88F43098A1f097f';
const BASE_SEPOLIA_RPC = 'https://sepolia.base.org';
const USDC_ADDRESS = '0x036CbD53842c5426634e7929541eC2318f3dCF7e'; // Base Sepolia USDC

const KARAOKE_STORE_ABI = [
  // Voice credit functions
  {
    inputs: [],
    name: "buyVoicePack",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [{ name: "user", type: "address" }],
    name: "getVoiceCredits",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      { name: "user", type: "address" },
      { name: "sessionId", type: "bytes32" },
      { name: "creditsUsed", type: "uint256" },
      { name: "litSignature", type: "bytes" }
    ],
    name: "settleVoiceSession",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [{ name: "sessionId", type: "bytes32" }],
    name: "isSessionSettled",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
    type: "function"
  },
  // View functions
  {
    inputs: [],
    name: "LIT_PKP_ADDRESS",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "VOICE_PACK_PRICE",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "VOICE_CREDITS_PER_PACK",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  }
];

const USDC_ABI = [
  {
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" }
    ],
    name: "approve",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [{ name: "owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  }
];

async function main() {
  console.log('Testing Voice Credit Settlement Flow\n');
  
  // Setup provider and wallet
  const provider = new ethers.JsonRpcProvider(BASE_SEPOLIA_RPC);
  
  if (!process.env.PRIVATE_KEY) {
    throw new Error('PRIVATE_KEY not found in .env');
  }
  
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  console.log('Using wallet:', wallet.address);
  
  // Connect to contracts
  const karaokeStore = new ethers.Contract(KARAOKE_STORE_ADDRESS, KARAOKE_STORE_ABI, wallet);
  const usdc = new ethers.Contract(USDC_ADDRESS, USDC_ABI, wallet);
  
  // Check current state
  console.log('\n1. Checking initial state...');
  // Use the LIT PKP address from env since it's immutable in the contract
  const litPkpAddress = process.env.LIT_PKP_PUBLIC_KEY;
  console.log('Lit PKP Address:', litPkpAddress);
  
  const initialCredits = await karaokeStore.getVoiceCredits(wallet.address);
  console.log('Initial voice credits:', initialCredits.toString());
  
  const usdcBalance = await usdc.balanceOf(wallet.address);
  console.log('USDC balance:', ethers.formatUnits(usdcBalance, 6), 'USDC');
  
  const voicePackPrice = await karaokeStore.VOICE_PACK_PRICE();
  console.log('Voice pack price:', ethers.formatUnits(voicePackPrice, 6), 'USDC');
  
  const creditsPerPack = await karaokeStore.VOICE_CREDITS_PER_PACK();
  console.log('Credits per pack:', creditsPerPack.toString());
  
  // Buy voice credits if needed
  if (initialCredits < 10n) {
    console.log('\n2. Purchasing voice credits...');
    
    // Approve USDC
    console.log('Approving USDC...');
    const approveTx = await usdc.approve(KARAOKE_STORE_ADDRESS, voicePackPrice);
    await approveTx.wait();
    console.log('Approved!');
    
    // Buy voice pack
    console.log('Buying voice pack...');
    const buyTx = await karaokeStore.buyVoicePack();
    const receipt = await buyTx.wait();
    console.log('Purchase complete! TX:', receipt.hash);
    
    const newCredits = await karaokeStore.getVoiceCredits(wallet.address);
    console.log('New voice credits:', newCredits.toString());
  } else {
    console.log('\n2. Sufficient voice credits available, skipping purchase');
  }
  
  // Simulate a karaoke session
  console.log('\n3. Simulating karaoke session...');
  const sessionId = ethers.randomBytes(32);
  const sessionIdHex = ethers.hexlify(sessionId);
  console.log('Session ID:', sessionIdHex);
  
  // Simulate 5 lines attempted
  const creditsUsed = 5;
  console.log('Credits to use:', creditsUsed);
  
  // Generate settlement signature
  console.log('\n4. Generating settlement signature...');
  
  // Run the session settlement Lit Action locally to get signature
  console.log('Running session settlement Lit Action...');
  
  try {
    // Execute the settlement action script
    const result = execSync(`node ${join(__dirname, '../../lit-actions/scripts/execute-session-settlement.js')}`, {
      env: {
        ...process.env,
        USER_ADDRESS: wallet.address,
        SESSION_ID: sessionIdHex,
        CREDITS_USED: creditsUsed.toString()
      },
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'inherit'] // Show errors
    });
    
    const settlementData = JSON.parse(result);
    
    if (!settlementData.success) {
      throw new Error('Settlement failed: ' + settlementData.error);
    }
    
    console.log('Settlement signature generated successfully');
    
    // Submit settlement to smart contract
    console.log('\n5. Submitting settlement to smart contract...');
    const settleTx = await karaokeStore.settleVoiceSession(
      wallet.address,
      sessionIdHex,
      creditsUsed,
      settlementData.settlement.signature
    );
    
    const settleReceipt = await settleTx.wait();
    console.log('Settlement complete! TX:', settleReceipt.hash);
    
    // Verify results
    console.log('\n6. Verifying results...');
    const finalCredits = await karaokeStore.getVoiceCredits(wallet.address);
    console.log('Final voice credits:', finalCredits.toString());
    console.log('Credits deducted:', (initialCredits - finalCredits).toString());
    
    const isSettled = await karaokeStore.isSessionSettled(sessionIdHex);
    console.log('Session settled:', isSettled);
    
    // Show practice lines that would be saved
    console.log('\n7. Practice lines to save:');
    settlementData.practiceLines.forEach((line, index) => {
      console.log(`  ${index + 1}. Card: ${line.card_id}, Accuracy: ${(line.accuracy * 100).toFixed(1)}%`);
    });
    
    console.log('\n✅ Voice credit settlement flow test complete!');
    
  } catch (error) {
    console.error('Settlement test failed:', error.message);
    
    // Create the test script if it doesn't exist
    console.log('\nCreating test settlement script...');
    await createTestSettlementScript();
    console.log('Please run the test again.');
  }
}

async function createTestSettlementScript() {
  const scriptContent = `#!/usr/bin/env node
import { LitNodeClient } from '@lit-protocol/lit-node-client';
import { ethers } from 'ethers';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../../../../.env') });

const SESSION_SETTLEMENT_CID = process.env.SESSION_SETTLEMENT_CID || 'QmSessionSettlementCID';
const LIT_PKP_PUBLIC_KEY = process.env.LIT_PKP_PUBLIC_KEY || '0x04...';

async function testSessionSettlement() {
  const client = new LitNodeClient({
    litNetwork: 'datil-dev',
    debug: false
  });

  await client.connect();

  try {
    // Get parameters from environment
    const userId = process.env.USER_ADDRESS;
    const sessionId = process.env.SESSION_ID;
    const creditsUsed = parseInt(process.env.CREDITS_USED);

    // Mock line results for testing
    const lineResults = [];
    for (let i = 0; i < creditsUsed; i++) {
      const accuracy = Math.random() * 0.5 + 0.4; // 40-90% accuracy
      const lineData = {
        lineIndex: i,
        accuracy,
        transcript: \`test transcript \${i}\`,
        expectedText: \`expected text \${i}\`,
        timestamp: Date.now()
      };

      // Sign the line data with wallet (simulating PKP signature)
      const wallet = new ethers.Wallet(process.env.PRIVATE_KEY);
      const message = ethers.keccak256(JSON.stringify(lineData));
      const signature = await wallet.signMessage(ethers.getBytes(message));

      lineResults.push({
        status: 'completed',
        data: lineData,
        signature
      });
    }

    // For testing, we'll simulate the settlement locally
    const settlementData = {
      userId,
      sessionId,
      creditsUsed,
      timestamp: Date.now()
    };

    // Sign settlement with wallet (simulating PKP)
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY);
    const settlementMessage = ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ['address', 'bytes32', 'uint256'],
        [userId, sessionId, creditsUsed]
      )
    );
    const settlementSignature = await wallet.signMessage(ethers.getBytes(settlementMessage));

    // Prepare practice lines
    const practiceLines = lineResults
      .filter(line => line.data.accuracy < 0.7)
      .map((line, index) => ({
        card_id: \`1_\${line.data.lineIndex}\`,
        lineText: line.data.expectedText,
        accuracy: line.data.accuracy
      }));

    const result = {
      success: true,
      settlement: {
        ...settlementData,
        signature: settlementSignature
      },
      practiceLines
    };

    console.log(JSON.stringify(result));
  } finally {
    await client.disconnect();
  }
}

testSessionSettlement().catch(error => {
  console.error(JSON.stringify({ success: false, error: error.message }));
  process.exit(1);
});
`;

  const { default: fs } = await import('fs');
  fs.writeFileSync(join(__dirname, '../../lit-actions/scripts/test-session-settlement.js'), scriptContent);
}

main().catch(console.error);