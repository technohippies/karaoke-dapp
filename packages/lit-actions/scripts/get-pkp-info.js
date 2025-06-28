#!/usr/bin/env node
import { LitContracts } from '@lit-protocol/contracts-sdk';
import { LIT_NETWORK, LIT_RPC } from '@lit-protocol/constants';
import ethers5 from 'ethers5';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../../../.env') });

async function getPKPInfo() {
  const tokenId = '76559552406265740119648376362599439011791802977653976103308498886600591922152';
  console.log('Getting PKP info for token ID:', tokenId);
  
  const provider = new ethers5.providers.JsonRpcProvider(LIT_RPC.CHRONICLE_YELLOWSTONE);
  const wallet = new ethers5.Wallet(process.env.PRIVATE_KEY, provider);
  
  const litContracts = new LitContracts({
    signer: wallet,
    network: LIT_NETWORK.DatilTest,
    debug: false
  });
  
  await litContracts.connect();
  
  try {
    // Get PKP public key
    const pkpInfo = await litContracts.pkpNftContract.read.getPubkey(tokenId);
    console.log('PKP Public Key:', pkpInfo);
    
    // Get PKP ETH address
    const pkpEthAddress = ethers5.utils.computeAddress(pkpInfo);
    console.log('PKP ETH Address:', pkpEthAddress);
    
    // Save to file
    const pkpData = {
      tokenId: tokenId,
      publicKey: pkpInfo,
      ethAddress: pkpEthAddress,
      permittedActions: {
        voiceGrader: 'QmZSt2pkbxRiyf9fBRiBxxHEFhJmggoUjEx9eQgz8ei18f',
        sessionSettlement: 'QmNimykTQVgxsGizQdqdJS1BWx7PFGJJ2pcnayEJBRpJTw'
      },
      mintTx: '0xc93fa02ec8f02a45f136fd24b71db9f6a0825f8ec842af26e623e649013262d2',
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
    console.log(`LIT_PKP_TOKEN_ID=${tokenId}`);
    
  } catch (error) {
    console.error('Error getting PKP info:', error);
  }
}

getPKPInfo().catch(console.error);