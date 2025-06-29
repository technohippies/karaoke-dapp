#!/usr/bin/env node
import { readFileSync } from 'fs';
import path from 'path';
import ora from 'ora';
import dotenv from 'dotenv';
import { ethers } from 'ethers';

dotenv.config();

async function runIntegrationTest() {
  console.log('🎵 Karaoke dApp Integration Test');
  console.log('================================\n');
  
  const results = {
    environment: false,
    contract: false,
    tableland: false,
    litAction: false,
    aioz: false
  };
  
  // 1. Check environment
  const envSpinner = ora('Checking environment variables...').start();
  try {
    const required = [
      'KARAOKE_STORE_ADDRESS',
      'MIDI_DECRYPTOR_ACTION_CID',
      'TABLELAND_PRIVATE_KEY',
      'AIOZ_API_URL'
    ];
    
    const missing = required.filter(key => !process.env[key]);
    if (missing.length > 0) {
      throw new Error(`Missing: ${missing.join(', ')}`);
    }
    
    envSpinner.succeed('Environment configured');
    results.environment = true;
  } catch (error: any) {
    envSpinner.fail(`Environment check failed: ${error.message}`);
  }
  
  // 2. Check contract
  const contractSpinner = ora('Checking KaraokeStore contract...').start();
  try {
    const provider = new ethers.JsonRpcProvider(
      process.env.RPC_URL || 'https://sepolia.base.org'
    );
    
    const code = await provider.getCode(process.env.KARAOKE_STORE_ADDRESS!);
    if (code === '0x') {
      throw new Error('No contract at address');
    }
    
    // Try to call a view function
    const abi = ['function SONG_PACK_PRICE() view returns (uint256)'];
    const contract = new ethers.Contract(
      process.env.KARAOKE_STORE_ADDRESS!,
      abi,
      provider
    );
    
    const price = await contract.SONG_PACK_PRICE();
    contractSpinner.succeed(`Contract deployed (song pack: ${ethers.formatUnits(price, 6)} USDC)`);
    results.contract = true;
  } catch (error: any) {
    contractSpinner.fail(`Contract check failed: ${error.message}`);
  }
  
  // 3. Check Tableland
  const tablelandSpinner = ora('Checking Tableland connection...').start();
  try {
    const response = await fetch(
      'https://testnets.tableland.network/api/v1/query?' +
      new URLSearchParams({
        statement: 'SELECT COUNT(*) as count FROM songs_v5_8453_24 LIMIT 1'
      })
    );
    
    if (!response.ok) {
      throw new Error(`Query failed: ${response.statusText}`);
    }
    
    const data = await response.json();
    tablelandSpinner.succeed(`Tableland accessible (${data.results[0].count} songs)`);
    results.tableland = true;
  } catch (error: any) {
    tablelandSpinner.fail(`Tableland check failed: ${error.message}`);
  }
  
  // 4. Check AIOZ
  const aiozSpinner = ora('Checking AIOZ network...').start();
  try {
    // Try to fetch a known test CID
    const testCid = 'QmWATWQ7fVPP2EFGu71UkfnqhYXDYH566qy47CnJDgvs8u'; // IPFS hello world
    const response = await fetch(
      `${process.env.AIOZ_API_URL}/ipfs/${testCid}`,
      { method: 'HEAD' }
    );
    
    if (response.ok || response.status === 404) {
      aiozSpinner.succeed('AIOZ network accessible');
      results.aioz = true;
    } else {
      throw new Error(`HTTP ${response.status}`);
    }
  } catch (error: any) {
    aiozSpinner.fail(`AIOZ check failed: ${error.message}`);
  }
  
  // 5. Check CID tracker
  const trackerSpinner = ora('Checking CID tracker...').start();
  try {
    const trackerPath = path.join(process.cwd(), 'cid-tracker.json');
    if (require('fs').existsSync(trackerPath)) {
      const tracker = JSON.parse(readFileSync(trackerPath, 'utf-8'));
      const uploadCount = Object.keys(tracker.uploads || {}).length;
      trackerSpinner.succeed(`CID tracker initialized (${uploadCount} uploads)`);
    } else {
      trackerSpinner.warn('CID tracker not initialized yet');
    }
  } catch (error: any) {
    trackerSpinner.fail(`CID tracker check failed: ${error.message}`);
  }
  
  // Summary
  console.log('\n📊 Integration Test Summary');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  const passed = Object.values(results).filter(v => v).length;
  const total = Object.values(results).length;
  
  Object.entries(results).forEach(([component, passed]) => {
    console.log(`${passed ? '✅' : '❌'} ${component}`);
  });
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Result: ${passed}/${total} components ready`);
  
  if (passed === total) {
    console.log('\n🎉 All systems operational! Ready to process songs.');
  } else {
    console.log('\n⚠️  Some components need configuration. Check the deployment guide.');
    process.exit(1);
  }
}

// Run test
runIntegrationTest().catch(console.error);