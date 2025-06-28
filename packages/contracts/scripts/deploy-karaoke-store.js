#!/usr/bin/env node
import { ethers } from 'ethers';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../../../.env') });

const BASE_SEPOLIA_RPC = 'https://sepolia.base.org';
const USDC_ADDRESS = '0x036CbD53842c5426634e7929541eC2318f3dCF7e'; // Base Sepolia USDC

async function deployContract() {
  console.log('Deploying KaraokeStore_V0_1_0 to Base Sepolia...\n');
  
  // Setup provider and wallet
  const provider = new ethers.JsonRpcProvider(BASE_SEPOLIA_RPC);
  
  if (!process.env.PRIVATE_KEY) {
    throw new Error('PRIVATE_KEY not found in .env');
  }
  
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  console.log('Deployer address:', wallet.address);
  
  const balance = await provider.getBalance(wallet.address);
  console.log('ETH balance:', ethers.formatEther(balance), 'ETH');
  
  // Check if we have enough gas
  if (balance < ethers.parseEther('0.001')) {
    throw new Error('Insufficient ETH balance for deployment');
  }
  
  // Get the compiled contract
  const contractPath = join(__dirname, '../out/KaraokeStore_V0_1_0.sol/KaraokeStore_V0_1_0.json');
  let contractJson;
  try {
    contractJson = JSON.parse(readFileSync(contractPath, 'utf8'));
  } catch (error) {
    console.error('Contract artifact not found. Please run: forge build');
    process.exit(1);
  }
  
  const abi = contractJson.abi;
  const bytecode = contractJson.bytecode.object;
  
  // Deploy the contract
  console.log('\nDeploying contract...');
  const contractFactory = new ethers.ContractFactory(abi, bytecode, wallet);
  
  // Use the LIT PKP address from env (or use deployer address for testing)
  const litPkpAddress = process.env.LIT_PKP_PUBLIC_KEY || wallet.address;
  console.log('Using LIT PKP Address:', litPkpAddress);
  
  const contract = await contractFactory.deploy(USDC_ADDRESS, litPkpAddress);
  console.log('Contract deployment tx:', contract.deploymentTransaction().hash);
  
  // Wait for deployment
  console.log('Waiting for deployment...');
  await contract.waitForDeployment();
  
  const contractAddress = await contract.getAddress();
  console.log('\n✅ Contract deployed successfully!');
  console.log('Contract address:', contractAddress);
  console.log('USDC address:', USDC_ADDRESS);
  console.log('LIT PKP address:', litPkpAddress);
  
  // Verify deployment
  console.log('\nVerifying deployment...');
  const deployedCode = await provider.getCode(contractAddress);
  console.log('Contract code size:', deployedCode.length);
  
  // Test the contract
  console.log('\nTesting contract functions...');
  const voicePackPrice = await contract.VOICE_PACK_PRICE();
  console.log('Voice pack price:', ethers.formatUnits(voicePackPrice, 6), 'USDC');
  
  const creditsPerPack = await contract.VOICE_CREDITS_PER_PACK();
  console.log('Credits per pack:', creditsPerPack.toString());
  
  const userCredits = await contract.getVoiceCredits(wallet.address);
  console.log('Deployer voice credits:', userCredits.toString());
  
  console.log('\n🎉 Deployment complete!');
  console.log('\nPlease update your .env file with:');
  console.log(`KARAOKE_STORE_ADDRESS=${contractAddress}`);
  console.log(`MUSIC_STORE_ADDRESS=${contractAddress}`);
  
  return contractAddress;
}

deployContract().catch(console.error);