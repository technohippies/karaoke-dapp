#!/usr/bin/env node
import { LitNodeClient } from '@lit-protocol/lit-node-client';
import { LitActionResource, LitPKPResource } from '@lit-protocol/auth-helpers';
import { LIT_ABILITY, LIT_NETWORK } from '@lit-protocol/constants';
import ethers5 from 'ethers5';
import * as siwe from 'siwe';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../../../.env') });

async function executeSessionSettlement() {
  console.log('Executing Session Settlement with Wallet Auth...\n');
  
  // Get the new PKP info (v2)
  const pkpInfo = JSON.parse(
    readFileSync(join(__dirname, '../deployments/pkp-v2.json'), 'utf8')
  );
  
  // Get action deployments
  const deploymentInfo = JSON.parse(
    readFileSync(join(__dirname, '../deployments/actions.json'), 'utf8')
  );
  
  const sessionSettlementAction = deploymentInfo.find(a => a.actionName === 'session-settlement');
  const sessionSettlementCID = sessionSettlementAction.ipfsCid;
  
  console.log('PKP Public Key:', pkpInfo.publicKey);
  console.log('PKP ETH Address:', pkpInfo.ethAddress);
  console.log('PKP Owner (our wallet):', pkpInfo.owner);
  console.log('Session Settlement CID:', sessionSettlementCID);
  
  // Setup wallet for authentication
  const provider = new ethers5.providers.JsonRpcProvider('https://sepolia.base.org');
  const wallet = new ethers5.Wallet(process.env.PRIVATE_KEY, provider);
  
  // Test parameters
  const userId = wallet.address;
  const sessionId = ethers5.utils.id('test-session-' + Date.now());
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
  
  console.log('\nTest Parameters:');
  console.log('User ID:', userId);
  console.log('Session ID:', sessionId.slice(0, 16) + '...');
  console.log('Credits Used:', creditsUsed);
  
  const client = new LitNodeClient({
    litNetwork: LIT_NETWORK.DatilTest,
    debug: false
  });

  await client.connect();

  try {
    // Create auth signature using wallet
    const domain = 'localhost';
    const origin = 'http://localhost:3000';
    const statement = 'Sign in to use PKP for session settlement';
    
    const siweMessage = new siwe.SiweMessage({
      domain,
      address: wallet.address,
      statement,
      uri: origin,
      version: '1',
      chainId: 84532, // Base Sepolia
      expirationTime: new Date(Date.now() + 60 * 60 * 1000).toISOString() // 1 hour
    });
    
    const messageToSign = siweMessage.prepareMessage();
    const signature = await wallet.signMessage(messageToSign);
    
    const authSig = {
      sig: signature,
      derivedVia: 'web3.eth.personal.sign',
      signedMessage: messageToSign,
      address: wallet.address
    };
    
    console.log('\n✅ Created auth signature with wallet');
    
    // Now get session signatures using wallet auth
    console.log('\nGetting session signatures...');
    const sessionSigs = await client.getPkpSessionSigs({
      pkpPublicKey: pkpInfo.publicKey,
      authMethods: [{
        authMethodType: 1, // EthWallet
        accessToken: JSON.stringify(authSig)
      }],
      resourceAbilityRequests: [
        {
          resource: new LitPKPResource('*'),
          ability: LIT_ABILITY.PKPSigning,
        },
        {
          resource: new LitActionResource('*'),
          ability: LIT_ABILITY.LitActionExecution,
        },
      ],
      chain: 'baseSepolia'
    });
    
    console.log('✅ Session signatures obtained successfully');
    
    // Execute the Lit Action
    console.log('\nExecuting Session Settlement Lit Action...');
    const response = await client.executeJs({
      sessionSigs,
      ipfsId: sessionSettlementCID,
      jsParams: {
        userId,
        sessionId,
        songId,
        totalLines,
        lineResults,
        creditsUsed,
        pkpPublicKey: pkpInfo.publicKey,
        publicKey: pkpInfo.publicKey,
        contractAddress: process.env.KARAOKE_STORE_ADDRESS,
        chain: 'baseSepolia'
      }
    });
    
    console.log('\nLit Action Response:', JSON.stringify(response, null, 2));
    
    // Check if we got a signature even without a response
    if (response.signatures?.settlement) {
      console.log('\n✅ Settlement signature generated successfully!');
      console.log('Signature:', response.signatures.settlement.signature);
      console.log('Data signed:', response.signatures.settlement.dataSigned);
      
      // The signature can be used to settle on-chain
      console.log('\n🎉 Ready to submit to smart contract!');
      console.log('\nSettlement data:');
      console.log('- User:', userId);
      console.log('- Session ID:', sessionId);
      console.log('- Credits Used:', creditsUsed);
      console.log('- Signature:', response.signatures.settlement.signature);
      
      // Update .env reminder
      console.log('\n📝 Your .env has been updated with the new PKP.');
    } else if (response.response) {
      const result = JSON.parse(response.response);
      console.log('\n✅ Settlement generated successfully!');
      console.log('Settlement:', result);
    } else {
      console.log('\n⚠️  No settlement data in response');
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