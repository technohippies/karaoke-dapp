#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { LitNodeClient } from '@lit-protocol/lit-node-client';
import { ethers } from 'ethers';
import ora from 'ora';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../../.env') });

async function deployMidiDecryptor() {
  const spinner = ora('Preparing to deploy MIDI Decryptor Lit Action...').start();
  
  try {
    // Validate required environment variables
    const contractAddress = process.env.KARAOKE_STORE_ADDRESS;
    if (!contractAddress) {
      throw new Error('KARAOKE_STORE_ADDRESS not set in environment');
    }
    
    // Read the Lit Action source
    const actionPath = path.join(__dirname, '../src/midi-decryptor.js');
    let actionCode = readFileSync(actionPath, 'utf-8');
    
    // Replace the contract address placeholder
    actionCode = actionCode.replace(
      "const MUSIC_STORE_ADDRESS = '<TO_BE_SET>';",
      `const MUSIC_STORE_ADDRESS = '${contractAddress}';`
    );
    
    spinner.text = 'Connecting to Lit Protocol...';
    
    // Initialize Lit client
    const litNodeClient = new LitNodeClient({
      litNetwork: 'datil', // production network
      debug: false
    });
    
    await litNodeClient.connect();
    spinner.text = 'Connected to Lit Protocol';
    
    // Deploy the Lit Action
    spinner.text = 'Uploading Lit Action to IPFS...';
    
    // Convert to base64 for upload
    const base64Code = Buffer.from(actionCode).toString('base64');
    
    // Upload to Lit's IPFS
    const uploadResponse = await fetch('https://datil.litgateway.com/api/v1/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        data: base64Code,
        dataType: 'text/javascript'
      })
    });
    
    if (!uploadResponse.ok) {
      throw new Error(`Upload failed: ${uploadResponse.statusText}`);
    }
    
    const { ipfsId } = await uploadResponse.json();
    spinner.succeed(`Lit Action deployed! CID: ${ipfsId}`);
    
    // Update the action code with its own CID
    const finalCode = actionCode.replace(
      "'<MIDI_DECRYPTOR_ACTION_CID>'",
      `'${ipfsId}'`
    );
    
    // Save the final deployed version
    const deployedPath = path.join(__dirname, '../deployed/midi-decryptor-deployed.js');
    writeFileSync(deployedPath, finalCode);
    
    // Save deployment info
    const deploymentInfo = {
      deployedAt: new Date().toISOString(),
      network: 'datil',
      actionCid: ipfsId,
      contractAddress: contractAddress,
      deployedCode: finalCode
    };
    
    const deploymentPath = path.join(__dirname, '../deployed/deployment-info.json');
    writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
    
    console.log('\n✅ Deployment successful!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`MIDI Decryptor Action CID: ${ipfsId}`);
    console.log(`Contract Address: ${contractAddress}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\nNext steps:');
    console.log('1. Add to your .env file:');
    console.log(`   MIDI_DECRYPTOR_ACTION_CID=${ipfsId}`);
    console.log('2. Test the deployment:');
    console.log('   bun run test-decrypt --cid <encrypted-midi-cid> --song-id 1');
    
    await litNodeClient.disconnect();
    
  } catch (error) {
    spinner.fail(`Deployment failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

// Run deployment
deployMidiDecryptor();