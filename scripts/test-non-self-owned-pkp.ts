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

// Non-self-owned PKP details
const NON_SELF_OWNED_PKP_PUBLIC_KEY = '0x04b7ea5d4bc7dcd20311e4fa855ef058044f6d0e06123253573246819603448d43d39c7e7a67e45bbf7ee4ed58f035ae227a2a79e7af62b45e0eb7d837eaa9df31';

async function testNonSelfOwnedPKP() {
  const litNodeClient = new LitNodeClient({
    litNetwork: 'datil',
    debug: true
  });

  try {
    await litNodeClient.connect();
    console.log('Connected to Lit Network');

    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!);
    console.log('Testing with wallet:', wallet.address);
    console.log('PKP Owner: Same as wallet (non-self-owned)');

    // Simple Lit Action
    const simpleLitAction = `
      (async () => {
        console.log('=== TESTING NON-SELF-OWNED PKP ===');
        
        try {
          const message = "Test non-self-owned PKP";
          const messageHash = ethers.utils.id(message);
          const messageBytes = ethers.utils.arrayify(messageHash);
          
          let pkpPubKey = publicKey;
          if (pkpPubKey.startsWith('0x')) {
            pkpPubKey = pkpPubKey.slice(2);
          }
          if (pkpPubKey.startsWith('04') && pkpPubKey.length === 130) {
            pkpPubKey = pkpPubKey.slice(2);
          }
          
          console.log('PKP public key:', pkpPubKey);
          console.log('Attempting to sign...');
          
          const sigShares = await Lit.Actions.signEcdsa({
            toSign: Array.from(messageBytes),
            publicKey: pkpPubKey,
            sigName: 'testSig'
          });
          
          console.log('✅ SIGNING SUCCESSFUL!');
          
          Lit.Actions.setResponse({
            response: JSON.stringify({
              success: true,
              message: 'Non-self-owned PKP works!'
            })
          });
        } catch (error) {
          console.error('Error:', error);
          Lit.Actions.setResponse({
            response: JSON.stringify({
              success: false,
              error: error.message || String(error)
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

    console.log('Session created successfully');

    // Execute
    const result = await litNodeClient.executeJs({
      code: simpleLitAction,
      sessionSigs,
      jsParams: {
        publicKey: NON_SELF_OWNED_PKP_PUBLIC_KEY
      }
    });

    console.log('\nResult:', result.response);
    
    const response = typeof result.response === 'string' 
      ? JSON.parse(result.response) 
      : result.response;
    
    if (response.success) {
      console.log('✅ NON-SELF-OWNED PKP WORKS!');
      console.log('This confirms the issue is with self-owned PKPs');
    } else {
      console.error('❌ Still failing:', response.error);
    }
    
    if (result.logs) {
      console.log('\nLogs:', result.logs);
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await litNodeClient.disconnect();
  }
}

testNonSelfOwnedPKP();