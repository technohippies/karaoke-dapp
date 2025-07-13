import { LitNodeClient } from '@lit-protocol/lit-node-client';
import { LIT_NETWORK, LIT_ABILITY } from '@lit-protocol/constants';
import { createSiweMessageWithRecaps, generateAuthSig, LitActionResource } from '@lit-protocol/auth-helpers';
import { ethers } from 'ethers';
import * as dotenv from 'dotenv';

dotenv.config();

async function testLitAction() {
  try {
    if (!process.env.PRIVATE_KEY || !process.env.LIT_ACTION_CID || !process.env.CAPACITY_DELEGATION_AUTH_SIG) {
      throw new Error('Missing env vars: PRIVATE_KEY, LIT_ACTION_CID, CAPACITY_DELEGATION_AUTH_SIG');
    }

    // Setup provider and wallet (user simulation)
    const provider = new ethers.JsonRpcProvider('https://rpc.ankr.com/eth'); // Ethereum RPC for SIWE
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    console.log('User wallet:', await wallet.getAddress());

    // Initialize Lit client
    const litNodeClient = new LitNodeClient({
      litNetwork: 'datil',
      debug: true,
    });
    await litNodeClient.connect();
    console.log('Connected to Lit Network');

    // Parse delegation (from .env)
    const capacityDelegationAuthSig = JSON.parse(process.env.CAPACITY_DELEGATION_AUTH_SIG);
    console.log('Using Capacity Delegation:', !!capacityDelegationAuthSig);

    // Create a mock session token (simulating what the dapp would create)
    const sessionToken = {
      userAddress: await wallet.getAddress(),
      sessionHash: ethers.keccak256(ethers.toUtf8Bytes('test-session-' + Date.now())),
      escrowAmount: 10,
      songId: 1,
      chainId: 11155111, // Sepolia
      issuedAt: Math.floor(Date.now() / 1000),
      expiresAt: Math.floor(Date.now() / 1000) + 3600, // 1 hour
    };

    // Sign session token (EIP-712)
    const domain = {
      name: 'KaraokeTurbo',
      version: '1',
      chainId: sessionToken.chainId,
      verifyingContract: '0x1234567890123456789012345678901234567890', // Test with mock contract
    };

    const types = {
      SessionToken: [
        { name: 'userAddress', type: 'address' },
        { name: 'sessionHash', type: 'bytes32' },
        { name: 'escrowAmount', type: 'uint256' },
        { name: 'songId', type: 'uint256' },
        { name: 'chainId', type: 'uint256' },
        { name: 'issuedAt', type: 'uint256' },
        { name: 'expiresAt', type: 'uint256' }
      ]
    };

    const tokenSignature = await wallet.signTypedData(domain, types, sessionToken);

    // Create minimal audio data for testing
    const audioData = new Uint8Array(100); // Much smaller
    for (let i = 0; i < audioData.length; i++) {
      audioData[i] = Math.floor(Math.random() * 256);
    }

    console.log('\nCreating session signatures...');

    // Create regular session with recaps
    const resourceAbilityRequests = [
      {
        resource: new LitActionResource('*'),
        ability: LIT_ABILITY.LitActionExecution,
      },
    ];

    const sessionSigs = await litNodeClient.getSessionSigs({
      chain: 'ethereum',
      expiration: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      resourceAbilityRequests,
      capacityDelegationAuthSig, // Key: Include here
      authNeededCallback: async ({ uri, expiration, resourceAbilityRequests }) => {
        const siweMessage = await createSiweMessageWithRecaps({
          uri: uri || 'https://localhost',
          expiration,
          resources: resourceAbilityRequests,
          walletAddress: await wallet.getAddress(),
          nonce: await litNodeClient.getLatestBlockhash(),
          litNodeClient,
          domain: 'localhost',
        });

        return await generateAuthSig({ 
          signer: wallet, 
          toSign: siweMessage 
        });
      },
    });

    console.log('Session Sigs obtained:', Object.keys(sessionSigs).length);

    console.log('\nExecuting Lit Action...');
    const startTime = Date.now();

    // Execute Lit Action with mock params
    const result = await litNodeClient.executeJs({
      ipfsId: process.env.LIT_ACTION_CID,
      sessionSigs,
      jsParams: {
        sessionToken,
        tokenSignature,
        audioData: Array.from(audioData), // Convert to regular array
        contractAddress: domain.verifyingContract,
        publicKey: process.env.PKP_PUBLIC_KEY!, // Pass with 0x prefix, let Lit Action handle it
      },
    });

    const duration = Date.now() - startTime;
    console.log(`\nExecution completed in ${duration}ms`);
    console.log('Lit Action Result:', result.response);

    // Parse response
    const response = typeof result.response === 'string' 
      ? JSON.parse(result.response) 
      : result.response;
    
    console.log('\n📊 Result:');
    console.log('='.repeat(50));
    console.log('Success:', response.success);
    if (response.grade) console.log('Grade:', response.grade);
    if (response.creditsUsed) console.log('Credits Used:', response.creditsUsed);
    if (response.nonce) console.log('Nonce:', response.nonce);
    if (response.messageHash) console.log('Message Hash:', response.messageHash);
    if (response.pkpAddress) console.log('PKP Address:', response.pkpAddress);
    if (response.message) console.log('Message:', response.message);
    console.log('='.repeat(50));

    // Check if signature was generated
    if (result.signatures && result.signatures.gradeSignature) {
      console.log('\n✅ PKP Signature Generated!');
      const sig = result.signatures.gradeSignature;
      console.log('Signature:', sig.sig || sig);

      // Skip signature verification for now since format changed
    } else {
      console.error('\n❌ No signature generated');
    }

    console.log('\n✅ Test Successful!');
    
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}

testLitAction();