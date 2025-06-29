#!/usr/bin/env node
/**
 * Mint PKP v3 with correct session settlement CID
 */
import { LitContracts } from '@lit-protocol/contracts-sdk';
import { LIT_NETWORK, LIT_RPC, AUTH_METHOD_TYPE, AUTH_METHOD_SCOPE } from '@lit-protocol/constants';
import ethers5 from 'ethers5';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, writeFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../../../.env') });

async function mintPKPv3() {
  console.log('Minting PKP v3 with correct auth methods...\n');
  
  // Setup
  const provider = new ethers5.providers.JsonRpcProvider(LIT_RPC.CHRONICLE_YELLOWSTONE);
  const wallet = new ethers5.Wallet(process.env.PRIVATE_KEY, provider);
  
  console.log('Minting from wallet:', wallet.address);
  
  // Get current Lit Action deployments
  const deploymentInfo = JSON.parse(
    readFileSync(join(__dirname, '../deployments/actions.json'), 'utf8')
  );
  
  const voiceGraderAction = deploymentInfo.find(a => a.actionName === 'voice-grader');
  const sessionSettlementAction = deploymentInfo.find(a => a.actionName === 'session-settlement');
  
  const voiceGraderCID = voiceGraderAction.ipfsCid;
  const sessionSettlementCID = sessionSettlementAction.ipfsCid;
  
  console.log('Voice Grader CID:', voiceGraderCID);
  console.log('Session Settlement CID:', sessionSettlementCID);
  console.log('(Using the NEW session settlement with signing logic!)');
  
  // Initialize Lit Contracts
  const litContracts = new LitContracts({
    signer: wallet,
    network: LIT_NETWORK.DatilTest,
    debug: false
  });
  
  await litContracts.connect();
  
  // Convert CIDs to bytes
  const bs58Module = await import('bs58');
  const bs58 = bs58Module.default;
  
  const voiceGraderBytes = `0x${Buffer.from(bs58.decode(voiceGraderCID)).toString('hex')}`;
  const sessionSettlementBytes = `0x${Buffer.from(bs58.decode(sessionSettlementCID)).toString('hex')}`;
  const walletAuthBytes = ethers5.utils.hexlify(ethers5.utils.toUtf8Bytes(wallet.address.toLowerCase()));
  
  console.log('\nPreparing to mint PKP with 3 auth methods:');
  console.log('1. Voice Grader Lit Action');
  console.log('2. Session Settlement Lit Action (NEW)');
  console.log('3. Wallet:', wallet.address);
  
  try {
    const mintCost = await litContracts.pkpNftContract.read.mintCost();
    console.log('\nMint cost:', ethers5.utils.formatEther(mintCost), 'ETH');
    
    // Check balance
    const balance = await provider.getBalance(wallet.address);
    console.log('Wallet balance:', ethers5.utils.formatEther(balance), 'ETH');
    
    if (balance < mintCost) {
      throw new Error('Insufficient ETH balance for minting PKP');
    }
    
    // Mint PKP with all three auth methods
    const tx = await litContracts.pkpHelperContract.write.mintNextAndAddAuthMethods(
      AUTH_METHOD_TYPE.LitAction, // keyType for the PKP itself
      [
        AUTH_METHOD_TYPE.LitAction,      // Voice grader
        AUTH_METHOD_TYPE.LitAction,      // Session settlement (NEW CID)
        AUTH_METHOD_TYPE.EthWallet       // Admin wallet
      ],
      [
        voiceGraderBytes,
        sessionSettlementBytes,          // NEW CID!
        walletAuthBytes
      ],
      [
        '0x',  // No pubkey for Lit Actions
        '0x',  // No pubkey for Lit Actions
        '0x'   // No pubkey for wallet
      ],
      [
        [AUTH_METHOD_SCOPE.SignAnything],  // Voice grader can sign
        [AUTH_METHOD_SCOPE.SignAnything],  // Session settlement can sign
        [AUTH_METHOD_SCOPE.SignAnything]   // Wallet can sign
      ],
      false, // DON'T send PKP to itself - we keep control
      false, // DON'T add PKP eth address as permitted
      { value: mintCost }
    );
    
    console.log('\nTransaction sent:', tx.hash);
    console.log('Waiting for confirmation...');
    
    const receipt = await tx.wait();
    console.log('Transaction confirmed!');
    
    // Get the minted token ID from events
    let tokenId;
    for (const log of receipt.logs) {
      try {
        const parsed = litContracts.pkpNftContract.interface.parseLog(log);
        if (parsed && parsed.name === 'Transfer' && parsed.args.from === '0x0000000000000000000000000000000000000000') {
          tokenId = parsed.args.tokenId;
          console.log('\nFound PKP mint event! Token ID:', tokenId.toString());
          break;
        }
      } catch {
        // Not a PKP NFT event
      }
    }
    
    if (!tokenId) {
      console.log('Getting latest token ID...');
      const totalSupply = await litContracts.pkpNftContract.read.totalSupply();
      tokenId = totalSupply.sub(1);
    }
    
    console.log('\n✅ PKP v3 Minted Successfully!');
    console.log('Token ID:', tokenId.toString());
    
    // Wait for PKP initialization
    console.log('Waiting for PKP initialization...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Get PKP details
    let pkpInfo = await litContracts.pkpNftContract.read.getPubkey(tokenId);
    
    // Retry if empty
    if (!pkpInfo || pkpInfo === '0x' || pkpInfo === '0x0') {
      console.log('PKP not ready yet, retrying...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      pkpInfo = await litContracts.pkpNftContract.read.getPubkey(tokenId);
    }
    
    // Remove 0x prefix if present
    if (pkpInfo.startsWith('0x')) {
      pkpInfo = pkpInfo.slice(2);
    }
    
    console.log('PKP Public Key:', `0x${pkpInfo}`);
    
    const pkpEthAddress = ethers5.utils.computeAddress(`0x${pkpInfo}`);
    console.log('PKP ETH Address:', pkpEthAddress);
    
    // Save to file
    const pkpData = {
      tokenId: tokenId.toString(),
      publicKey: `0x${pkpInfo}`,
      ethAddress: pkpEthAddress,
      owner: wallet.address,
      adminWallet: wallet.address,
      permittedActions: {
        voiceGrader: voiceGraderCID,
        sessionSettlement: sessionSettlementCID  // NEW CID!
      },
      hasWalletAuth: true,
      mintTx: tx.hash,
      network: LIT_NETWORK.DatilTest,
      version: 3,
      timestamp: new Date().toISOString()
    };
    
    // Save as both pkp-v3.json and update pkp.json
    writeFileSync(
      join(__dirname, '../deployments/pkp-v3.json'),
      JSON.stringify(pkpData, null, 2)
    );
    
    writeFileSync(
      join(__dirname, '../deployments/pkp.json'),
      JSON.stringify(pkpData, null, 2)
    );
    
    console.log('\n✅ PKP info saved to deployments/pkp-v3.json and pkp.json');
    console.log('\n🎉 PKP v3 is ready with:');
    console.log('   - Voice grader action');
    console.log('   - NEW session settlement action');
    console.log('   - Wallet auth for session signatures');
    
    return pkpData;
    
  } catch (error) {
    console.error('Error minting PKP:', error);
    throw error;
  }
}

mintPKPv3().catch(console.error);