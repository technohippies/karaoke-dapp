import { LitNodeClient } from '@lit-protocol/lit-node-client';
import { LIT_ABILITY } from '@lit-protocol/constants';
import { createSiweMessageWithRecaps, generateAuthSig, LitActionResource } from '@lit-protocol/auth-helpers';
import { ethers } from 'ethers';
import * as dotenv from 'dotenv';

dotenv.config();

const DEBUG_LIT_ACTION_CID = 'QmcGpHHeMxXaQBPzLgFUxWkwgkRKJoX3YY5vLf41EvitLw';

async function testDebugParams() {
  try {
    console.log('Testing parameter passing to IPFS Lit Action...\n');
    console.log('Debug Lit Action CID:', DEBUG_LIT_ACTION_CID);
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

    console.log('\nExecuting debug params test from IPFS...');
    
    const result = await litNodeClient.executeJs({
      ipfsId: DEBUG_LIT_ACTION_CID,
      sessionSigs,
      jsParams: {
        publicKey: process.env.PKP_PUBLIC_KEY!,
      },
    });
    
    console.log('\nResult:', result.response);
    
    if (result.signatures && result.signatures.debugSig) {
      console.log('\n✅ IPFS signing works! Signature:', result.signatures.debugSig);
    } else {
      console.log('\n❌ No signature generated from IPFS');
    }

    await litNodeClient.disconnect();
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testDebugParams();