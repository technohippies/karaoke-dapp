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
const USDC_ADDRESS = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';
const VOICE_PACK_PRICE = ethers.parseUnits('1', 6); // 1 USDC

async function buyVoiceCredits() {
  console.log('Buying Voice Credits on new KaraokeStore...\n');
  
  const provider = new ethers.JsonRpcProvider('https://sepolia.base.org');
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  
  console.log('Contract address:', KARAOKE_STORE_ADDRESS);
  console.log('Buyer address:', wallet.address);
  
  // Get contract ABIs
  const artifact = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../out/KaraokeStore_V0_1_0.sol/KaraokeStore_V0_1_0.json'), 'utf8')
  );
  
  const karaokeStore = new ethers.Contract(KARAOKE_STORE_ADDRESS, artifact.abi, wallet);
  
  // Check initial balance
  const initialBalance = await karaokeStore.voiceCredits(wallet.address);
  console.log('\nInitial voice credits:', initialBalance.toString());
  
  // Get USDC contract
  const usdcAbi = [
    'function approve(address spender, uint256 amount) returns (bool)',
    'function allowance(address owner, address spender) view returns (uint256)',
    'function balanceOf(address account) view returns (uint256)'
  ];
  
  const usdc = new ethers.Contract(USDC_ADDRESS, usdcAbi, wallet);
  
  // Check USDC balance
  const usdcBalance = await usdc.balanceOf(wallet.address);
  console.log('USDC balance:', ethers.formatUnits(usdcBalance, 6), 'USDC');
  
  if (usdcBalance < VOICE_PACK_PRICE) {
    console.log('\n⚠️  Insufficient USDC balance. You need at least 1 USDC.');
    return;
  }
  
  try {
    // Check current allowance
    const currentAllowance = await usdc.allowance(wallet.address, KARAOKE_STORE_ADDRESS);
    
    if (currentAllowance < VOICE_PACK_PRICE) {
      console.log('\nApproving USDC spend...');
      const approveTx = await usdc.approve(KARAOKE_STORE_ADDRESS, VOICE_PACK_PRICE);
      console.log('Approve tx:', approveTx.hash);
      await approveTx.wait();
      console.log('✅ USDC approved');
    }
    
    // Buy voice credits
    console.log('\nBuying voice pack (100 credits for 1 USDC)...');
    const buyTx = await karaokeStore.buyVoicePack();
    console.log('Transaction sent:', buyTx.hash);
    console.log('Waiting for confirmation...');
    
    const receipt = await buyTx.wait();
    console.log('✅ Transaction confirmed!');
    console.log('Gas used:', receipt.gasUsed.toString());
    
    // Check final balance
    const finalBalance = await karaokeStore.voiceCredits(wallet.address);
    console.log('\nFinal voice credits:', finalBalance.toString());
    console.log('Credits added:', (finalBalance - initialBalance).toString());
    
    console.log('\n🎉 Successfully purchased voice credits!');
    
  } catch (error) {
    console.error('\nError buying voice credits:', error);
    if (error.reason) {
      console.error('Reason:', error.reason);
    }
  }
}

buyVoiceCredits().catch(console.error);