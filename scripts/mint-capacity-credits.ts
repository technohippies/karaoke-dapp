import { LitContracts } from '@lit-protocol/contracts-sdk';
import { ethers as ethersV5 } from '@lit-protocol/contracts-sdk/node_modules/ethers';
import { LitNodeClient } from '@lit-protocol/lit-node-client';
import * as dotenv from 'dotenv';

dotenv.config();

async function mintCapacityCredits() {
  try {
    // Validate environment
    if (!process.env.PRIVATE_KEY) {
      throw new Error('PRIVATE_KEY not found in .env file');
    }

    // Setup provider and wallet (v5 for SDK)
    const providerV5 = new ethersV5.providers.JsonRpcProvider('https://yellowstone-rpc.litprotocol.com');
    const walletV5 = new ethersV5.Wallet(process.env.PRIVATE_KEY, providerV5);

    console.log('Wallet address:', await walletV5.getAddress());

    // Check balance
    const balance = await providerV5.getBalance(walletV5.address);
    console.log('Wallet balance:', ethersV5.utils.formatEther(balance), 'LIT');

    if (balance.lt(ethersV5.utils.parseEther('0.001'))) { // Minimum check
      throw new Error('Insufficient LIT tokens. Fund wallet on Chronicle Yellowstone.');
    }

    // Initialize Lit contracts
    const litContracts = new LitContracts({
      signer: walletV5,
      network: 'datil',
      debug: false,
    });

    await litContracts.connect();
    console.log('Connected to Lit Contracts');

    // Configure your Capacity Credit for testing
    const requestsPerMinute = 100; // 100 requests per minute for testing
    const durationInMinutes = 10080; // 7 days (1 week) duration

    console.log('\nCapacity Credit Configuration:');
    console.log('- Requests per minute:', requestsPerMinute);
    console.log('- Duration:', durationInMinutes, 'minutes (', durationInMinutes / 60, 'hours)');

    // Calculate expiration timestamp - must be midnight UTC
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + Math.ceil(durationInMinutes / 1440)); // Add days
    tomorrow.setUTCHours(0, 0, 0, 0); // Set to midnight UTC
    const expiresAt = Math.floor(tomorrow.getTime() / 1000);

    // Query mint cost
    console.log('\nQuerying mint cost...');
    // Convert requests per minute to requests per kilosecond (must be integer)
    const requestsPerKilosecond = Math.floor((requestsPerMinute * 1000) / 60);
    console.log('Requests per kilosecond:', requestsPerKilosecond);
    
    const mintCost = await litContracts.rateLimitNftContract.read.calculateCost(
      requestsPerKilosecond,
      expiresAt
    );
    console.log('Mint cost:', ethersV5.utils.formatEther(mintCost), 'LIT');

    // Confirm with user
    console.log('\n🚀 Ready to mint Capacity Credits NFT');
    console.log('This will cost', ethersV5.utils.formatEther(mintCost), 'LIT');

    // Mint the Capacity Credit NFT using the SDK helper
    const mintResult = await litContracts.mintCapacityCreditsNFT({
      requestsPerKilosecond: requestsPerKilosecond,
      daysUntilUTCMidnightExpiration: Math.ceil(durationInMinutes / 1440), // Convert to days
    });

    console.log('\nMint transaction sent!');
    console.log('Mint result:', mintResult);
    
    // The SDK returns the token ID directly
    const nftId = mintResult.capacityTokenIdStr;
    
    if (!nftId) {
      throw new Error('Failed to get NFT ID from mint result');
    }

    console.log('\n✅ Capacity Credits NFT Minted Successfully!');
    console.log('='.repeat(50));
    console.log('NFT ID:', nftId);
    console.log('Owner:', await walletV5.getAddress());
    console.log('Requests per Minute:', requestsPerMinute);
    console.log('Duration:', durationInMinutes, 'minutes');
    console.log('Expires at:', new Date(expiresAt * 1000).toISOString());
    console.log('='.repeat(50));

    console.log('\n📝 Add to your .env:');
    console.log(`CAPACITY_CREDIT_NFT_ID=${nftId}`);

    // Create a delegation for testing (allows any address to use it)
    console.log('\n📝 Creating delegation for testing...');
    
    // Initialize LitNodeClient for delegation creation
    const litNodeClient = new LitNodeClient({
      litNetwork: 'datil',
      debug: false,
    });
    
    await litNodeClient.connect();
    
    // For testing, we'll create a delegation that any address can use
    const delegationResult = await litNodeClient.createCapacityDelegationAuthSig({
      uses: '1000', // Number of uses
      dAppOwnerWallet: walletV5,
      capacityTokenId: nftId,
      delegateeAddresses: [], // Empty array means any address can use it
      expiration: new Date(expiresAt * 1000).toISOString(),
    });

    console.log('\n📝 Capacity Delegation Created!');
    console.log('Add this to your .env:');
    console.log(`CAPACITY_DELEGATION_AUTH_SIG=${JSON.stringify(delegationResult.capacityDelegationAuthSig)}`);

  } catch (error) {
    console.error('Error minting Capacity Credits:', error);
    process.exit(1);
  }
}

mintCapacityCredits();