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
const TEST_ACTION_CID = 'QmdMQGxDinAJqADD37xm5GcS8oHTfLu9hUXCq7oyCJNJdU';

async function main() {
  console.log('Testing PKP Signing with Simple Session...\n');

  // Initialize Lit client
  const litNodeClient = new LitNodeClient({
    litNetwork: LIT_NETWORK.DatilTest,
    debug: false
  });

  await litNodeClient.connect();
  console.log('Connected to Lit Network\n');

  // Create wallet
  const provider = new ethers.JsonRpcProvider('https://base-sepolia-rpc.publicnode.com');
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  const walletAddress = await wallet.getAddress();
  
  console.log('Wallet address:', walletAddress);

  try {
    // First get regular session sigs with the wallet
    console.log('Getting regular session signatures...');
    const sessionSigs = await litNodeClient.getSessionSigs({
      chain: 'base',
      expiration: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
      resourceAbilityRequests: [
        {
          resource: new LitActionResource('*'),
          ability: LIT_ABILITY.LitActionExecution,
        },
      ],
      authNeededCallback: async (params) => {
        const domain = 'localhost';
        const origin = 'http://localhost:3000';
        const statement = 'Test PKP Signing Session';
        
        const siweMessage = `${domain} wants you to sign in with your Ethereum account:
${walletAddress}

${statement}

URI: ${origin}
Version: 1
Chain ID: 84532
Nonce: ${params.nonce || await litNodeClient.getLatestBlockhash()}
Issued At: ${new Date().toISOString()}
Expiration Time: ${params.expiration}`;

        const signature = await wallet.signMessage(siweMessage);

        return {
          sig: signature,
          derivedVia: 'web3.eth.personal.sign',
          signedMessage: siweMessage,
          address: walletAddress.toLowerCase(),
        };
      },
    });

    console.log('Got session signatures\n');

    // Execute test action with regular session sigs
    console.log('Executing test PKP signing action...');
    
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
      if (response.signatures && response.signatures.testSig) {
        console.log('Signature:', response.signatures.testSig);
      }
    } else {
      console.log('\n❌ PKP signing test failed:', result.error);
    }
  } catch (error) {
    console.error('\n❌ Error executing test:', error.message);
    if (error.details) {
      console.error('Details:', error.details);
    }
  }

  await litNodeClient.disconnect();
  console.log('\nDisconnected from Lit Network');
}

main().catch(console.error);