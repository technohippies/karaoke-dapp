import { LitContracts } from '@lit-protocol/contracts-sdk';
import { ethers as ethersV5 } from '@lit-protocol/contracts-sdk/node_modules/ethers';
import { AuthMethodType, AuthMethodScope } from '@lit-protocol/constants';
import * as dotenv from 'dotenv';
import bs58 from 'bs58';

dotenv.config();

async function addLitActionPermission() {
  try {
    // Validate environment
    if (!process.env.PRIVATE_KEY) {
      throw new Error('PRIVATE_KEY not found in .env file');
    }
    if (!process.env.PKP_TOKEN_ID) {
      throw new Error('PKP_TOKEN_ID not found in .env file');
    }
    if (!process.env.LIT_ACTION_CID) {
      throw new Error('LIT_ACTION_CID not found in .env file');
    }

    console.log('Adding permission for new Lit Action to existing PKP...');

    // Create ethers v5 wallet for contracts SDK
    const providerV5 = new ethersV5.providers.JsonRpcProvider('https://yellowstone-rpc.litprotocol.com');
    const walletV5 = new ethersV5.Wallet(process.env.PRIVATE_KEY, providerV5);

    console.log('Wallet address:', await walletV5.getAddress());
    
    // Check balance
    const balance = await providerV5.getBalance(walletV5.address);
    console.log('Wallet balance:', ethersV5.utils.formatEther(balance), 'LIT');

    // Initialize Lit contracts
    const litContracts = new LitContracts({
      signer: walletV5,
      network: 'datil',
      debug: false,
    });
    
    await litContracts.connect();
    console.log('Connected to Lit Contracts');

    // Prepare Lit Action auth method
    const litActionCid = process.env.LIT_ACTION_CID;
    const litActionIdHex = '0x' + Buffer.from(bs58.decode(litActionCid)).toString('hex');
    
    console.log('Adding auth method for:');
    console.log('- PKP Token ID:', process.env.PKP_TOKEN_ID);
    console.log('- Lit Action CID:', litActionCid);
    console.log('- Lit Action ID (hex):', litActionIdHex);

    // Check if method already permitted
    const isPermitted = await litContracts.pkpPermissionsContract.read.isPermittedAuthMethod(
      process.env.PKP_TOKEN_ID,
      AuthMethodType.LitAction,
      litActionIdHex
    );
    
    if (isPermitted) {
      console.log('✅ This Lit Action is already permitted for the PKP!');
      return;
    }
    
    // Use the SDK helper method instead
    const result = await litContracts.addPermittedAuthMethod({
      pkpTokenId: process.env.PKP_TOKEN_ID,
      authMethodType: AuthMethodType.LitAction,
      authMethodId: litActionIdHex,
      authMethodScopes: [AuthMethodScope.SignAnything],
    });
    
    console.log('Transaction sent:', result.tx.hash);
    console.log('Transaction confirmed!');

    console.log('\n✅ Permission added successfully!');
    console.log('The new Lit Action can now sign with the PKP.');
    
  } catch (error) {
    console.error('Error adding permission:', error);
    process.exit(1);
  }
}

addLitActionPermission();