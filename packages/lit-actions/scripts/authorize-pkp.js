#!/usr/bin/env node

import { LitNodeClient } from '@lit-protocol/lit-node-client';
import { LitNetwork, AUTH_METHOD_SCOPE } from '@lit-protocol/constants';
import { ethers } from 'ethers';
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
config({ path: path.resolve(__dirname, '../../../.env') });

// PKP Configuration
const PKP_PUBLIC_KEY = '0x043a1a467808b48e40b0b4da67f75f15b09fe50c294f8aa664b70e51d16e76f973d30be74f3346f7f1ae551da35e93dae7cf5a8eb1ad5b7e3b443421cc078dc519';
const PKP_ETH_ADDRESS = '0xE2000B0ce17f260c1f3068e424Edf73b0e5052BA';

// Contract addresses on datil-test
// From: https://github.com/LIT-Protocol/networks/tree/main/datil-test
const PKP_PERMISSIONS_CONTRACT = '0x60C1ddC8b9e38F730F0e7B70A2F84C1A98A69167';
const CONTRACTS_ABI = {
  PKPPermissions: [
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "tokenId",
          "type": "uint256"
        },
        {
          "internalType": "bytes",
          "name": "ipfsCID",
          "type": "bytes"
        },
        {
          "internalType": "uint256[]",
          "name": "scopes",
          "type": "uint256[]"
        }
      ],
      "name": "addPermittedAction",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "tokenId",
          "type": "uint256"
        },
        {
          "internalType": "bytes",
          "name": "ipfsCID",
          "type": "bytes"
        }
      ],
      "name": "isPermittedAction",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    }
  ]
};

async function authorizePKP() {
  console.log('🔐 Authorizing PKP for Lit Actions...');
  console.log('PKP Address:', PKP_ETH_ADDRESS);
  console.log('PKP Public Key:', PKP_PUBLIC_KEY);

  // Load action deployments
  const actionsPath = path.join(__dirname, '../deployments/actions.json');
  const actions = JSON.parse(await fs.readFile(actionsPath, 'utf-8'));
  
  // Get session settlement action
  const sessionSettlementAction = actions.find(a => a.actionName === 'session-settlement');
  if (!sessionSettlementAction) {
    throw new Error('Session settlement action not found in deployments');
  }

  console.log('📄 Session Settlement IPFS CID:', sessionSettlementAction.ipfsCid);

  // Connect to Chronicle Yellowstone
  console.log('🔗 Connecting to Chronicle Yellowstone...');
  const provider = new ethers.JsonRpcProvider('https://chain-rpc.litprotocol.com/http');
  
  // Set a longer timeout for the provider
  provider._getConnection().timeout = 60000; // 60 seconds
  
  // Try to get network info with retries
  let retries = 3;
  let network;
  
  while (retries > 0) {
    try {
      network = await provider.getNetwork();
      console.log('✅ Connected to network:', network.name, 'chainId:', network.chainId);
      break;
    } catch (error) {
      console.log(`⚠️  Connection attempt failed (${4 - retries}/3):`, error.message);
      retries--;
      
      if (retries > 0) {
        console.log('🔄 Retrying in 5 seconds...');
        await new Promise(resolve => setTimeout(resolve, 5000));
      } else {
        console.error('❌ Failed to connect after 3 attempts');
        throw error;
      }
    }
  }
  
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  
  console.log('💰 Wallet address:', wallet.address);

  // Get PKP token ID from public key
  const tokenId = ethers.keccak256('0x' + PKP_PUBLIC_KEY.slice(2));
  console.log('🎫 PKP Token ID:', tokenId);

  // Create contract instance
  const pkpPermissionsContract = new ethers.Contract(
    PKP_PERMISSIONS_CONTRACT,
    CONTRACTS_ABI.PKPPermissions,
    wallet
  );

  // Check if already authorized
  const ipfsCIDBytes = ethers.toUtf8Bytes(sessionSettlementAction.ipfsCid);
  const isAuthorized = await pkpPermissionsContract.isPermittedAction(tokenId, ipfsCIDBytes);
  
  if (isAuthorized) {
    console.log('✅ PKP is already authorized for this action');
    return;
  }

  console.log('⚠️  PKP is not authorized, adding permission...');

  // Add permission for the action
  const scopes = [AUTH_METHOD_SCOPE.SignAnything]; // Or specific scopes as needed
  
  try {
    const tx = await pkpPermissionsContract.addPermittedAction(
      tokenId,
      ipfsCIDBytes,
      scopes
    );
    
    console.log('📝 Transaction sent:', tx.hash);
    console.log('⏳ Waiting for confirmation...');
    
    const receipt = await tx.wait();
    console.log('✅ Permission added successfully!');
    console.log('Block:', receipt.blockNumber);
  } catch (error) {
    console.error('❌ Error adding permission:', error);
    
    // If we can't add permission, we might need to mint a new PKP
    console.log('\n💡 Alternative: Mint a new PKP with the correct permissions');
    console.log('This PKP might not be owned by the deployer wallet');
  }
}

// Alternative: Check who owns the PKP
async function checkPKPOwnership() {
  console.log('\n🔍 Checking PKP ownership...');
  
  const provider = new ethers.JsonRpcProvider('https://chain-rpc.litprotocol.com/http');
  
  // PKP NFT contract address on datil-test
  // From: https://github.com/LIT-Protocol/networks/tree/main/datil-test
  const PKP_NFT_CONTRACT = '0x6a0f439f064B7167A8Ea6B22AcC07ae5360ee0d1';
  const PKP_NFT_ABI = [
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "tokenId",
          "type": "uint256"
        }
      ],
      "name": "ownerOf",
      "outputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    }
  ];
  
  const pkpNftContract = new ethers.Contract(PKP_NFT_CONTRACT, PKP_NFT_ABI, provider);
  
  // Get token ID from public key
  const tokenId = ethers.keccak256('0x' + PKP_PUBLIC_KEY.slice(2));
  
  try {
    const owner = await pkpNftContract.ownerOf(tokenId);
    console.log('📍 PKP Owner:', owner);
    console.log('💰 Our wallet:', process.env.PRIVATE_KEY ? new ethers.Wallet(process.env.PRIVATE_KEY).address : 'Not configured');
    
    if (owner.toLowerCase() !== new ethers.Wallet(process.env.PRIVATE_KEY).address.toLowerCase()) {
      console.log('⚠️  The PKP is not owned by the current wallet');
      console.log('You need to either:');
      console.log('1. Use the owner wallet to authorize the action');
      console.log('2. Mint a new PKP with the correct permissions');
    }
  } catch (error) {
    console.error('Error checking ownership:', error);
  }
}

// Run the authorization
authorizePKP()
  .then(() => checkPKPOwnership())
  .then(() => {
    console.log('\n✅ Authorization check complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });