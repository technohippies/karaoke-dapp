import { LitNodeClient } from '@lit-protocol/lit-node-client';
import { ethers } from 'ethers';
import * as dotenv from 'dotenv';
import { 
  createSiweMessageWithRecaps,
  generateAuthSig,
  LitActionResource
} from '@lit-protocol/auth-helpers';
import { LIT_ABILITY } from '@lit-protocol/constants';

dotenv.config();

async function testDatilTestNetwork() {
  console.log('🔄 Testing with datil-test network instead of datil...\n');
  
  const litNodeClient = new LitNodeClient({
    litNetwork: 'datil-test', // Changed from 'datil'
    debug: true
  });

  try {
    await litNodeClient.connect();
    console.log('✅ Connected to datil-test network');

    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!);
    console.log('Testing with wallet:', wallet.address);
    console.log('Using PKP:', process.env.PKP_PUBLIC_KEY?.slice(0, 10) + '...');

    // Simple test Lit Action
    const testLitAction = `
      (async () => {
        console.log('=== TESTING ON DATIL-TEST NETWORK ===');
        console.log('Network: datil-test');
        console.log('Timestamp:', new Date().toISOString());
        
        try {
          const message = "Test on datil-test network";
          const messageHash = ethers.utils.id(message);
          const messageBytes = ethers.utils.arrayify(messageHash);
          
          let pkpPubKey = publicKey;
          if (pkpPubKey.startsWith('0x')) {
            pkpPubKey = pkpPubKey.slice(2);
          }
          if (pkpPubKey.startsWith('04') && pkpPubKey.length === 130) {
            pkpPubKey = pkpPubKey.slice(2);
          }
          
          console.log('PKP public key (first 20 chars):', pkpPubKey.substring(0, 20) + '...');
          console.log('Attempting to sign with Lit.Actions.signEcdsa...');
          
          const sigShares = await Lit.Actions.signEcdsa({
            toSign: Array.from(messageBytes),
            publicKey: pkpPubKey,
            sigName: 'testSig'
          });
          
          console.log('✅ SIGNING SUCCESSFUL ON DATIL-TEST!');
          
          Lit.Actions.setResponse({
            response: JSON.stringify({
              success: true,
              message: 'datil-test network works!',
              network: 'datil-test'
            })
          });
        } catch (error) {
          console.error('❌ Error on datil-test:', error.toString());
          Lit.Actions.setResponse({
            response: JSON.stringify({
              success: false,
              error: error.message || String(error),
              network: 'datil-test'
            })
          });
        }
      })();
    `;

    // Create session
    const resourceAbilityRequests = [{
      resource: new LitActionResource('*'),
      ability: LIT_ABILITY.LitActionExecution,
    }];

    const capacityDelegationAuthSig = process.env.CAPACITY_DELEGATION_AUTH_SIG 
      ? JSON.parse(process.env.CAPACITY_DELEGATION_AUTH_SIG)
      : undefined;

    console.log('\nCreating session on datil-test...');
    const sessionSigs = await litNodeClient.getSessionSigs({
      chain: 'ethereum',
      expiration: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      resourceAbilityRequests,
      capacityDelegationAuthSig,
      authNeededCallback: async ({ uri, expiration, resourceAbilityRequests }) => {
        const siweMessage = await createSiweMessageWithRecaps({
          uri: uri || 'https://localhost',
          expiration,
          resources: resourceAbilityRequests,
          walletAddress: wallet.address,
          nonce: await litNodeClient.getLatestBlockhash(),
          litNodeClient,
          domain: 'localhost',
        });

        return await generateAuthSig({ 
          signer: wallet, 
          toSign: siweMessage 
        });
      },
    });

    console.log('✅ Session created on datil-test');
    console.log('\nExecuting Lit Action...');

    const result = await litNodeClient.executeJs({
      code: testLitAction,
      sessionSigs,
      jsParams: {
        publicKey: process.env.PKP_PUBLIC_KEY!
      }
    });

    console.log('\n=== RESULT ===');
    const response = typeof result.response === 'string' 
      ? JSON.parse(result.response) 
      : result.response;
    
    console.log('Success:', response.success);
    console.log('Network:', response.network);
    
    if (response.success) {
      console.log('\n✅ SUCCESS! datil-test network works!');
      console.log('The issue appears to be specific to the datil network.');
    } else {
      console.log('\n❌ Failed on datil-test too');
      console.log('Error:', response.error);
    }
    
    if (result.logs) {
      console.log('\n=== LOGS ===');
      console.log(result.logs);
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await litNodeClient.disconnect();
  }
}

testDatilTestNetwork();