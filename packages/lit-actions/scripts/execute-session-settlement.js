#!/usr/bin/env node
import { LitNodeClient } from '@lit-protocol/lit-node-client';
import { LitActionResource, LitPKPResource } from '@lit-protocol/auth-helpers';
import { LIT_ABILITY, LIT_NETWORK } from '@lit-protocol/constants';
import { ethers } from 'ethers';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../../../.env') });

const SESSION_SETTLEMENT_CID = process.env.SESSION_SETTLEMENT_CID || 'QmNimykTQVgxsGizQdqdJS1BWx7PFGJJ2pcnayEJBRpJTw';
const KARAOKE_STORE_ADDRESS = process.env.KARAOKE_STORE_ADDRESS || '0xb55d11F5b350cA770e31de13c88F43098A1f097f';

async function executeSessionSettlement() {
  // Get PKP info
  let pkpInfo;
  try {
    pkpInfo = JSON.parse(readFileSync(join(__dirname, '../deployments/pkp.json'), 'utf8'));
  } catch (error) {
    // Use env vars as fallback
    pkpInfo = {
      publicKey: process.env.LIT_PKP_PUBLIC_KEY,
      tokenId: process.env.LIT_PKP_TOKEN_ID
    };
  }
  
  if (!pkpInfo.publicKey) {
    throw new Error('PKP public key not found. Please run mint-pkp.js first or set LIT_PKP_PUBLIC_KEY in .env');
  }
  
  // Get parameters from environment
  const userId = process.env.USER_ADDRESS;
  const sessionId = process.env.SESSION_ID;
  const creditsUsed = parseInt(process.env.CREDITS_USED);
  const songId = 1;
  const totalLines = 50;
  
  // Mock line results for testing
  const lineResults = [];
  for (let i = 0; i < creditsUsed; i++) {
    const accuracy = Math.random() * 0.5 + 0.4; // 40-90% accuracy
    lineResults.push({
      lineIndex: i,
      accuracy,
      transcript: `test transcript ${i}`,
      expectedText: `expected text ${i}`,
      timestamp: Date.now()
    });
  }
  
  console.log('Executing Session Settlement Lit Action...');
  console.log('PKP Public Key:', pkpInfo.publicKey);
  console.log('Session ID:', sessionId);
  console.log('Credits to use:', creditsUsed);
  
  const client = new LitNodeClient({
    litNetwork: LIT_NETWORK.DatilDev,
    debug: false
  });

  await client.connect();

  try {
    // Prepare the Lit Action code that will be executed
    // The session settlement action needs to be executed with PKP signing capability
    const litActionCode = readFileSync(
      join(__dirname, '../src/session-settlement.js'), 
      'utf8'
    );
    
    // Get session signatures using getLitActionSessionSigs
    console.log('Getting Lit Action session signatures...');
    const sessionSigs = await client.getLitActionSessionSigs({
      pkpPublicKey: pkpInfo.publicKey,
      chain: 'baseSepolia',
      resourceAbilityRequests: [
        {
          resource: new LitPKPResource('*'), // Use wildcard for now
          ability: LIT_ABILITY.PKPSigning,
        },
        {
          resource: new LitActionResource(SESSION_SETTLEMENT_CID),
          ability: LIT_ABILITY.LitActionExecution,
        },
      ],
      litActionIpfsId: SESSION_SETTLEMENT_CID,
      jsParams: {
        // These params are passed to the Lit Action
        userId,
        sessionId,
        songId,
        totalLines,
        lineResults,
        pkpPublicKey: pkpInfo.publicKey,
        publicKey: pkpInfo.publicKey, // Some actions expect this
      }
    });

    console.log('Session signatures obtained successfully');
    
    // Now execute the Lit Action with the session signatures
    console.log('Executing Lit Action...');
    const response = await client.executeJs({
      sessionSigs,
      ipfsId: SESSION_SETTLEMENT_CID,
      jsParams: {
        userId,
        sessionId,
        songId,
        totalLines,
        lineResults,
        pkpPublicKey: pkpInfo.publicKey,
        publicKey: pkpInfo.publicKey,
      }
    });
    
    console.log('Lit Action Response:', JSON.stringify(response, null, 2));
    
    if (response.response) {
      const result = JSON.parse(response.response);
      console.log(JSON.stringify(result));
    } else if (response.error) {
      throw new Error(`Lit Action error: ${response.error}`);
    } else {
      throw new Error('No response from Lit Action');
    }
    
  } catch (error) {
    console.error('Error executing Lit Action:', error);
    console.log(JSON.stringify({ success: false, error: error.message }));
    process.exit(1);
  } finally {
    await client.disconnect();
  }
}

executeSessionSettlement().catch(error => {
  console.error(JSON.stringify({ success: false, error: error.message }));
  process.exit(1);
});