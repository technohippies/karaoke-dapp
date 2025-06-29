#!/usr/bin/env node
import { LitContracts } from '@lit-protocol/contracts-sdk';
import { LIT_NETWORK, LIT_RPC, AUTH_METHOD_TYPE, AUTH_METHOD_SCOPE } from '@lit-protocol/constants';
import ethers5 from 'ethers5';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../../../.env') });

async function addNewActionToPKP() {
  console.log('Adding new session settlement action to PKP...\n');
  
  // Setup
  const provider = new ethers5.providers.JsonRpcProvider(LIT_RPC.CHRONICLE_YELLOWSTONE);
  const wallet = new ethers5.Wallet(process.env.PRIVATE_KEY, provider);
  
  console.log('Wallet address:', wallet.address);
  
  // Get PKP info
  const pkpInfo = JSON.parse(
    readFileSync(join(__dirname, '../deployments/pkp.json'), 'utf8')
  );
  
  // Get new action CID
  const deploymentInfo = JSON.parse(
    readFileSync(join(__dirname, '../deployments/actions.json'), 'utf8')
  );
  
  const newSessionSettlementCID = deploymentInfo.find(a => a.actionName === 'session-settlement').ipfsCid;
  
  console.log('PKP Token ID:', pkpInfo.tokenId);
  console.log('PKP Owner:', pkpInfo.owner);
  console.log('New Session Settlement CID:', newSessionSettlementCID);
  
  // Initialize Lit Contracts
  const litContracts = new LitContracts({
    signer: wallet,
    network: LIT_NETWORK.DatilTest,
    debug: false
  });
  
  await litContracts.connect();
  
  // Convert CID to bytes
  const bs58Module = await import('bs58');
  const bs58 = bs58Module.default;
  
  const sessionSettlementBytes = `0x${Buffer.from(bs58.decode(newSessionSettlementCID)).toString('hex')}`;
  
  console.log('\nAdding new session settlement auth method...');
  
  try {
    // Add the new session settlement action as a permitted auth method
    const tx = await litContracts.pkpPermissionsContract.write.addPermittedAuthMethod(
      pkpInfo.tokenId,
      AUTH_METHOD_TYPE.LitAction,
      sessionSettlementBytes,
      '0x', // empty pubkey for Lit Actions
      [AUTH_METHOD_SCOPE.SignAnything]
    );
    
    console.log('Transaction sent:', tx.hash);
    console.log('Waiting for confirmation...');
    
    const receipt = await tx.wait();
    console.log('Transaction confirmed!');
    
    console.log('\n✅ New session settlement action added successfully!');
    console.log('Your PKP can now use the updated session settlement action.');
    
    // Update .env with new CID
    console.log('\n📝 Update SESSION_SETTLEMENT_CID in .env to:', newSessionSettlementCID);
    
  } catch (error) {
    console.error('Error adding auth method:', error);
    throw error;
  }
}

addNewActionToPKP().catch(console.error);