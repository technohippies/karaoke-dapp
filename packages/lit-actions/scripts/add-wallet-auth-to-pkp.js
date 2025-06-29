#!/usr/bin/env node
import { LitContracts } from '@lit-protocol/contracts-sdk';
import { LIT_NETWORK, AUTH_METHOD_TYPE, AUTH_METHOD_SCOPE } from '@lit-protocol/constants';
import ethers5 from 'ethers5';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, writeFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../../../.env') });

async function addWalletAuthToPKP() {
  console.log('Adding wallet as temporary auth method to PKP...\n');
  
  // Setup
  const provider = new ethers5.providers.JsonRpcProvider(LIT_RPC.CHRONICLE_YELLOWSTONE);
  const wallet = new ethers5.Wallet(process.env.PRIVATE_KEY, provider);
  
  console.log('Admin wallet address:', wallet.address);
  
  // Get PKP info
  const pkpInfo = JSON.parse(
    readFileSync(join(__dirname, '../deployments/pkp.json'), 'utf8')
  );
  
  console.log('PKP Token ID:', pkpInfo.tokenId);
  console.log('PKP ETH Address:', pkpInfo.ethAddress);
  
  // Initialize Lit Contracts
  const litContracts = new LitContracts({
    signer: wallet,
    network: LIT_NETWORK.DatilTest,
    debug: false
  });
  
  await litContracts.connect();
  
  try {
    // First, we need to check who owns the PKP
    const owner = await litContracts.pkpNftContract.read.ownerOf(pkpInfo.tokenId);
    console.log('Current PKP owner:', owner);
    
    if (owner.toLowerCase() === pkpInfo.ethAddress.toLowerCase()) {
      console.log('\n⚠️  PKP owns itself. We need to add an admin auth method from the PKP itself.');
      console.log('This requires using an existing permitted Lit Action to add the wallet auth.');
      
      // We'll create a special Lit Action that can add auth methods
      const addAuthMethodAction = `
        const go = async () => {
          const adminWallet = jsParams.adminWallet;
          const tokenId = jsParams.tokenId;
          
          // Create the transaction to add wallet auth
          const txData = LitActions.callContract({
            chain: 'yellowstone',
            to: '0x60C1ddC8b9e38F730F0e7B70A2F84C1A98A69167', // PKP Permissions contract
            abi: [{
              "inputs": [
                {"name": "tokenId", "type": "uint256"},
                {"name": "authMethod", "type": "tuple", "components": [
                  {"name": "authMethodType", "type": "uint256"},
                  {"name": "id", "type": "bytes"},
                  {"name": "userPubkey", "type": "bytes"}
                ]},
                {"name": "scopes", "type": "uint256[]"}
              ],
              "name": "addPermittedAuthMethod",
              "outputs": [],
              "stateMutability": "nonpayable",
              "type": "function"
            }],
            functionName: 'addPermittedAuthMethod',
            params: [
              tokenId,
              {
                authMethodType: 1, // Wallet
                id: adminWallet,
                userPubkey: '0x'
              },
              [1] // SignAnything scope
            ]
          });
          
          // Sign and return the transaction
          const sigShare = await LitActions.signEcdsa({
            toSign: txData,
            publicKey: pkpPublicKey,
            sigName: 'addAuthTx'
          });
          
          LitActions.setResponse({ response: JSON.stringify({ success: true, sigShare }) });
        };
        go();
      `;
      
      console.log('\nThis PKP owns itself and cannot be modified externally.');
      console.log('You have two options:');
      console.log('1. Use the existing permitted Lit Actions for all operations');
      console.log('2. Re-mint a new PKP with wallet auth included from the start');
      
      return null;
    }
    
    // If we own the PKP with our wallet, we can add auth methods directly
    console.log('\n✅ Wallet owns the PKP, adding wallet as auth method...');
    
    // Add wallet as permitted auth method
    const tx = await litContracts.pkpPermissionsContract.write.addPermittedAuthMethod(
      pkpInfo.tokenId,
      {
        authMethodType: AUTH_METHOD_TYPE.EthWallet,
        id: ethers5.utils.hexlify(ethers5.utils.toUtf8Bytes(wallet.address.toLowerCase())),
        userPubkey: '0x'
      },
      [AUTH_METHOD_SCOPE.SignAnything]
    );
    
    console.log('Transaction sent:', tx.hash);
    console.log('Waiting for confirmation...');
    
    const receipt = await tx.wait();
    console.log('Transaction confirmed!');
    
    console.log('\n✅ Wallet auth method added successfully!');
    console.log('You can now use your wallet to create session signatures.');
    
    // Update PKP info
    const updatedPKPInfo = {
      ...pkpInfo,
      adminWallet: wallet.address,
      hasWalletAuth: true
    };
    
    writeFileSync(
      join(__dirname, '../deployments/pkp.json'),
      JSON.stringify(updatedPKPInfo, null, 2)
    );
    
    return updatedPKPInfo;
    
  } catch (error) {
    console.error('Error adding wallet auth:', error);
    throw error;
  }
}

addWalletAuthToPKP().catch(console.error);