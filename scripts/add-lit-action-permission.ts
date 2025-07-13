import { LitContracts } from '@lit-protocol/contracts-sdk';
import { ethers as ethersV5 } from '@lit-protocol/contracts-sdk/node_modules/ethers';
import { AuthMethodScope } from '@lit-protocol/constants';
import * as dotenv from 'dotenv';

dotenv.config();

async function addLitActionPermission() {
  try {
    // Validate environment
    if (!process.env.PRIVATE_KEY || !process.env.PKP_TOKEN_ID || !process.env.LIT_ACTION_CID) {
      throw new Error('Missing required environment variables');
    }

    // Setup provider and wallet (v5 for SDK)
    const providerV5 = new ethersV5.providers.JsonRpcProvider('https://yellowstone-rpc.litprotocol.com');
    const walletV5 = new ethersV5.Wallet(process.env.PRIVATE_KEY, providerV5);

    console.log('Wallet address:', await walletV5.getAddress());

    // Initialize Lit contracts
    const litContracts = new LitContracts({
      signer: walletV5,
      network: 'datil',
      debug: false,
    });

    await litContracts.connect();
    console.log('Connected to Lit Contracts');

    // Create Lit Action auth method
    const litActionAuthMethod = {
      authMethodType: 8, // Lit Action auth method type
      authMethodId: ethersV5.utils.keccak256(ethersV5.utils.toUtf8Bytes(`ipfs://${process.env.LIT_ACTION_CID}`)),
    };

    console.log('\nAdding Lit Action as auth method:');
    console.log('CID:', process.env.LIT_ACTION_CID);
    console.log('Auth Method ID:', litActionAuthMethod.authMethodId);

    // Add the Lit Action as an auth method with signing permissions
    const tx = await litContracts.addPermittedAuthMethod({
      pkpTokenId: process.env.PKP_TOKEN_ID,
      authMethodType: litActionAuthMethod.authMethodType,
      authMethodId: litActionAuthMethod.authMethodId,
      authMethodScopes: [AuthMethodScope.SignAnything],
    });

    console.log('Transaction sent:', tx.hash);
    await tx.wait();

    console.log('\n✅ Lit Action permission added successfully!');
    console.log('The new Lit Action can now sign with the PKP');

  } catch (error) {
    console.error('Error adding Lit Action permission:', error);
    process.exit(1);
  }
}

addLitActionPermission();