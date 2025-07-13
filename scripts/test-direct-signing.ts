import { LitNodeClient } from '@lit-protocol/lit-node-client';
import { LIT_ABILITY } from '@lit-protocol/constants';
import { createSiweMessageWithRecaps, generateAuthSig, LitActionResource } from '@lit-protocol/auth-helpers';
import { ethers } from 'ethers';
import * as dotenv from 'dotenv';

dotenv.config();

// Direct signing test - same as minimal but with current PKP
const litActionCode = `
(async () => {
  try {
    console.log('Direct signing test...');
    
    // Simple message
    const message = ethers.utils.toUtf8Bytes("Test signing with PKP");
    const messageHash = ethers.utils.keccak256(message);
    const hashBytes = ethers.utils.arrayify(messageHash);
    const toSign = Array.from(hashBytes);
    
    // Use the publicKey parameter passed in
    let pkpPubKey = publicKey;
    if (pkpPubKey.startsWith('0x')) {
      pkpPubKey = pkpPubKey.slice(2);
    }
    
    console.log('PKP public key:', pkpPubKey);
    console.log('Length:', pkpPubKey.length);
    console.log('Starts with 04?:', pkpPubKey.startsWith('04'));
    
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
        message: 'Direct signing successful',
        pkpPubKey: pkpPubKey
      })
    });
    
  } catch (error) {
    console.error('Error:', error.toString());
    Lit.Actions.setResponse({
      response: JSON.stringify({
        success: false,
        error: error.toString()
      })
    });
  }
})();
`;

async function testDirectSigning() {
  try {
    console.log('Testing direct signing with current PKP...\n');
    console.log('PKP Address:', process.env.PKP_ETH_ADDRESS);
    console.log('PKP Public Key:', process.env.PKP_PUBLIC_KEY);
    
    const provider = new ethers.JsonRpcProvider('https://rpc.ankr.com/eth');
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
    
    const litNodeClient = new LitNodeClient({
      litNetwork: 'datil',
      debug: false,
    });
    
    await litNodeClient.connect();
    console.log('\nConnected to Lit Network');

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

    console.log('\nExecuting direct signing test...');
    
    const result = await litNodeClient.executeJs({
      code: litActionCode,
      sessionSigs,
      jsParams: {
        publicKey: process.env.PKP_PUBLIC_KEY!,
      },
    });
    
    console.log('\nResult:', result.response);
    
    if (result.signatures && result.signatures.testSig) {
      console.log('\n✅ Signature generated:', result.signatures.testSig);
      console.log('\nDirect signing works! The issue is specific to the IPFS Lit Action.');
    } else {
      console.log('\n❌ No signature generated');
    }

    await litNodeClient.disconnect();
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testDirectSigning();