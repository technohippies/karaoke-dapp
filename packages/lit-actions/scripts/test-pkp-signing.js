import { LitNodeClient } from '@lit-protocol/lit-node-client';
import { LIT_NETWORK, LIT_ABILITY } from '@lit-protocol/constants';
import { LitActionResource, LitPKPResource } from '@lit-protocol/auth-helpers';
import { ethers } from 'ethers';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../../.env') });

const PKP_PUBLIC_KEY = '0x043a1a467808b48e40b0b4da67f75f15b09fe50c294f8aa664b70e51d16e76f973d30be74f3346f7f1ae551da35e93dae7cf5a8eb1ad5b7e3b443421cc078dc519';
const PKP_TOKEN_ID = '196260105590482038746764926465554673089111253714413885679392811947402804195';
const AUTH_ACTION_CID = 'Qmcfy53FEh4AjeiXeWy3Rsxm4sK4u7ZU19nGJFDZfTHhXV';
const TEST_ACTION_CID = 'QmdMQGxDinAJqADD37xm5GcS8oHTfLu9hUXCq7oyCJNJdU';

async function main() {
  console.log('Testing PKP Signing...\n');

  // Initialize Lit client
  const litNodeClient = new LitNodeClient({
    litNetwork: LIT_NETWORK.DatilTest,
    debug: true
  });

  await litNodeClient.connect();
  console.log('Connected to Lit Network\n');

  // Create capacity delegation auth sig
  const provider = new ethers.JsonRpcProvider('https://base-sepolia-rpc.publicnode.com');
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  const walletAddress = await wallet.getAddress();
  
  console.log('Wallet address:', walletAddress);
  
  // Create capacity delegation auth sig for datil-test network
  const { capacityDelegationAuthSig } = await litNodeClient.createCapacityDelegationAuthSig({
    dAppOwnerWallet: wallet,
    capacityTokenId: '1', // Using default capacity credit for datil-test
    delegateeAddresses: [walletAddress],
    uses: '100',
    expiration: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(), // 24 hours
  });

  console.log('Created capacity delegation auth sig\n');

  // Create auth action code for PKP session
  const litActionCode = `
    (async () => {
      // This runs the auth action to verify the user
      const authActionResponse = await Lit.Actions.call({
        ipfsId: authActionIpfsId,
        params: {
          userWallet,
          timestamp
        }
      });
      
      if (authActionResponse === "true") {
        // User is authorized
        Lit.Actions.setResponse({ response: "true" });
      } else {
        // User is not authorized
        Lit.Actions.setResponse({ response: "false" });
      }
    })();
  `;

  // Get PKP session signatures
  console.log('Getting PKP session signatures...');
  const sessionSigs = await litNodeClient.getLitActionSessionSigs({
    pkpPublicKey: PKP_PUBLIC_KEY,
    chain: 'base',
    resourceAbilityRequests: [
      {
        resource: new LitPKPResource('*'), // Using wildcard for simplicity
        ability: LIT_ABILITY.PKPSigning,
      },
      {
        resource: new LitActionResource('*'),
        ability: LIT_ABILITY.LitActionExecution,
      },
    ],
    litActionCode: Buffer.from(litActionCode).toString('base64'),
    jsParams: {
      authActionIpfsId: AUTH_ACTION_CID,
      userWallet: walletAddress,
      timestamp: Date.now(),
    },
    capabilityAuthSigs: [capacityDelegationAuthSig],
  });

  console.log('Got PKP session signatures\n');

  // Execute test action
  console.log('Executing test PKP signing action...');
  
  try {
    const response = await litNodeClient.executeJs({
      sessionSigs,
      ipfsId: TEST_ACTION_CID,
      jsParams: {
        pkpPublicKey: PKP_PUBLIC_KEY
      }
    });

    const result = JSON.parse(response.response);
    console.log('\nTest Result:', result);
    
    if (result.success) {
      console.log('\n✅ PKP signing test successful!');
      console.log('Signature:', response.signatures);
    } else {
      console.log('\n❌ PKP signing test failed:', result.error);
    }
  } catch (error) {
    console.error('\n❌ Error executing test action:', error);
  }

  await litNodeClient.disconnect();
  console.log('\nDisconnected from Lit Network');
}

main().catch(console.error);