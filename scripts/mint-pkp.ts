import { LitNodeClient } from '@lit-protocol/lit-node-client';
import { AuthMethodType, AuthMethodScope, LIT_NETWORK } from '@lit-protocol/constants';
import { LitContracts } from '@lit-protocol/contracts-sdk';
import { ethers } from 'ethers';
import { ethers as ethersV5 } from '@lit-protocol/contracts-sdk/node_modules/ethers';
import * as dotenv from 'dotenv';
import bs58 from 'bs58';

dotenv.config();

async function mintPKPWithLitAction() {
  try {
    // Validate environment
    if (!process.env.PRIVATE_KEY || !process.env.LIT_ACTION_CID) {
      throw new Error('PRIVATE_KEY or LIT_ACTION_CID not found in .env file');
    }

    // Setup provider and wallet for Chronicle Yellowstone
    const provider = new ethers.JsonRpcProvider('https://yellowstone-rpc.litprotocol.com');
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    
    console.log('Wallet address:', await wallet.getAddress());
    
    // Check wallet balance
    const balance = await provider.getBalance(wallet.address);
    console.log('Wallet balance:', ethers.formatEther(balance), 'LIT');
    
    if (balance === 0n) {
      throw new Error('Wallet has no LIT tokens. Please fund your wallet on Chronicle Yellowstone.');
    }

    // Create ethers v5 wallet for contracts SDK
    const providerV5 = new ethersV5.providers.JsonRpcProvider('https://yellowstone-rpc.litprotocol.com');
    const walletV5 = new ethersV5.Wallet(process.env.PRIVATE_KEY, providerV5);

    // Initialize Lit contracts
    const litContracts = new LitContracts({
      signer: walletV5,
      network: 'datil',
      debug: false,
    });
    
    await litContracts.connect();
    console.log('Connected to Lit Contracts');

    // Prepare wallet auth method (for management)
    const walletAuthMethod = {
      authMethodType: AuthMethodType.EthWallet,
      authMethodId: ethersV5.utils.getAddress(await walletV5.getAddress()).toLowerCase(),
    };

    // Prepare Lit Action auth method
    const litActionCid = process.env.LIT_ACTION_CID;
    const litActionIdHex = '0x' + Buffer.from(bs58.decode(litActionCid)).toString('hex');
    const litActionAuthMethod = {
      authMethodType: AuthMethodType.LitAction,
      authMethodId: litActionIdHex,
    };

    console.log('Minting PKP with auth methods:');
    console.log('- Wallet:', walletAuthMethod);
    console.log('- Lit Action CID:', litActionCid);
    console.log('- Lit Action ID (hex):', litActionIdHex);

    // Get mint cost
    const mintCost = await litContracts.pkpNftContract.read.mintCost();
    console.log('Mint cost:', ethersV5.utils.formatEther(mintCost), 'LIT');

    // Mint PKP with both auth methods and signing scope
    const tx = await litContracts.pkpHelperContract.write.mintNextAndAddAuthMethods(
      2, // keyType (2 = ECDSA)
      [walletAuthMethod.authMethodType, litActionAuthMethod.authMethodType], // auth method types
      [walletAuthMethod.authMethodId, litActionAuthMethod.authMethodId], // auth method IDs
      ['0x', '0x'], // pubkeys (empty for both)
      [[AuthMethodScope.SignAnything], [AuthMethodScope.SignAnything]], // scopes (1 = signing for both)
      true, // addPkpEthAddressAsPermittedAddress
      true, // sendPkpToItself (self-owned)
      { value: mintCost }
    );

    console.log('Mint transaction sent:', tx.hash);
    
    // Wait for transaction
    const receipt = await tx.wait();
    console.log('Transaction confirmed in block:', receipt.blockNumber);

    // Parse the PKP info from events
    console.log('Parsing transaction receipt...');
    const events = receipt.events || receipt.logs || [];
    
    // Look for the Transfer event from address 0x0 (minting)
    let tokenId;
    for (const event of events) {
      if (event.topics && event.topics[0] === ethersV5.utils.id('Transfer(address,address,uint256)')) {
        // Token ID is the third topic
        tokenId = event.topics[3];
        break;
      }
    }
    
    if (!tokenId) {
      // If we can't find it in events, get it from the contract
      const totalSupply = await litContracts.pkpNftContract.read.totalSupply();
      tokenId = totalSupply.sub(1); // Last minted token
    }
    
    // Get PKP info using the token ID
    const pkpTokenId = tokenId.toString();
    const pkpPublicKey = await litContracts.pkpNftContract.read.getPubkey(tokenId);
    const pkpEthAddress = ethersV5.utils.computeAddress(pkpPublicKey);

    console.log('\n✅ PKP Minted Successfully with Lit Action Permission!');
    console.log('='.repeat(50));
    console.log('PKP Token ID:', pkpTokenId);
    console.log('PKP Public Key:', pkpPublicKey);
    console.log('PKP ETH Address:', pkpEthAddress);
    console.log('='.repeat(50));
    
    console.log('\n📝 Update your .env file with:');
    console.log(`PKP_TOKEN_ID=${pkpTokenId}`);
    console.log(`PKP_PUBLIC_KEY=${pkpPublicKey}`);
    console.log(`PKP_ETH_ADDRESS=${pkpEthAddress}`);
    
    console.log('\n✅ The PKP is now:');
    console.log('- Self-owned (immutable)');
    console.log('- Your wallet can manage it via PKP sessions');
    console.log('- The Lit Action can sign with it immediately');
  } catch (error) {
    console.error('Error minting PKP:', error);
    process.exit(1);
  }
}

mintPKPWithLitAction();