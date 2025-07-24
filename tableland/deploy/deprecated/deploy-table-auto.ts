#!/usr/bin/env bun
import { spawn } from 'child_process'
import { TABLELAND_CONFIG, type TableName, type NetworkName } from '../../config.js'

/**
 * Automatically selects deployment method based on network
 * - Mainnet networks: Use Ledger hardware wallet
 * - Testnet networks: Use private key from .env
 */
async function deployTableAuto(tableName: TableName, network: NetworkName, derivationPath?: string) {
  const isMainnet = network.includes('mainnet')
  
  console.log(`🎯 Auto-deployment for ${tableName} on ${network}`)
  console.log(`🔧 Method: ${isMainnet ? 'Ledger Hardware Wallet' : 'Private Key (.env)'}`)
  
  // Choose script based on network type
  const script = isMainnet ? 'deploy-table-ledger.ts' : 'deploy-table.ts'
  
  // Build command args
  const args = ['run', script, tableName, network]
  if (isMainnet && derivationPath) {
    args.push(derivationPath)
  }
  
  // Spawn the appropriate deployment script
  const child = spawn('bun', args, {
    stdio: 'inherit',
    cwd: import.meta.dir
  })
  
  // Handle process exit
  child.on('exit', (code) => {
    process.exit(code || 0)
  })
  
  child.on('error', (error) => {
    console.error('❌ Failed to start deployment:', error)
    process.exit(1)
  })
}

// CLI usage
const args = process.argv.slice(2)
if (args.length < 2) {
  console.log('🚀 Tableland Auto-Deployment Tool')
  console.log('Automatically uses Ledger for mainnet, private key for testnet\n')
  console.error('Usage: bun run deploy-table-auto.ts <table-name> <network> [derivation-path]')
  console.error('Tables:', Object.keys(TABLELAND_CONFIG.schemas).join(', '))
  console.error('Networks:', Object.keys(TABLELAND_CONFIG.networks).join(', '))
  console.error('\nExamples:')
  console.error('  Testnet (uses .env): bun run deploy-table-auto.ts songs optimism-sepolia')
  console.error('  Mainnet (uses Ledger): bun run deploy-table-auto.ts songs base-mainnet')
  console.error('  Mainnet with path: bun run deploy-table-auto.ts songs base-mainnet "m/44\'/60\'/0\'/0/1"')
  process.exit(1)
}

const tableName = args[0] as TableName
const network = args[1] as NetworkName
const derivationPath = args[2]

if (!TABLELAND_CONFIG.schemas[tableName]) {
  console.error(`❌ Unknown table: ${tableName}`)
  console.error('Available tables:', Object.keys(TABLELAND_CONFIG.schemas).join(', '))
  process.exit(1)
}

if (!TABLELAND_CONFIG.networks[network]) {
  console.error(`❌ Unknown network: ${network}`)
  console.error('Available networks:', Object.keys(TABLELAND_CONFIG.networks).join(', '))
  process.exit(1)
}

deployTableAuto(tableName, network, derivationPath)