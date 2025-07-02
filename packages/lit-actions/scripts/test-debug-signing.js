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
const AUTH_ACTION_CID = 'Qmcfy53FEh4AjeiXeWy3Rsxm4sK4u7ZU19nGJFDZfTHhXV';
const DEBUG_ACTION_CID = 'QmWdjo3Qw6ACsN9fvqZPX8MwndyMTARwnWJkBbJ18F1apP';

async function main() {
  console.log('Testing Debug Signing Action with PKP Session Signatures...\n');

  const litNodeClient = new LitNodeClient({
    litNetwork: LIT_NETWORK.DatilTest,
    debug: false
  });

  await litNodeClient.connect();
  console.log('Connected to Lit Network\n');

  // Create capacity delegation auth sig
  const provider = new ethers.JsonRpcProvider('https://base-sepolia-rpc.publicnode.com');
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  const walletAddress = await wallet.getAddress();
  
  console.log('Wallet address:', walletAddress);
  
  const { capacityDelegationAuthSig } = await litNodeClient.createCapacityDelegationAuthSig({
    dAppOwnerWallet: wallet,
    capacityTokenId: '1',
    delegateeAddresses: [walletAddress],
    uses: '100',
    expiration: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
  });

  console.log('Created capacity delegation auth sig\n');

  // Create auth action code
  const litActionCode = `
    (async () => {
      const authActionResponse = await Lit.Actions.call({
        ipfsId: authActionIpfsId,
        params: {
          userWallet,
          timestamp
        }
      });
      
      if (authActionResponse === true) {
        Lit.Actions.setResponse({ response: true });
      } else {
        Lit.Actions.setResponse({ response: false });
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
        resource: new LitPKPResource('*'),
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

  console.log('Got PKP session signatures');
  console.log('Session sig count:', Object.keys(sessionSigs).length);
  console.log('\n');

  // Execute debug signing action
  console.log('Executing debug signing action...');
  
  try {
    const response = await litNodeClient.executeJs({
      sessionSigs,
      ipfsId: DEBUG_ACTION_CID,
      jsParams: {
        pkpPublicKey: PKP_PUBLIC_KEY,
        ipfsId: DEBUG_ACTION_CID
      }
    });

    console.log('\n=== EXECUTION LOGS ===');
    console.log(response.logs);
    console.log('=== END LOGS ===\n');
    
    const result = JSON.parse(response.response);
    console.log('Result:', result);
    
    if (result.success) {
      console.log('\n✅ Debug action executed successfully');
    } else {
      console.log('\n❌ Debug action failed:', result.error);
    }
  } catch (error) {
    console.error('\n❌ Error executing debug action:', error);
  }

  await litNodeClient.disconnect();
  console.log('\nDisconnected from Lit Network');
}

main().catch(console.error);