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

async function testPKPWithRPC() {
  const litNodeClient = new LitNodeClient({
    litNetwork: 'datil',
    debug: true
  });

  try {
    await litNodeClient.connect();
    console.log('Connected to Lit Network');

    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!);
    console.log('Testing with wallet:', wallet.address);

    // Lit Action that checks RPC and network state before signing
    const litActionWithRPC = `
      (async () => {
        console.log('=== PKP SIGNING TEST WITH RPC CHECK ===');
        console.log('Timestamp:', new Date().toISOString());
        
        try {
          // Check RPC connection
          console.log('\\n1. Checking RPC connection...');
          const rpcUrl = await Lit.Actions.getRpcUrl({ chain: "yellowstone" });
          console.log('RPC URL obtained:', rpcUrl ? 'Yes' : 'No');
          
          // Try to get latest block to verify RPC is working
          try {
            const blockNumber = await provider.send("eth_blockNumber", []);
            console.log('Latest block number:', parseInt(blockNumber, 16));
          } catch (e) {
            console.log('Could not fetch block number:', e.message);
          }
          
          // Process public key
          let pkpPubKey = publicKey;
          if (pkpPubKey.startsWith('0x')) {
            pkpPubKey = pkpPubKey.slice(2);
          }
          if (pkpPubKey.startsWith('04') && pkpPubKey.length === 130) {
            pkpPubKey = pkpPubKey.slice(2);
          }
          
          console.log('\\n2. PKP Details:');
          console.log('- Original public key:', publicKey);
          console.log('- Processed public key:', pkpPubKey);
          console.log('- Length:', pkpPubKey.length);
          
          // Compute PKP address
          const fullPubKey = publicKey.startsWith('0x') ? publicKey : '0x' + publicKey;
          const pkpAddress = ethers.utils.computeAddress(fullPubKey);
          console.log('- Computed PKP address:', pkpAddress);
          
          // Simple message to sign
          console.log('\\n3. Preparing message to sign...');
          const message = "Test PKP signing " + Date.now();
          const messageHash = ethers.utils.id(message);
          const messageBytes = ethers.utils.arrayify(messageHash);
          
          console.log('- Message:', message);
          console.log('- Message hash:', messageHash);
          console.log('- Bytes length:', messageBytes.length);
          
          // Attempt signing
          console.log('\\n4. Attempting to sign with PKP...');
          console.log('Calling Lit.Actions.signEcdsa...');
          
          const sigShares = await Lit.Actions.signEcdsa({
            toSign: Array.from(messageBytes),
            publicKey: pkpPubKey,
            sigName: 'testSignature'
          });
          
          console.log('✅ SIGNING SUCCESSFUL!');
          
          Lit.Actions.setResponse({
            response: JSON.stringify({
              success: true,
              message: 'PKP signing successful',
              messageHash: messageHash,
              pkpAddress: pkpAddress,
              timestamp: new Date().toISOString()
            })
          });
          
        } catch (error) {
          console.error('\\n❌ ERROR:', error.toString());
          console.error('Error type:', typeof error);
          console.error('Error stack:', error.stack || 'No stack trace');
          
          Lit.Actions.setResponse({
            response: JSON.stringify({
              success: false,
              error: error.message || error.toString(),
              timestamp: new Date().toISOString()
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

    console.log('\nCreating session...');
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
    console.log('\nExecuting Lit Action...');
    
    const startTime = Date.now();
    const result = await litNodeClient.executeJs({
      code: litActionWithRPC,
      sessionSigs,
      jsParams: {
        publicKey: process.env.PKP_PUBLIC_KEY!
      }
    });
    
    const duration = Date.now() - startTime;
    console.log(`\nExecution completed in ${duration}ms`);

    // Parse and display result
    const response = typeof result.response === 'string' 
      ? JSON.parse(result.response) 
      : result.response;
    
    console.log('\n=== RESULT ===');
    console.log('Success:', response.success);
    
    if (response.success) {
      console.log('✅ PKP signing is working!');
      console.log('Message hash:', response.messageHash);
      console.log('PKP address:', response.pkpAddress);
      
      if (result.signatures && result.signatures.testSignature) {
        console.log('✅ Signature generated');
      }
    } else {
      console.error('❌ PKP signing failed');
      console.error('Error:', response.error);
    }
    
    // Display logs
    if (result.logs) {
      console.log('\n=== LIT ACTION LOGS ===');
      console.log(result.logs);
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await litNodeClient.disconnect();
  }
}

testPKPWithRPC();