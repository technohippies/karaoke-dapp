#!/usr/bin/env node

import { LitNodeClient } from '@lit-protocol/lit-node-client';
import { LIT_NETWORK, LIT_ABILITY } from '@lit-protocol/constants';
import { 
  LitActionResource,
  LitPKPResource, 
  createSiweMessageWithRecaps, 
  generateAuthSig 
} from '@lit-protocol/auth-helpers';
import { ethers } from 'ethers';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../../../.env') });

// PKP Configuration
const PKP_PUBLIC_KEY = '0x043a1a467808b48e40b0b4da67f75f15b09fe50c294f8aa664b70e51d16e76f973d30be74f3346f7f1ae551da35e93dae7cf5a8eb1ad5b7e3b443421cc078dc519';
const PKP_ETH_ADDRESS = '0xE2000B0ce17f260c1f3068e424Edf73b0e5052BA';

async function testSessionSettlementSigning() {
  let litNodeClient;
  
  try {
    console.log('🔐 Testing session settlement signing...');
    console.log('PKP Address:', PKP_ETH_ADDRESS);
    
    // Get session settlement CID
    const deploymentInfo = JSON.parse(
      readFileSync(join(__dirname, '../deployments/actions.json'), 'utf8')
    );
    
    const sessionSettlementAction = deploymentInfo.find(a => a.actionName === 'session-settlement');
    const SESSION_SETTLEMENT_CID = sessionSettlementAction.ipfsCid;
    console.log('Session Settlement CID:', SESSION_SETTLEMENT_CID);
    
    // Initialize Lit Node Client
    litNodeClient = new LitNodeClient({
      litNetwork: LIT_NETWORK.DatilTest,
      debug: false
    });
    
    console.log('🔗 Connecting to Lit Network...');
    await litNodeClient.connect();
    console.log('✅ Connected to Lit Network');
    
    // Create session signatures
    const provider = new ethers.JsonRpcProvider('https://sepolia.base.org');
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    const walletAddress = wallet.address;
    
    console.log('💳 Wallet address:', walletAddress);
    
    const sessionSigs = await litNodeClient.getSessionSigs({
      chain: 'base',
      expiration: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
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
      authNeededCallback: async ({ resourceAbilityRequests, expiration, uri }) => {
        const toSign = await createSiweMessageWithRecaps({
          uri: uri,
          expiration: expiration,
          resources: resourceAbilityRequests,
          walletAddress,
          nonce: await litNodeClient.getLatestBlockhash(),
          litNodeClient,
        });

        const authSig = await generateAuthSig({
          signer: wallet,
          toSign,
        });

        return authSig;
      },
    });
    
    console.log('✅ Session signatures created');
    
    // Test parameters
    const testUserId = '0x742d35Cc6634C0532925a3b844Bc9e7595f6021a';
    const testSessionId = '0x' + Buffer.from('test-session-123').toString('hex').padEnd(64, '0');
    const testCreditsUsed = 5;
    
    console.log('\n📝 Test parameters:');
    console.log('  userId:', testUserId);
    console.log('  sessionId:', testSessionId);
    console.log('  creditsUsed:', testCreditsUsed);
    console.log('  pkpPublicKey:', PKP_PUBLIC_KEY);
    
    // Execute the Lit Action
    console.log('\n🚀 Executing session settlement action...');
    const result = await litNodeClient.executeJs({
      sessionSigs,
      ipfsId: SESSION_SETTLEMENT_CID,
      jsParams: {
        userId: testUserId,
        sessionId: testSessionId,
        creditsUsed: testCreditsUsed,
        pkpPublicKey: PKP_PUBLIC_KEY
      }
    });
    
    console.log('\n✅ Lit Action executed successfully!');
    console.log('Raw result:', result);
    
    // The result.response is already an object
    const response = result.response;
    console.log('\n📊 Response:');
    console.log(JSON.stringify(response, null, 2));
    
    // The signature is in result.signatures
    if (result.signatures?.settlement) {
      console.log('\n🎉 Success! PKP signature generated:');
      console.log('Signature:', result.signatures.settlement.signature);
      console.log('Message Hash:', response.settlement.messageHash);
      console.log('\nThis signature can be used to call settleVoiceSession on the smart contract');
    } else {
      console.error('\n❌ Failed to generate signature');
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error);
    
    if (error.message?.includes('signing shares')) {
      console.log('\n💡 This error suggests the PKP authorization was successful, but there might be an issue with the Lit Action code');
    }
  } finally {
    if (litNodeClient) {
      await litNodeClient.disconnect();
      console.log('\n🔌 Disconnected from Lit Network');
    }
  }
}

// Run the test
testSessionSettlementSigning()
  .then(() => {
    console.log('\n✅ Test complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });