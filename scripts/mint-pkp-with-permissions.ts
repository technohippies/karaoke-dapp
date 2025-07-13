import { ethers } from 'ethers';
import { AUTH_METHOD_TYPE, AUTH_METHOD_SCOPE } from '@lit-protocol/constants';
import * as dotenv from 'dotenv';
import bs58 from 'bs58';

dotenv.config();

/**
 * Mints a new PKP with Lit Action permissions.
 * This script bypasses the LitContracts SDK issues by using direct contract calls.
 */
async function mintPKPWithPermissions() {
  console.log('🚀 Minting PKP with Lit Action permissions...\n');
  
  if (!process.env.PRIVATE_KEY || !process.env.LIT_ACTION_CID) {
    throw new Error('Missing required env vars: PRIVATE_KEY, LIT_ACTION_CID');
  }
  
  const provider = new ethers.providers.JsonRpcProvider('https://yellowstone-rpc.litprotocol.com');
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  
  console.log('Wallet address:', wallet.address);
  const balance = await provider.getBalance(wallet.address);
  console.log('Wallet balance:', ethers.utils.formatEther(balance), 'LIT\n');
  
  if (balance.lt(ethers.utils.parseEther('0.01'))) {
    throw new Error('Insufficient balance. Need at least 0.01 LIT');
  }
  
  try {
    // Contract addresses on Datil
    const PKP_NFT_ADDRESS = '0x487A9D096BB4B7Ac1520Cb12370e31e677B175EA';
    const PKP_PERMISSIONS_ADDRESS = '0x213Db6E1446928E19588269bEF7dFc9187c4829A';
    
    // Step 1: Mint PKP
    console.log('📝 Step 1: Minting PKP...');
    const pkpContract = new ethers.Contract(
      PKP_NFT_ADDRESS,
      ['function mintNext(uint256) payable returns (uint256)'],
      wallet
    );
    
    const mintTx = await pkpContract.mintNext(2, { // 2 = ECDSA
      value: 1, // 1 wei mint cost
      gasLimit: 5000000,
    });
    
    console.log('Mint tx:', mintTx.hash);
    const mintReceipt = await mintTx.wait();
    console.log('✅ Minted! Block:', mintReceipt.blockNumber);
    
    // Get token ID from Transfer event
    const transferEvent = mintReceipt.logs.find(
      (log: any) => log.address.toLowerCase() === PKP_NFT_ADDRESS.toLowerCase() &&
                    log.topics[0] === ethers.utils.id('Transfer(address,address,uint256)') &&
                    log.topics[1] === ethers.utils.hexZeroPad('0x0', 32)
    );
    
    if (!transferEvent) {
      throw new Error('Could not find Transfer event');
    }
    
    const tokenId = transferEvent.topics[3];
    console.log('Token ID:', tokenId);
    
    // Get PKP details
    const pkpNftAbi = [
      'function getPubkey(uint256) view returns (bytes)',
      'function ownerOf(uint256) view returns (address)'
    ];
    const pkpNft = new ethers.Contract(PKP_NFT_ADDRESS, pkpNftAbi, provider);
    const pubKey = await pkpNft.getPubkey(tokenId);
    const ethAddress = ethers.utils.computeAddress(pubKey);
    
    console.log('\n✅ PKP Minted:');
    console.log('Public Key:', pubKey);
    console.log('ETH Address:', ethAddress);
    
    // Step 2: Add Lit Action permission
    console.log('\n📝 Step 2: Adding Lit Action permission...');
    
    const litActionCid = process.env.LIT_ACTION_CID;
    const cidBytes = bs58.decode(litActionCid);
    const litActionIdHex = '0x' + Buffer.from(cidBytes).toString('hex');
    
    const permissionsAbi = [
      'function addPermittedAuthMethod(uint256,tuple(uint256,bytes,bytes),uint256[])'
    ];
    const permissionsContract = new ethers.Contract(PKP_PERMISSIONS_ADDRESS, permissionsAbi, wallet);
    
    const addPermTx = await permissionsContract.addPermittedAuthMethod(
      tokenId,
      [AUTH_METHOD_TYPE.LitAction, litActionIdHex, '0x'], // authMethod tuple
      [AUTH_METHOD_SCOPE.SignAnything], // scopes
      { gasLimit: 1000000 }
    );
    
    console.log('Add permission tx:', addPermTx.hash);
    await addPermTx.wait();
    console.log('✅ Lit Action permission added!');
    
    // Step 3: Add wallet permission (for management)
    console.log('\n📝 Step 3: Adding wallet permission...');
    
    const walletAuthId = ethers.utils.keccak256(
      ethers.utils.toUtf8Bytes('wallet:' + wallet.address.toLowerCase())
    );
    
    const addWalletTx = await permissionsContract.addPermittedAuthMethod(
      tokenId,
      [AUTH_METHOD_TYPE.EthWallet, walletAuthId, '0x'],
      [AUTH_METHOD_SCOPE.SignAnything],
      { gasLimit: 1000000 }
    );
    
    console.log('Add wallet permission tx:', addWalletTx.hash);
    await addWalletTx.wait();
    console.log('✅ Wallet permission added!');
    
    // Step 4: Make self-owned (optional)
    const args = process.argv.slice(2);
    const makeSelfOwned = args.includes('--self-owned');
    
    if (makeSelfOwned) {
      console.log('\n📝 Step 4: Making PKP self-owned...');
      console.log('⚠️  WARNING: This is irreversible!');
      
      const transferAbi = ['function transferFrom(address,address,uint256)'];
      const nftForTransfer = new ethers.Contract(PKP_NFT_ADDRESS, transferAbi, wallet);
      
      const transferTx = await nftForTransfer.transferFrom(
        wallet.address,
        ethAddress,
        tokenId,
        { gasLimit: 500000 }
      );
      
      console.log('Transfer tx:', transferTx.hash);
      await transferTx.wait();
      console.log('✅ PKP is now self-owned!');
    }
    
    // Output results
    console.log('\n' + '='.repeat(60));
    console.log('✅ PKP Setup Complete!');
    console.log('='.repeat(60));
    console.log('Token ID:', tokenId);
    console.log('Public Key:', pubKey);
    console.log('ETH Address:', ethAddress);
    console.log('Self-owned:', makeSelfOwned);
    console.log('='.repeat(60));
    
    console.log('\n📝 Update your .env file:');
    console.log(`PKP_TOKEN_ID=${tokenId}`);
    console.log(`PKP_PUBLIC_KEY=${pubKey}`);
    console.log(`PKP_ETH_ADDRESS=${ethAddress}`);
    
    console.log('\n📝 Update apps/web/src/constants.ts:');
    console.log(`export const PKP_PUBLIC_KEY = '${pubKey}'`);
    console.log(`export const PKP_ADDRESS = '${ethAddress}'`);
    
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

// Run with: npx tsx scripts/mint-pkp-with-permissions.ts [--self-owned]
mintPKPWithPermissions();