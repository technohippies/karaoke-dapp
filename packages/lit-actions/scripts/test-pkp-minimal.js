import { LitNodeClient } from '@lit-protocol/lit-node-client';
import { LIT_NETWORK } from '@lit-protocol/constants';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../../.env') });

const PKP_PUBLIC_KEY = '0x043a1a467808b48e40b0b4da67f75f15b09fe50c294f8aa664b70e51d16e76f973d30be74f3346f7f1ae551da35e93dae7cf5a8eb1ad5b7e3b443421cc078dc519';
const TEST_ACTION_CID = 'QmdMQGxDinAJqADD37xm5GcS8oHTfLu9hUXCq7oyCJNJdU';

// Inline test action that just logs info
const TEST_ACTION_CODE = `
(async () => {
  console.log('=== Inline Test Action Started ===');
  console.log('Available globals:', Object.keys(globalThis).filter(k => k.startsWith('Lit')).join(', '));
  
  // Check parameters
  console.log('pkpPublicKey:', typeof pkpPublicKey !== 'undefined' ? pkpPublicKey : 'NOT PROVIDED');
  
  // Check if we can call signEcdsa
  if (typeof Lit !== 'undefined' && typeof Lit.Actions !== 'undefined' && typeof Lit.Actions.signEcdsa === 'function') {
    console.log('Lit.Actions.signEcdsa is available');
    
    // Try minimal signing
    try {
      const message = 'test';
      const encoder = new TextEncoder();
      const data = encoder.encode(message);
      
      console.log('Attempting to sign...');
      const result = await Lit.Actions.signEcdsa({
        toSign: data,
        publicKey: pkpPublicKey,
        sigName: 'sig1'
      });
      
      console.log('Sign result:', result);
    } catch (e) {
      console.log('Sign error:', e.message);
    }
  } else {
    console.log('Lit.Actions.signEcdsa is NOT available');
  }
  
  Lit.Actions.setResponse({ response: 'done' });
})();
`;

async function main() {
  console.log('Minimal PKP Test\n');

  const litNodeClient = new LitNodeClient({
    litNetwork: LIT_NETWORK.DatilTest,
    debug: false
  });

  try {
    await litNodeClient.connect();
    console.log('Connected to Lit Network\n');

    // Create a simple auth sig manually
    const authSig = {
      sig: '0x1234', // dummy sig for testing
      derivedVia: 'web3.eth.personal.sign',
      signedMessage: 'test',
      address: '0x' + '0'.repeat(40) // dummy address
    };
    
    console.log('Using test auth sig\n');

    // First test: Execute inline code with basic session
    console.log('Test 1: Inline code execution...');
    const response1 = await litNodeClient.executeJs({
      authSig,
      code: TEST_ACTION_CODE,
      jsParams: {
        pkpPublicKey: PKP_PUBLIC_KEY
      }
    });
    
    console.log('Response 1:', response1.response);
    console.log('Logs 1:', response1.logs);
    
    // Second test: Execute deployed action
    console.log('\nTest 2: Deployed action execution...');
    try {
      const response2 = await litNodeClient.executeJs({
        authSig,
        ipfsId: TEST_ACTION_CID,
        jsParams: {
          pkpPublicKey: PKP_PUBLIC_KEY
        }
      });
      
      const result = JSON.parse(response2.response);
      console.log('Response 2:', result);
      console.log('Logs 2:', response2.logs);
      
      if (result.success) {
        console.log('\n✅ Test successful!');
      } else {
        console.log('\n❌ Test failed:', result.error);
      }
    } catch (error) {
      console.error('Error executing deployed action:', error.message);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await litNodeClient.disconnect();
    console.log('\nDisconnected');
  }
}

main().catch(console.error);