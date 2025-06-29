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

async function updatePKPAuthMethods() {
  console.log('Updating PKP auth methods with current Lit Action CIDs...\n');
  
  // Setup - using ethers v5 for compatibility with Lit SDK
  const provider = new ethers5.providers.JsonRpcProvider(LIT_RPC.CHRONICLE_YELLOWSTONE);
  const wallet = new ethers5.Wallet(process.env.PRIVATE_KEY, provider);
  
  console.log('Wallet address:', wallet.address);
  
  // Get PKP info
  const pkpInfo = JSON.parse(
    readFileSync(join(__dirname, '../deployments/pkp.json'), 'utf8')
  );
  
  // Get current Lit Action CIDs from deployment
  const deploymentInfo = JSON.parse(
    readFileSync(join(__dirname, '../deployments/actions.json'), 'utf8')
  );
  
  const voiceGraderAction = deploymentInfo.find(a => a.actionName === 'voice-grader');
  const sessionSettlementAction = deploymentInfo.find(a => a.actionName === 'session-settlement');
  
  const voiceGraderCID = voiceGraderAction.ipfsCid;
  const sessionSettlementCID = sessionSettlementAction.ipfsCid;
  
  console.log('Current PKP Token ID:', pkpInfo.tokenId);
  console.log('Current Voice Grader CID:', voiceGraderCID);
  console.log('Current Session Settlement CID:', sessionSettlementCID);
  console.log('PKP recorded Session Settlement CID:', pkpInfo.permittedActions.sessionSettlement);
  
  // Check if update is needed
  if (pkpInfo.permittedActions.sessionSettlement === sessionSettlementCID) {
    console.log('\n✅ PKP auth methods are already up to date!');
    return pkpInfo;
  }
  
  console.log('\n⚠️  PKP auth methods need updating...');
  
  // Initialize Lit Contracts
  const litContracts = new LitContracts({
    signer: wallet,
    network: LIT_NETWORK.DatilTest,
    debug: false
  });
  
  await litContracts.connect();
  
  // Convert CID to bytes format expected by contract (same as mint script)
  const bs58Module = await import('bs58');
  const bs58 = bs58Module.default;
  
  const sessionSettlementBytes = `0x${Buffer.from(bs58.decode(sessionSettlementCID)).toString('hex')}`;
  
  console.log('Session Settlement CID:', sessionSettlementCID);
  console.log('Session Settlement Auth Method ID:', sessionSettlementBytes);
  console.log('Adding new session settlement auth method...');
  
  try {
    // Add the new session settlement action as a permitted auth method
    // The method expects: tokenId, authMethodType, authMethodId
    const tx = await litContracts.pkpPermissionsContract.write.addPermittedAuthMethod(
      pkpInfo.tokenId,
      {
        authMethodType: AUTH_METHOD_TYPE.LitAction,
        id: sessionSettlementBytes,
        userPubkey: '0x'
      },
      [AUTH_METHOD_SCOPE.SignAnything]
    );
    
    console.log('Transaction sent:', tx.hash);
    console.log('Waiting for confirmation...');
    
    const receipt = await tx.wait();
    console.log('Transaction confirmed!');
    
    console.log('\n✅ PKP auth methods updated successfully!');
    
    // Update the PKP info file
    const updatedPKPInfo = {
      ...pkpInfo,
      permittedActions: {
        ...pkpInfo.permittedActions,
        sessionSettlement: sessionSettlementCID
      }
    };
    
    const fs = await import('fs');
    fs.writeFileSync(
      join(__dirname, '../deployments/pkp.json'),
      JSON.stringify(updatedPKPInfo, null, 2)
    );
    
    console.log('PKP info updated in deployments/pkp.json');
    
    return updatedPKPInfo;
    
  } catch (error) {
    console.error('Error updating PKP auth methods:', error);
    throw error;
  }
}

updatePKPAuthMethods().catch(console.error);