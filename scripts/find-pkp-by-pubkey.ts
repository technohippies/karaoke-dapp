import { LitContracts } from '@lit-protocol/contracts-sdk';
import { ethers as ethersV5 } from '@lit-protocol/contracts-sdk/node_modules/ethers';
import * as dotenv from 'dotenv';

dotenv.config();

async function findPKPByPubKey() {
  try {
    const targetPubKey = process.env.PKP_PUBLIC_KEY;
    if (!targetPubKey) {
      throw new Error('PKP_PUBLIC_KEY not found in .env');
    }

    console.log('🔍 Searching for PKP with public key:', targetPubKey);
    console.log();

    // Create provider
    const providerV5 = new ethersV5.providers.JsonRpcProvider('https://yellowstone-rpc.litprotocol.com');
    
    // Initialize Lit contracts
    const litContracts = new LitContracts({
      network: 'datil',
      debug: false,
    });
    
    await litContracts.connect();
    console.log('Connected to Lit Contracts');

    // Get total supply to know the range
    const totalSupply = await litContracts.pkpNftContract.read.totalSupply();
    console.log('Total PKPs minted:', totalSupply.toString());
    console.log();

    // Try to find our PKP by checking recent tokens
    console.log('Checking recent PKP tokens...');
    const checkLimit = 20; // Check last 20 tokens
    const startIndex = totalSupply.gt(checkLimit) ? totalSupply.sub(checkLimit) : 0;
    
    for (let i = startIndex; i.lt(totalSupply); i = i.add(1)) {
      try {
        const tokenId = i;
        const pubKey = await litContracts.pkpNftContract.read.getPubkey(tokenId);
        
        if (pubKey.toLowerCase() === targetPubKey.toLowerCase()) {
          console.log('✅ Found matching PKP!');
          console.log('Token ID:', tokenId.toString());
          console.log('Token ID (hex):', tokenId.toHexString());
          
          // Get owner
          const owner = await litContracts.pkpNftContract.read.ownerOf(tokenId);
          console.log('Owner:', owner);
          
          // Compute ETH address
          const ethAddress = ethersV5.utils.computeAddress(pubKey);
          console.log('ETH Address:', ethAddress);
          
          return;
        }
      } catch (e) {
        // Skip if token doesn't exist
      }
    }
    
    console.log('❌ PKP not found in recent tokens');
    
    // Also check the token ID from .env
    if (process.env.PKP_TOKEN_ID) {
      console.log('\nChecking token ID from .env:', process.env.PKP_TOKEN_ID);
      try {
        const pubKey = await litContracts.pkpNftContract.read.getPubkey(process.env.PKP_TOKEN_ID);
        console.log('Public key for this token:', pubKey);
        
        if (pubKey.toLowerCase() === targetPubKey.toLowerCase()) {
          console.log('✅ Token ID matches!');
        } else {
          console.log('❌ Public key mismatch!');
          console.log('Expected:', targetPubKey);
          console.log('Actual:', pubKey);
        }
      } catch (error: any) {
        console.error('Error checking token:', error.message);
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

findPKPByPubKey();