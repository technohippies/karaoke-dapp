#!/usr/bin/env node
const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

// Load env vars manually
const envPath = path.join(__dirname, '../../../.env');
const envContent = fs.readFileSync(envPath, 'utf8');
envContent.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) {
    process.env[key] = value;
  }
});

const KARAOKE_STORE_ADDRESS = process.env.KARAOKE_STORE_ADDRESS;

// Settlement data from Lit Action execution
const SETTLEMENT_DATA = {
  user: '0x7d3924A73f1242663fD8BbD1f2559fa6081Ba6D1',
  sessionId: '0x2c594fe7da6c46817c0757cd658c8b60c5c16c7ed0eefdb08f77437a9854696e',
  creditsUsed: 10,
  signature: '0x35064ebd492079e2842ba2d1ca657679e10492d1acbcbbcf09fc72e0164cb854173cf27a21c7473577035b19675655873d53f67586ac80245ae178042f46ab3e1b'
};

async function submitSettlement() {
  console.log('Submitting Settlement to Smart Contract...\n');
  
  // Setup
  const provider = new ethers.JsonRpcProvider('https://sepolia.base.org');
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  
  // Get contract ABI from build artifacts
  const artifact = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../out/KaraokeStore_V0_1_0.sol/KaraokeStore_V0_1_0.json'), 'utf8')
  );
  
  const karaokeStore = new ethers.Contract(KARAOKE_STORE_ADDRESS, artifact.abi, wallet);
  
  // Check initial balance
  const initialBalance = await karaokeStore.voiceCredits(wallet.address);
  console.log('Initial voice credits:', initialBalance.toString());
  
  try {
    console.log('\nSettlement Details:');
    console.log('- User:', SETTLEMENT_DATA.user);
    console.log('- Session ID:', SETTLEMENT_DATA.sessionId);
    console.log('- Credits to deduct:', SETTLEMENT_DATA.creditsUsed);
    console.log('- PKP Signature:', SETTLEMENT_DATA.signature.slice(0, 20) + '...');
    
    console.log('\nSubmitting settlement transaction...');
    const tx = await karaokeStore.settleVoiceSession(
      SETTLEMENT_DATA.user,
      SETTLEMENT_DATA.sessionId,
      SETTLEMENT_DATA.creditsUsed,
      SETTLEMENT_DATA.signature
    );
    
    console.log('Transaction sent:', tx.hash);
    console.log('Waiting for confirmation...');
    
    const receipt = await tx.wait();
    console.log('✅ Transaction confirmed!');
    console.log('Gas used:', receipt.gasUsed.toString());
    
    // Check final balance
    const finalBalance = await karaokeStore.voiceCredits(wallet.address);
    console.log('\nFinal voice credits:', finalBalance.toString());
    console.log('Credits deducted:', (initialBalance - finalBalance).toString());
    
    console.log('\n🎉 Settlement completed successfully!');
    
  } catch (error) {
    console.error('\nError submitting settlement:', error);
    if (error.reason) {
      console.error('Reason:', error.reason);
    }
    if (error.data) {
      console.error('Error data:', error.data);
    }
  }
}

submitSettlement().catch(console.error);