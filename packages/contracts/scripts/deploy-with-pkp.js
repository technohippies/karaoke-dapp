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

async function deployContractWithPKP() {
  console.log('Deploying KaraokeStore_V0_1_0 with new PKP to Base Sepolia...\n');
  
  // First, check if we have a PKP minted
  let pkpInfo;
  try {
    pkpInfo = JSON.parse(readFileSync(join(__dirname, '../../lit-actions/deployments/pkp.json'), 'utf8'));
    console.log('Found existing PKP:');
    console.log('- ETH Address:', pkpInfo.ethAddress);
    console.log('- Public Key:', pkpInfo.publicKey);
  } catch (error) {
    console.error('No PKP found. Please run: node packages/lit-actions/scripts/mint-pkp.js');
    process.exit(1);
  }
  
  // Setup provider and wallet
  const provider = new ethers.JsonRpcProvider(BASE_SEPOLIA_RPC);
  
  if (!process.env.PRIVATE_KEY) {
    throw new Error('PRIVATE_KEY not found in .env');
  }
  
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  console.log('\nDeployer address:', wallet.address);
  
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
  
  // Deploy the contract with the PKP address
  console.log('\nDeploying contract...');
  const contractFactory = new ethers.ContractFactory(abi, bytecode, wallet);
  
  console.log('Using PKP ETH Address:', pkpInfo.ethAddress);
  
  const contract = await contractFactory.deploy(USDC_ADDRESS, pkpInfo.ethAddress);
  console.log('Contract deployment tx:', contract.deploymentTransaction().hash);
  
  // Wait for deployment
  console.log('Waiting for deployment...');
  await contract.waitForDeployment();
  
  const contractAddress = await contract.getAddress();
  console.log('\n✅ Contract deployed successfully!');
  console.log('Contract address:', contractAddress);
  console.log('USDC address:', USDC_ADDRESS);
  console.log('PKP ETH address:', pkpInfo.ethAddress);
  
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
  
  // Update deployment info
  const deploymentInfo = {
    karaokeStore: contractAddress,
    contractVersion: '0.1.0',
    usdc: USDC_ADDRESS,
    litPkp: pkpInfo.ethAddress,
    litPkpPublicKey: pkpInfo.publicKey,
    litPkpTokenId: pkpInfo.tokenId,
    chainId: 84532,
    deployedAt: new Date().toISOString(),
    transactionHash: contract.deploymentTransaction().hash
  };
  
  const fs = await import('fs');
  fs.writeFileSync(
    join(__dirname, '../deployments/84532-pkp.json'),
    JSON.stringify(deploymentInfo, null, 2)
  );
  
  console.log('\n🎉 Deployment complete!');
  console.log('\nDeployment info saved to: deployments/84532-pkp.json');
  console.log('\nPlease update your .env file with:');
  console.log(`KARAOKE_STORE_ADDRESS=${contractAddress}`);
  console.log(`MUSIC_STORE_ADDRESS=${contractAddress}`);
  console.log(`LIT_PKP_ETH_ADDRESS=${pkpInfo.ethAddress}`);
  console.log(`LIT_PKP_PUBLIC_KEY=${pkpInfo.publicKey}`);
  console.log(`LIT_PKP_TOKEN_ID=${pkpInfo.tokenId}`);
  
  return contractAddress;
}

deployContractWithPKP().catch(console.error);