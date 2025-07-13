import { LitNodeClient } from '@lit-protocol/lit-node-client';
import { LitNetwork } from '@lit-protocol/constants';
import { ethers } from 'ethers';
import * as dotenv from 'dotenv';
import { 
  createSiweMessageWithRecaps,
  generateAuthSig,
  LitActionResource,
  LitPKPResource
} from '@lit-protocol/auth-helpers';
import { LIT_ABILITY } from '@lit-protocol/constants';

dotenv.config();

async function testPKPSigning() {
  const litNodeClient = new LitNodeClient({
    litNetwork: 'datil',
    debug: true
  });

  try {
    await litNodeClient.connect();
    console.log('Connected to Lit Network');

    // Create a wallet for testing
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!);
    console.log('Testing with wallet:', wallet.address);

    // Create a simple Lit Action that just signs a message
    const simpleLitAction = `
      (async () => {
        console.log('Simple PKP signing test');
        console.log('PKP Public Key:', publicKey);
        
        try {
          // Simple message to sign
          const message = "Hello from PKP";
          const messageHash = ethers.utils.id(message);
          const messageBytes = ethers.utils.arrayify(messageHash);
          
          // Sign with PKP
          let pkpPubKey = publicKey;
          if (pkpPubKey.startsWith('0x')) {
            pkpPubKey = pkpPubKey.slice(2);
          }
          if (pkpPubKey.startsWith('04') && pkpPubKey.length === 130) {
            pkpPubKey = pkpPubKey.slice(2);
          }
          
          console.log('Signing with PKP public key:', pkpPubKey);
          
          const sigShares = await Lit.Actions.signEcdsa({
            toSign: Array.from(messageBytes),
            publicKey: pkpPubKey,
            sigName: 'testSig'
          });
          
          console.log('Signature generated successfully');
          
          Lit.Actions.setResponse({
            response: JSON.stringify({
              success: true,
              message: 'PKP signing test successful',
              messageHash: messageHash
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

    // Upload this simple action to test
    console.log('\nTesting with inline Lit Action...');
    
    // Create session sigs
    const resourceAbilityRequests = [
      {
        resource: new LitActionResource('*'),
        ability: LIT_ABILITY.LitActionExecution,
      },
    ];

    // Use capacity delegation if available
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

    // Execute the simple Lit Action
    const result = await litNodeClient.executeJs({
      code: simpleLitAction,
      sessionSigs,
      jsParams: {
        publicKey: process.env.PKP_PUBLIC_KEY!
      }
    });

    console.log('\nResult:', result.response);
    
    // Parse response
    const response = typeof result.response === 'string' 
      ? JSON.parse(result.response) 
      : result.response;
    
    if (response.success) {
      console.log('✅ PKP signing works!');
      console.log('Message hash:', response.messageHash);
      
      if (result.signatures && result.signatures.testSig) {
        console.log('✅ Signature generated:', result.signatures.testSig);
      }
    } else {
      console.error('❌ PKP signing failed:', response.error);
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await litNodeClient.disconnect();
  }
}

testPKPSigning();