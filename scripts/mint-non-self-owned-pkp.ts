import { LitContracts } from '@lit-protocol/contracts-sdk';
import { ethers as ethersV5 } from '@lit-protocol/contracts-sdk/node_modules/ethers';
import { AuthMethodType, AuthMethodScope } from '@lit-protocol/constants';
import * as dotenv from 'dotenv';
import bs58 from 'bs58';

dotenv.config();

async function mintNonSelfOwnedPKP() {
  try {
    console.log('🔑 Minting Non-Self-Owned PKP (owned by your wallet)');
    console.log('='.repeat(50));
    
    // Validate environment
    if (!process.env.PRIVATE_KEY) {
      throw new Error('PRIVATE_KEY not found in .env file');
    }
    if (!process.env.LIT_ACTION_CID) {
      throw new Error('LIT_ACTION_CID not found in .env file');
    }

    // Create ethers v5 wallet for contracts SDK
    const providerV5 = new ethersV5.providers.JsonRpcProvider('https://yellowstone-rpc.litprotocol.com');
    const walletV5 = new ethersV5.Wallet(process.env.PRIVATE_KEY, providerV5);

    const walletAddress = await walletV5.getAddress();
    console.log('Wallet address:', walletAddress);
    
    // Check balance
    const balance = await providerV5.getBalance(walletV5.address);
    console.log('Wallet balance:', ethersV5.utils.formatEther(balance), 'LIT');

    if (balance.lt(ethersV5.utils.parseEther('0.0001'))) {
      throw new Error('Insufficient LIT tokens. Please fund your wallet.');
    }

    // Initialize Lit contracts
    const litContracts = new LitContracts({
      signer: walletV5,
      network: 'datil',
      debug: false,
    });
    
    await litContracts.connect();
    console.log('Connected to Lit Contracts');

    // Prepare auth methods
    const walletAuthMethod = {
      authMethodType: AuthMethodType.EthWallet,
      authMethodId: ethersV5.utils.getAddress(walletAddress).toLowerCase(),
    };

    const litActionCid = process.env.LIT_ACTION_CID;
    const litActionIdHex = '0x' + Buffer.from(bs58.decode(litActionCid)).toString('hex');
    const litActionAuthMethod = {
      authMethodType: AuthMethodType.LitAction,
      authMethodId: litActionIdHex,
    };

    console.log('\nAuth methods:');
    console.log('- Wallet:', walletAuthMethod);
    console.log('- Lit Action CID:', litActionCid);
    console.log('- Lit Action ID (hex):', litActionIdHex);

    // Get mint cost
    const mintCost = await litContracts.pkpNftContract.read.mintCost();
    console.log('\nMint cost:', ethersV5.utils.formatEther(mintCost), 'LIT');

    // Mint PKP WITHOUT self-ownership (owned by wallet)
    console.log('\n⚠️  Minting PKP owned by wallet (NOT self-owned)...');
    const tx = await litContracts.pkpHelperContract.write.mintNextAndAddAuthMethods(
      2, // keyType (2 = ECDSA)
      [walletAuthMethod.authMethodType, litActionAuthMethod.authMethodType],
      [walletAuthMethod.authMethodId, litActionAuthMethod.authMethodId],
      ['0x', '0x'], // pubkeys (empty for both)
      [[AuthMethodScope.SignAnything], [AuthMethodScope.SignAnything]],
      true, // addPkpEthAddressAsPermittedAddress
      false, // sendPkpToItself = FALSE (NOT self-owned)
      { value: mintCost }
    );

    console.log('Mint transaction sent:', tx.hash);
    const receipt = await tx.wait();
    console.log('Transaction confirmed in block:', receipt.blockNumber);

    // Parse the PKP info from events
    console.log('\nParsing transaction receipt...');
    const events = receipt.events || receipt.logs || [];
    
    let tokenId;
    for (const event of events) {
      if (event.topics && event.topics[0] === ethersV5.utils.id('Transfer(address,address,uint256)')) {
        tokenId = event.topics[3];
        break;
      }
    }
    
    if (!tokenId) {
      const totalSupply = await litContracts.pkpNftContract.read.totalSupply();
      tokenId = totalSupply.sub(1);
    }
    
    const pkpTokenId = tokenId.toString();
    const pkpPublicKey = await litContracts.pkpNftContract.read.getPubkey(tokenId);
    const pkpEthAddress = ethersV5.utils.computeAddress(pkpPublicKey);

    console.log('\n✅ Non-Self-Owned PKP Minted Successfully!');
    console.log('='.repeat(50));
    console.log('PKP Token ID:', pkpTokenId);
    console.log('PKP Public Key:', pkpPublicKey);
    console.log('PKP ETH Address:', pkpEthAddress);
    console.log('Owner:', walletAddress, '(your wallet)');
    console.log('='.repeat(50));
    
    console.log('\n📝 Save these values:');
    console.log(`NON_SELF_OWNED_PKP_TOKEN_ID=${pkpTokenId}`);
    console.log(`NON_SELF_OWNED_PKP_PUBLIC_KEY=${pkpPublicKey}`);
    console.log(`NON_SELF_OWNED_PKP_ETH_ADDRESS=${pkpEthAddress}`);
    
    console.log('\n✅ This PKP is:');
    console.log('- Owned by your wallet (NOT self-owned)');
    console.log('- Your wallet can manage it directly');
    console.log('- The Lit Action can sign with it');
    console.log('\n🧪 Use this PKP to test if self-ownership is the issue');
    
  } catch (error) {
    console.error('Error minting PKP:', error);
    process.exit(1);
  }
}

mintNonSelfOwnedPKP();