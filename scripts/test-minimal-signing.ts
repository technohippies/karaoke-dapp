import { LitNodeClient } from '@lit-protocol/lit-node-client';
import { LIT_ABILITY } from '@lit-protocol/constants';
import { createSiweMessageWithRecaps, generateAuthSig, LitActionResource } from '@lit-protocol/auth-helpers';
import { ethers } from 'ethers';
import * as dotenv from 'dotenv';

dotenv.config();

// Minimal Lit Action that just tries to sign
const litActionCode = `
(async () => {
  try {
    console.log('Starting minimal signing test...');
    console.log('publicKey param:', publicKey);
    
    let pkpPubKey = publicKey;
    if (pkpPubKey.startsWith('0x')) {
      pkpPubKey = pkpPubKey.slice(2);
    }
    
    console.log('PKP public key (processed):', pkpPubKey);
    console.log('Length:', pkpPubKey.length);
    console.log('Starts with 04?:', pkpPubKey.startsWith('04'));
    
    // Simple message
    const message = ethers.utils.toUtf8Bytes("Hello PKP");
    const messageHash = ethers.utils.keccak256(message);
    const hashBytes = ethers.utils.arrayify(messageHash);
    const toSign = Array.from(hashBytes);
    
    console.log('Message hash:', messageHash);
    console.log('To sign array length:', toSign.length);
    console.log('First few bytes:', toSign.slice(0, 5));
    
    console.log('Calling signEcdsa...');
    const sigShares = await Lit.Actions.signEcdsa({
      toSign: toSign,
      publicKey: pkpPubKey,
      sigName: 'testSig'
    });
    
    console.log('Signing successful!');
    
    Lit.Actions.setResponse({
      response: JSON.stringify({
        success: true,
        message: 'Signing successful',
        messageHash: messageHash
      })
    });
    
  } catch (error) {
    console.error('Error:', error.toString());
    console.error('Stack:', error.stack);
    
    Lit.Actions.setResponse({
      response: JSON.stringify({
        success: false,
        error: error.toString(),
        stack: error.stack
      })
    });
  }
})();
`;

async function testMinimalSigning() {
  try {
    const provider = new ethers.JsonRpcProvider('https://rpc.ankr.com/eth');
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
    
    const litNodeClient = new LitNodeClient({
      litNetwork: 'datil',
      debug: false,
    });
    
    await litNodeClient.connect();
    console.log('Connected to Lit Network\n');

    // Create session
    const capacityDelegationAuthSig = JSON.parse(process.env.CAPACITY_DELEGATION_AUTH_SIG!);
    
    const resourceAbilityRequests = [{
      resource: new LitActionResource('*'),
      ability: LIT_ABILITY.LitActionExecution,
    }];

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
          walletAddress: await wallet.getAddress(),
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

    console.log('Executing minimal signing test...\n');
    
    const result = await litNodeClient.executeJs({
      code: litActionCode,
      sessionSigs,
      jsParams: {
        publicKey: process.env.PKP_PUBLIC_KEY!,
      },
    });
    
    console.log('Result:', result.response);
    
    if (result.signatures && result.signatures.testSig) {
      console.log('\n✅ Signature generated:', result.signatures.testSig);
    }

    await litNodeClient.disconnect();
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testMinimalSigning();