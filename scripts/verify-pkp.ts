import { LitContracts } from '@lit-protocol/contracts-sdk';
import { ethers } from 'ethers';
import { ethers as ethersV5 } from '@lit-protocol/contracts-sdk/node_modules/ethers';
import * as dotenv from 'dotenv';

dotenv.config();

async function verifyPKP() {
  try {
    console.log('🔍 PKP Verification Script');
    console.log('='.repeat(50));
    
    // Check required environment variables
    if (!process.env.PKP_TOKEN_ID) {
      console.warn('⚠️  PKP_TOKEN_ID not found in .env file');
      console.log('Please provide a PKP token ID to verify');
      return;
    }

    const pkpTokenId = process.env.PKP_TOKEN_ID;
    console.log('Checking PKP Token ID:', pkpTokenId);
    console.log();

    // Setup provider for Chronicle Yellowstone
    const provider = new ethers.JsonRpcProvider('https://yellowstone-rpc.litprotocol.com');
    
    // Create ethers v5 provider for contracts SDK
    const providerV5 = new ethersV5.providers.JsonRpcProvider('https://yellowstone-rpc.litprotocol.com');
    
    // Initialize Lit contracts (read-only, no signer needed)
    const litContracts = new LitContracts({
      network: 'datil',
      debug: false,
    });
    
    await litContracts.connect();
    console.log('✅ Connected to Lit Contracts');
    console.log();

    // 1. Check if PKP exists
    console.log('1️⃣  Checking if PKP exists...');
    try {
      // Try to get the owner
      const owner = await litContracts.pkpNftContract.read.ownerOf(pkpTokenId);
      console.log('✅ PKP exists!');
      console.log('   Owner address:', owner);
      console.log();
    } catch (error: any) {
      if (error.message && error.message.includes('ERC721: invalid token ID')) {
        console.error('❌ PKP does not exist! Token ID is invalid.');
        console.log('   This means the PKP was never minted or the token ID is incorrect.');
        console.log();
        
        // Try to get total supply to show valid range
        try {
          const totalSupply = await litContracts.pkpNftContract.read.totalSupply();
          console.log('   Total PKPs minted:', totalSupply.toString());
          console.log('   Valid token IDs range from 0 to', totalSupply.sub(1).toString());
        } catch (e) {
          console.log('   Could not retrieve total supply');
        }
        return;
      } else {
        throw error;
      }
    }

    // 2. Get PKP details
    console.log('2️⃣  Getting PKP details...');
    try {
      const pkpPublicKey = await litContracts.pkpNftContract.read.getPubkey(pkpTokenId);
      const pkpEthAddress = ethersV5.utils.computeAddress(pkpPublicKey);
      
      console.log('   Public Key:', pkpPublicKey);
      console.log('   ETH Address:', pkpEthAddress);
      console.log();
    } catch (error) {
      console.error('❌ Error getting PKP public key:', error);
      console.log();
    }

    // 3. Check permitted auth methods
    console.log('3️⃣  Checking permitted auth methods...');
    try {
      // Get all auth methods for this PKP
      const authMethods = await litContracts.pkpPermissionsContract.read.getPermittedAuthMethods(pkpTokenId);
      
      if (authMethods && authMethods.length > 0) {
        console.log(`   Found ${authMethods.length} permitted auth method(s):`);
        authMethods.forEach((method: any, index: number) => {
          console.log(`   ${index + 1}. Type: ${method.authMethodType}, ID: ${method.id}`);
          
          // Decode auth method types
          const authTypeNames: { [key: number]: string } = {
            1: 'Address',
            2: 'Action',
            3: 'WebAuthn',
            4: 'Discord',
            5: 'Google',
            6: 'GoogleJWT',
            7: 'OTP',
            8: 'Email',
            9: 'Lit Action',
          };
          
          const typeName = authTypeNames[method.authMethodType] || 'Unknown';
          console.log(`      - Type name: ${typeName}`);
        });
      } else {
        console.log('   No permitted auth methods found');
      }
      console.log();
    } catch (error) {
      console.error('❌ Error getting auth methods:', error);
      console.log();
    }

    // 4. Check permitted addresses
    console.log('4️⃣  Checking permitted addresses...');
    try {
      const permittedAddresses = await litContracts.pkpPermissionsContract.read.getPermittedAddresses(pkpTokenId);
      
      if (permittedAddresses && permittedAddresses.length > 0) {
        console.log(`   Found ${permittedAddresses.length} permitted address(es):`);
        permittedAddresses.forEach((address: string, index: number) => {
          console.log(`   ${index + 1}. ${address}`);
        });
      } else {
        console.log('   No permitted addresses found');
      }
      console.log();
    } catch (error) {
      console.error('❌ Error getting permitted addresses:', error);
      console.log();
    }

    // 5. Check if PKP is router-enabled
    console.log('5️⃣  Checking if PKP is router-enabled...');
    try {
      const isRouted = await litContracts.pkpNftContract.read.getRouted(pkpTokenId);
      console.log('   Router enabled:', isRouted ? 'Yes ✅' : 'No ❌');
      console.log();
    } catch (error) {
      console.error('❌ Error checking router status:', error);
      console.log();
    }

    // 6. Additional checks from environment
    if (process.env.PKP_PUBLIC_KEY) {
      console.log('6️⃣  Verifying environment variables...');
      console.log('   PKP_PUBLIC_KEY from .env:', process.env.PKP_PUBLIC_KEY);
      
      try {
        const actualPubKey = await litContracts.pkpNftContract.read.getPubkey(pkpTokenId);
        if (actualPubKey.toLowerCase() === process.env.PKP_PUBLIC_KEY.toLowerCase()) {
          console.log('   ✅ Public key matches!');
        } else {
          console.log('   ⚠️  Public key mismatch!');
          console.log('   Actual:', actualPubKey);
        }
      } catch (error) {
        console.log('   Could not verify public key');
      }
    }

    if (process.env.PKP_ETH_ADDRESS) {
      console.log('   PKP_ETH_ADDRESS from .env:', process.env.PKP_ETH_ADDRESS);
      
      try {
        const pkpPublicKey = await litContracts.pkpNftContract.read.getPubkey(pkpTokenId);
        const actualAddress = ethersV5.utils.computeAddress(pkpPublicKey);
        if (actualAddress.toLowerCase() === process.env.PKP_ETH_ADDRESS.toLowerCase()) {
          console.log('   ✅ ETH address matches!');
        } else {
          console.log('   ⚠️  ETH address mismatch!');
          console.log('   Actual:', actualAddress);
        }
      } catch (error) {
        console.log('   Could not verify ETH address');
      }
    }

    console.log();
    console.log('='.repeat(50));
    console.log('✅ PKP verification complete!');
    
  } catch (error) {
    console.error('❌ Error verifying PKP:', error);
    process.exit(1);
  }
}

// Run the verification
verifyPKP();