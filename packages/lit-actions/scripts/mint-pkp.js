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

async function mintPKPWithLitActions() {
  console.log('Minting PKP with Lit Action permissions...\n');
  
  // Setup - using ethers v5 for compatibility with Lit SDK
  const provider = new ethers5.providers.JsonRpcProvider(LIT_RPC.CHRONICLE_YELLOWSTONE);
  const wallet = new ethers5.Wallet(process.env.PRIVATE_KEY, provider);
  
  console.log('Wallet address:', wallet.address);
  
  // Get Lit Action CIDs from deployment
  const deploymentInfo = JSON.parse(
    readFileSync(join(__dirname, '../deployments/actions.json'), 'utf8')
  );
  
  const voiceGraderAction = deploymentInfo.find(a => a.actionName === 'voice-grader');
  const sessionSettlementAction = deploymentInfo.find(a => a.actionName === 'session-settlement');
  
  const voiceGraderCID = voiceGraderAction.ipfsCid;
  const sessionSettlementCID = sessionSettlementAction.ipfsCid;
  
  console.log('Voice Grader CID:', voiceGraderCID);
  console.log('Session Settlement CID:', sessionSettlementCID);
  
  // Initialize Lit Contracts
  const litContracts = new LitContracts({
    signer: wallet,
    network: LIT_NETWORK.DatilTest,
    debug: false
  });
  
  await litContracts.connect();
  
  // Convert CIDs to bytes format expected by contract
  // The CIDs need to be converted from base58 to hex
  const bs58Module = await import('bs58');
  const bs58 = bs58Module.default;
  
  const voiceGraderBytes = `0x${Buffer.from(bs58.decode(voiceGraderCID)).toString('hex')}`;
  const sessionSettlementBytes = `0x${Buffer.from(bs58.decode(sessionSettlementCID)).toString('hex')}`;
  
  console.log('\nMinting PKP with permitted Lit Actions...');
  
  try {
    const mintCost = await litContracts.pkpNftContract.read.mintCost();
    console.log('Mint cost:', ethers5.utils.formatEther(mintCost), 'ETH');
    
    // Check wallet balance
    const balance = await provider.getBalance(wallet.address);
    console.log('Wallet balance:', ethers5.utils.formatEther(balance), 'ETH');
    
    if (balance < mintCost) {
      throw new Error('Insufficient ETH balance for minting PKP');
    }
    
    // Mint PKP with both Lit Actions as permitted auth methods
    const tx = await litContracts.pkpHelperContract.write.mintNextAndAddAuthMethods(
      AUTH_METHOD_TYPE.LitAction, // keyType
      [AUTH_METHOD_TYPE.LitAction, AUTH_METHOD_TYPE.LitAction], // permittedAuthMethodTypes
      [voiceGraderBytes, sessionSettlementBytes], // permittedAuthMethodIds
      ['0x', '0x'], // permittedAuthMethodPubkeys
      [
        [AUTH_METHOD_SCOPE.SignAnything], 
        [AUTH_METHOD_SCOPE.SignAnything]
      ], // permittedAuthMethodScopes
      true, // addPkpEthAddressAsPermittedAddress
      true, // sendPkpToItself
      { value: mintCost }
    );
    
    console.log('Transaction sent:', tx.hash);
    console.log('Waiting for confirmation...');
    
    const receipt = await tx.wait();
    console.log('Transaction confirmed!');
    
    // Get the PKP info from events
    console.log('Transaction receipt:', receipt);
    console.log('Number of logs:', receipt.logs.length);
    
    // Look for Transfer event from the PKP NFT contract
    let tokenId;
    for (const log of receipt.logs) {
      try {
        const parsed = litContracts.pkpNftContract.interface.parseLog(log);
        console.log('Parsed event:', parsed.name);
        if (parsed && parsed.name === 'Transfer' && parsed.args.from === '0x0000000000000000000000000000000000000000') {
          tokenId = parsed.args.tokenId;
          console.log('Found PKP mint event! Token ID:', tokenId.toString());
          break;
        }
      } catch {
        // Not a PKP NFT event
      }
    }
    
    if (!tokenId) {
      // Try to get from transaction
      console.log('Looking for PKP token ID in transaction data...');
      // Get latest token ID by checking the total supply
      const totalSupply = await litContracts.pkpNftContract.read.totalSupply();
      tokenId = totalSupply.sub(1); // Latest minted is totalSupply - 1
      console.log('Using latest token ID:', tokenId.toString());
    }
    console.log('\n✅ PKP Minted Successfully!');
    console.log('Token ID:', tokenId.toString());
    
    // Get PKP public key
    const pkpInfo = await litContracts.pkpNftContract.read.getPubkey(tokenId);
    console.log('PKP Public Key:', pkpInfo);
    
    // Get PKP ETH address
    const pkpEthAddress = ethers5.utils.computeAddress(`0x${pkpInfo}`);
    console.log('PKP ETH Address:', pkpEthAddress);
    
    // Save to file
    const pkpData = {
      tokenId: tokenId.toString(),
      publicKey: pkpInfo,
      ethAddress: pkpEthAddress,
      permittedActions: {
        voiceGrader: voiceGraderCID,
        sessionSettlement: sessionSettlementCID
      },
      mintTx: tx.hash,
      network: LIT_NETWORK.DatilTest
    };
    
    const fs = await import('fs');
    fs.writeFileSync(
      join(__dirname, '../deployments/pkp.json'),
      JSON.stringify(pkpData, null, 2)
    );
    
    console.log('\nPKP info saved to deployments/pkp.json');
    console.log('\nPlease update your .env with:');
    console.log(`LIT_PKP_PUBLIC_KEY=${pkpInfo}`);
    console.log(`LIT_PKP_ETH_ADDRESS=${pkpEthAddress}`);
    console.log(`LIT_PKP_TOKEN_ID=${tokenId.toString()}`);
    
    return pkpData;
    
  } catch (error) {
    console.error('Error minting PKP:', error);
    throw error;
  }
}

// Check if we already have a PKP
async function checkExistingPKP() {
  try {
    const fs = await import('fs');
    const pkpPath = join(__dirname, '../deployments/pkp.json');
    if (fs.existsSync(pkpPath)) {
      const pkpData = JSON.parse(fs.readFileSync(pkpPath, 'utf8'));
      console.log('Found existing PKP:');
      console.log('- Token ID:', pkpData.tokenId);
      console.log('- ETH Address:', pkpData.ethAddress);
      console.log('- Public Key:', pkpData.publicKey);
      return pkpData;
    }
  } catch (error) {
    // No existing PKP
  }
  return null;
}

async function main() {
  const existingPKP = await checkExistingPKP();
  if (existingPKP) {
    console.log('\n⚠️  PKP already exists. To mint a new one, delete deployments/pkp.json first.');
    return existingPKP;
  }
  
  return await mintPKPWithLitActions();
}

main().catch(console.error);