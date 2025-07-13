/**
 * Minimal reproduction of PKP signing error
 * 
 * Error: ERC721: invalid token ID
 * Despite PKP being valid and existing on-chain
 */

import { LitNodeClient } from '@lit-protocol/lit-node-client';
import { ethers } from 'ethers';
import { 
  createSiweMessageWithRecaps,
  generateAuthSig,
  LitActionResource
} from '@lit-protocol/auth-helpers';
import { LIT_ABILITY } from '@lit-protocol/constants';

// PKP Details (verified to exist on-chain)
const PKP_PUBLIC_KEY = '0x04a19b108f783dd8c2ab93ab6c66796710afff5b91b86b92ec724cf7067b239b5ba0e3fa2e9136814c1134f8c19323eeb11e597407ae7785dfa0ed2b11c5ce748d';
const PKP_TOKEN_ID = '0x6ec3407ef8c5e518bd1cd7525fd945095c6267c65e7d3c2022df65f7e3bab45b';
const WALLET_PRIVATE_KEY = 'your_private_key_here';

async function reproduceError() {
  const litNodeClient = new LitNodeClient({
    litNetwork: 'datil',
    debug: true
  });

  try {
    await litNodeClient.connect();
    console.log('✅ Connected to Lit Network');

    // Create wallet
    const wallet = new ethers.Wallet(WALLET_PRIVATE_KEY);
    
    // Minimal Lit Action that just tries to sign
    const litAction = `
      (async () => {
        try {
          // Message to sign
          const message = "Hello PKP";
          const messageHash = ethers.utils.id(message);
          const messageBytes = ethers.utils.arrayify(messageHash);
          
          // Process public key (remove 0x and 04 prefix)
          let pkpPubKey = publicKey;
          if (pkpPubKey.startsWith('0x')) {
            pkpPubKey = pkpPubKey.slice(2);
          }
          if (pkpPubKey.startsWith('04') && pkpPubKey.length === 130) {
            pkpPubKey = pkpPubKey.slice(2);
          }
          
          console.log('Attempting to sign with PKP:', pkpPubKey);
          
          // This is where it fails with ERC721: invalid token ID
          const sigShares = await Lit.Actions.signEcdsa({
            toSign: Array.from(messageBytes),
            publicKey: pkpPubKey,
            sigName: 'sig1'
          });
          
          Lit.Actions.setResponse({
            response: JSON.stringify({ success: true })
          });
        } catch (error) {
          console.error('Error:', error);
          Lit.Actions.setResponse({
            response: JSON.stringify({ 
              success: false, 
              error: error.message 
            })
          });
        }
      })();
    `;

    // Create session
    const sessionSigs = await litNodeClient.getSessionSigs({
      chain: 'ethereum',
      expiration: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      resourceAbilityRequests: [{
        resource: new LitActionResource('*'),
        ability: LIT_ABILITY.LitActionExecution,
      }],
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

    console.log('✅ Session created');

    // Execute Lit Action
    const result = await litNodeClient.executeJs({
      code: litAction,
      sessionSigs,
      jsParams: {
        publicKey: PKP_PUBLIC_KEY
      }
    });

    console.log('Result:', result.response);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await litNodeClient.disconnect();
  }
}

// Run: bun run MINIMAL_REPRO.ts
reproduceError();