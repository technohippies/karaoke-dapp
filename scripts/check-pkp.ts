import { LitContracts } from '@lit-protocol/contracts-sdk';
import { ethers as ethersV5 } from '@lit-protocol/contracts-sdk/node_modules/ethers';
import * as dotenv from 'dotenv';

dotenv.config();

async function checkPKP() {
  try {
    // Setup provider and wallet (v5 for SDK)
    const providerV5 = new ethersV5.providers.JsonRpcProvider('https://yellowstone-rpc.litprotocol.com');
    const walletV5 = new ethersV5.Wallet(process.env.PRIVATE_KEY!, providerV5);

    // Initialize Lit contracts
    const litContracts = new LitContracts({
      signer: walletV5,
      network: 'datil',
      debug: false,
    });

    await litContracts.connect();
    console.log('Connected to Lit Contracts');

    const pkpTokenId = process.env.PKP_TOKEN_ID!;
    console.log('\nChecking PKP Token ID:', pkpTokenId);

    // Get PKP info
    try {
      const owner = await litContracts.pkpNftContract.read.ownerOf(pkpTokenId);
      console.log('PKP Owner:', owner);

      const publicKey = await litContracts.pkpNftContract.read.getPubkey(pkpTokenId);
      console.log('PKP Public Key from contract:', publicKey);

      const ethAddress = await litContracts.pkpNftContract.read.getEthAddress(pkpTokenId);
      console.log('PKP ETH Address from contract:', ethAddress);

      // Check if PKP is routed
      const isRouted = await litContracts.pubkeyRouterContract.read.isRouted(pkpTokenId);
      console.log('Is PKP routed?:', isRouted);

      if (!isRouted) {
        console.log('\n⚠️  PKP is not routed yet! This might be why signing fails.');
        console.log('The PKP needs to be routed on the Lit network before it can be used for signing.');
      }

      // Check permitted auth methods
      console.log('\nChecking permitted auth methods...');
      const permittedAuthMethods = await litContracts.pkpPermissionsContract.read.getPermittedAuthMethods(pkpTokenId);
      console.log('Number of permitted auth methods:', permittedAuthMethods.length);
      
      for (let i = 0; i < permittedAuthMethods.length; i++) {
        const method = permittedAuthMethods[i];
        console.log(`\nAuth Method ${i + 1}:`, {
          type: method[0].toString(),
          id: method[1],
          userPubkey: method[2]
        });
      }

    } catch (error) {
      console.error('Error reading PKP info:', error);
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

checkPKP();