#!/usr/bin/env node
import { ethers } from 'ethers';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../../../.env') });

const KARAOKE_STORE_ADDRESS = '0xb55d11F5b350cA770e31de13c88F43098A1f097f';
const BASE_SEPOLIA_RPC = 'https://sepolia.base.org';
const USDC_ADDRESS = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';

const KARAOKE_STORE_ABI = [
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
    inputs: [],
    name: "VOICE_PACK_PRICE",
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

async function buyVoiceCredits() {
  console.log('Buying Voice Credits for New Contract\n');
  
  const provider = new ethers.JsonRpcProvider(BASE_SEPOLIA_RPC);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  
  const karaokeStore = new ethers.Contract(KARAOKE_STORE_ADDRESS, KARAOKE_STORE_ABI, wallet);
  const usdc = new ethers.Contract(USDC_ADDRESS, USDC_ABI, wallet);
  
  // Check current state
  console.log('Contract address:', KARAOKE_STORE_ADDRESS);
  console.log('Wallet address:', wallet.address);
  
  const currentCredits = await karaokeStore.getVoiceCredits(wallet.address);
  console.log('Current voice credits:', currentCredits.toString());
  
  const usdcBalance = await usdc.balanceOf(wallet.address);
  console.log('USDC balance:', ethers.formatUnits(usdcBalance, 6), 'USDC');
  
  const voicePackPrice = await karaokeStore.VOICE_PACK_PRICE();
  console.log('Voice pack price:', ethers.formatUnits(voicePackPrice, 6), 'USDC');
  
  if (currentCredits >= 100n) {
    console.log('\n✅ Already have sufficient voice credits!');
    return;
  }
  
  console.log('\nPurchasing voice credits...');
  
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
  console.log('\n✅ New voice credits:', newCredits.toString());
}

buyVoiceCredits().catch(console.error);