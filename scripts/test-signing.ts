import { LitNodeClient } from '@lit-protocol/lit-node-client';
import { LIT_ABILITY } from '@lit-protocol/constants';
import { createSiweMessageWithRecaps, generateAuthSig, LitActionResource } from '@lit-protocol/auth-helpers';
import { ethers } from 'ethers';
import axios from 'axios';
import FormData from 'form-data';
import * as dotenv from 'dotenv';

dotenv.config();

async function uploadTestAction() {
  // Upload test action to IPFS
  const actionCode = await Bun.file('./lit-actions/testSigning.js').text();
  
  const formData = new FormData();
  formData.append('file', Buffer.from(actionCode), {
    filename: 'testSigning.js',
    contentType: 'application/javascript',
  });

  const response = await axios.post('https://api.pinata.cloud/pinning/pinFileToIPFS', formData, {
    headers: {
      ...formData.getHeaders(),
      'Authorization': `Bearer ${process.env.PINATA_JWT}`,
    },
  });

  return response.data.IpfsHash;
}

async function testSigning() {
  try {
    // Upload test action
    console.log('Uploading test action...');
    const testActionCid = await uploadTestAction();
    console.log('Test action CID:', testActionCid);

    // Setup
    const provider = new ethers.JsonRpcProvider('https://rpc.ankr.com/eth');
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
    
    const litNodeClient = new LitNodeClient({
      litNetwork: 'datil',
      debug: false,
    });
    
    await litNodeClient.connect();
    console.log('Connected to Lit Network');

    // Create session
    const capacityDelegationAuthSig = JSON.parse(process.env.CAPACITY_DELEGATION_AUTH_SIG!);
    
    const resourceAbilityRequests = [{
      resource: new LitActionResource(testActionCid),
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

    console.log('\nExecuting test action...');
    
    // Execute with different public key formats
    const tests = [
      { 
        name: 'With 0x prefix', 
        publicKey: process.env.PKP_PUBLIC_KEY! 
      },
      { 
        name: 'Without 0x prefix', 
        publicKey: process.env.PKP_PUBLIC_KEY!.slice(2) 
      },
      { 
        name: 'Without 0x and 04 prefix', 
        publicKey: process.env.PKP_PUBLIC_KEY!.slice(4) 
      }
    ];

    for (const test of tests) {
      console.log(`\nTesting: ${test.name}`);
      console.log('Public key:', test.publicKey);
      console.log('Length:', test.publicKey.length);
      
      try {
        const result = await litNodeClient.executeJs({
          ipfsId: testActionCid,
          sessionSigs,
          jsParams: {
            publicKey: test.publicKey,
          },
        });
        
        const response = JSON.parse(result.response as string);
        console.log('Result:', response);
        
        if (response.success) {
          console.log('✅ Signing successful!');
          break;
        }
      } catch (error) {
        console.error('Test failed:', error);
      }
    }

    await litNodeClient.disconnect();
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testSigning();