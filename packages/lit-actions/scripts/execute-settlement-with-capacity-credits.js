#!/usr/bin/env node
import { LitNodeClient } from '@lit-protocol/lit-node-client';
import { LIT_NETWORK } from '@lit-protocol/constants';
import { ethers } from 'ethers';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../../../.env') });

async function executeSessionSettlement() {
  console.log('Executing Session Settlement with Capacity Credits...\n');
  
  // Get PKP info
  const pkpInfo = JSON.parse(
    readFileSync(join(__dirname, '../deployments/pkp.json'), 'utf8')
  );
  
  // Use the wallet that deployed the PKP to provide capacity credits
  const provider = new ethers.providers.JsonRpcProvider(LIT_RPC.CHRONICLE_YELLOWSTONE);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  
  console.log('PKP Public Key:', pkpInfo.publicKey);
  console.log('Admin Wallet:', wallet.address);
  
  // Test parameters
  const userId = wallet.address; // Use wallet address as test user
  const sessionId = ethers.utils.id('test-session-' + Date.now());
  const creditsUsed = 10;
  const songId = 1;
  const totalLines = 50;
  
  // Mock line results
  const lineResults = [];
  for (let i = 0; i < creditsUsed; i++) {
    lineResults.push({
      lineIndex: i,
      accuracy: Math.random() * 0.5 + 0.4,
      transcript: `test transcript ${i}`,
      expectedText: `expected text ${i}`,
      timestamp: Date.now(),
      status: 'completed'
    });
  }
  
  const client = new LitNodeClient({
    litNetwork: LIT_NETWORK.DatilTest,
    debug: false
  });

  await client.connect();

  try {
    // First, create a capacity delegation auth sig from our wallet
    // This allows the PKP to use our capacity credits
    console.log('Creating capacity delegation auth sig...');
    
    const { capacityDelegationAuthSig } = await client.createCapacityDelegationAuthSig({
      dAppOwnerWallet: wallet,
      capacityTokenId: '1', // Use capacity credit NFT token ID 1
      delegateeAddresses: [pkpInfo.ethAddress], // Delegate to PKP
      uses: '100', // Allow 100 uses
      expiration: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
    });
    
    console.log('Capacity delegation created successfully');
    
    // Now execute the Lit Action directly without session sigs
    // The Lit Action itself will handle the PKP signing
    console.log('\nExecuting Session Settlement Lit Action...');
    
    // Use the CID that the PKP is already authorized for
    const authorizedCID = pkpInfo.permittedActions.sessionSettlement;
    console.log('Using authorized CID:', authorizedCID);
    
    const response = await client.executeJs({
      ipfsId: authorizedCID,
      authSig: capacityDelegationAuthSig, // Use capacity delegation instead of session sigs
      jsParams: {
        userId,
        sessionId,
        songId,
        totalLines,
        lineResults,
        creditsUsed,
        pkpPublicKey: pkpInfo.publicKey,
        publicKey: pkpInfo.publicKey,
        // Contract addresses
        contractAddress: process.env.KARAOKE_STORE_ADDRESS,
        chain: 'baseSepolia'
      }
    });
    
    console.log('Lit Action Response:', JSON.stringify(response, null, 2));
    
    if (response.response) {
      const result = JSON.parse(response.response);
      console.log('\n✅ Settlement generated successfully!');
      console.log('Settlement data:', result);
      
      // Now we can use this settlement on-chain
      if (result.settlement) {
        console.log('\nSettlement signature:', result.settlement.signature);
        console.log('Credits used:', result.settlement.creditsUsed);
        console.log('Ready to submit to smart contract!');
      }
    }
    
  } catch (error) {
    console.error('Error executing settlement:', error);
    if (error.details) {
      console.error('Error details:', error.details);
    }
  } finally {
    await client.disconnect();
  }
}

executeSessionSettlement().catch(console.error);