#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../../../.env') });

const PINATA_JWT = process.env.PINATA_JWT;

async function uploadSessionSettlement() {
  // Read the fixed session settlement code
  const actionPath = join(__dirname, '../src/session-settlement.js');
  const actionCode = readFileSync(actionPath, 'utf8');
  
  console.log('Uploading fixed session settlement to IPFS...');
  console.log('Action code length:', actionCode.length);
  
  // Upload to Pinata
  const formData = new FormData();
  formData.append('file', new Blob([actionCode], { type: 'text/javascript' }), 'session-settlement.js');
  
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
    console.log('New CID:', result.IpfsHash);
    
    // Update actions.json
    const actionsPath = join(__dirname, '../deployments/actions.json');
    const actions = JSON.parse(readFileSync(actionsPath, 'utf8'));
    
    // Update session settlement entry
    const sessionSettlementIndex = actions.findIndex(a => a.actionName === 'session-settlement');
    if (sessionSettlementIndex >= 0) {
      actions[sessionSettlementIndex].ipfsCid = result.IpfsHash;
      actions[sessionSettlementIndex].deployedAt = new Date().toISOString();
    }
    
    writeFileSync(actionsPath, JSON.stringify(actions, null, 2));
    console.log('✅ Updated actions.json');
    
    return result.IpfsHash;
  } else {
    throw new Error('Upload failed: ' + JSON.stringify(result));
  }
}

uploadSessionSettlement().catch(console.error);