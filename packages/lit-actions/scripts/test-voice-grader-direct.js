import { EncryptionService } from '../../../karaoke-dapp/packages/services/src/encryption.service.js';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../../.env') });

const PKP_PUBLIC_KEY = '0x043a1a467808b48e40b0b4da67f75f15b09fe50c294f8aa664b70e51d16e76f973d30be74f3346f7f1ae551da35e93dae7cf5a8eb1ad5b7e3b443421cc078dc519';
const PKP_TOKEN_ID = '196260105590482038746764926465554673089111253714413885679392811947402804195';
const AUTH_ACTION_CID = 'Qmcfy53FEh4AjeiXeWy3Rsxm4sK4u7ZU19nGJFDZfTHhXV';
const VOICE_GRADER_CID = 'QmYhWUGmaRnZ4toeWKfSPhFhVCbhpBcnBFmPZdvmo7yLbS';

// Mock audio data (base64 encoded silent audio)
const MOCK_AUDIO_BASE64 = 'UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';

async function main() {
  console.log('Testing Voice Grader with PKP Session Signatures...\n');

  const encryptionService = new EncryptionService();
  
  try {
    // Connect to Lit
    await encryptionService.connect();
    console.log('Connected to Lit Network\n');

    // Get PKP session signatures
    console.log('Getting PKP session signatures...');
    const sessionSigs = await encryptionService.getPkpSessionSigs(
      PKP_PUBLIC_KEY,
      AUTH_ACTION_CID,
      PKP_TOKEN_ID
    );
    console.log('Got PKP session signatures\n');

    // Test voice grader directly
    console.log('Executing voice grader Lit Action...');
    const response = await encryptionService.executeDeployedLitAction(
      VOICE_GRADER_CID,
      {
        audioData: MOCK_AUDIO_BASE64,
        expectedText: 'Hello world',
        keywords: ['hello', 'world'],
        sessionId: 'test-session-' + Date.now(),
        lineIndex: 0,
        recallBucketId: 'test-bucket',
        pkpPublicKey: PKP_PUBLIC_KEY
      },
      sessionSigs
    );

    console.log('\nVoice Grader Response:', response);
    
    const result = JSON.parse(response);
    if (result.success) {
      console.log('\n✅ Voice grader executed successfully!');
      console.log('Line result:', result.lineResult);
      if (result.lineResult.signature) {
        console.log('PKP signature obtained!');
      }
    } else {
      console.log('\n❌ Voice grader failed:', result.error);
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.details) {
      console.error('Details:', error.details);
    }
    if (error.info) {
      console.error('Info:', error.info);
    }
  } finally {
    await encryptionService.disconnect();
    console.log('\nDisconnected from Lit Network');
  }
}

main().catch(console.error);