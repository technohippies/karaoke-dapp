#!/usr/bin/env node

import dotenv from 'dotenv';
import { readFileSync } from 'fs';

// Load environment variables
dotenv.config();

console.log('🔍 Verifying Environment Configuration\n');

// Check network configuration
console.log('📡 Network Configuration:');
console.log(`  Chain ID: ${process.env.VITE_DEFAULT_CHAIN_ID}`);
console.log(`  Network Name: ${process.env.VITE_NETWORK_NAME}`);
console.log(`  Expected: Base Sepolia (84532)\n`);

// Check contract addresses
console.log('📄 Contract Configuration:');
console.log(`  Karaoke Contract: ${process.env.VITE_KARAOKE_CONTRACT}`);
console.log(`  USDC Address: ${process.env.VITE_BASE_SEPOLIA_USDC_ADDRESS}`);
console.log(`  Expected Contract: 0xc7D24B90C69c6F389fbC673987239f62F0869e3a\n`);

// Check Tableland configuration
console.log('🗃️ Tableland Configuration:');
console.log(`  Songs Table: ${process.env.VITE_SONGS_TABLE_NAME}`);
console.log(`  Expected: karaoke_songs_11155420_11155420_220\n`);

// Verify consistency
console.log('✅ Consistency Checks:');
const chainId = parseInt(process.env.VITE_DEFAULT_CHAIN_ID);
const isBaseSepolia = chainId === 84532;
const contractMatches = process.env.KARAOKE_CONTRACT === process.env.VITE_KARAOKE_CONTRACT;

console.log(`  Is Base Sepolia: ${isBaseSepolia ? '✓' : '✗'}`);
console.log(`  Contract addresses match: ${contractMatches ? '✓' : '✗'}`);
console.log(`  Testnet features enabled: ${process.env.VITE_ENABLE_TESTNET_FEATURES === 'true' ? '✓' : '✗'}`);

// Summary
console.log('\n📊 Summary:');
if (isBaseSepolia && contractMatches) {
  console.log('  ✅ Environment correctly configured for Base Sepolia!');
} else {
  console.log('  ❌ Environment configuration issues detected!');
  process.exit(1);
}