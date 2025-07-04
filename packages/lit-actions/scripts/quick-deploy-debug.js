#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../../../.env') });

const PINATA_JWT = process.env.PINATA_JWT;

async function uploadDebugSettlement() {
  // Read the debug session settlement code
  const actionPath = join(__dirname, '../src/session-settlement-debug.js');
  const actionCode = readFileSync(actionPath, 'utf8');
  
  console.log('Uploading debug session settlement to IPFS...');
  console.log('Action code length:', actionCode.length);
  
  // Upload to Pinata
  const formData = new FormData();
  formData.append('file', new Blob([actionCode], { type: 'text/javascript' }), 'session-settlement-debug.js');
  
  const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${PINATA_JWT}`
    },
    body: formData
  });
  
  const result = await response.json();
  
  if (result.IpfsHash) {
    console.log('✅ Uploaded successfully!');
    console.log('New Debug CID:', result.IpfsHash);
    console.log('\nUse this CID for testing:', result.IpfsHash);
    
    return result.IpfsHash;
  } else {
    throw new Error('Upload failed: ' + JSON.stringify(result));
  }
}

uploadDebugSettlement().catch(console.error);