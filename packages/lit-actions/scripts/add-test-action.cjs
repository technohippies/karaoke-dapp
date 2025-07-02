const { LitContracts } = require('@lit-protocol/contracts-sdk');
const { LIT_NETWORK, AUTH_METHOD_SCOPE, AUTH_METHOD_TYPE } = require('@lit-protocol/constants');
const dotenv = require('dotenv');
const path = require('path');
const bs58 = require('bs58').default || require('bs58');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../../.env') });

const PKP_TOKEN_ID = "196260105590482038746764926465554673089111253714413885679392811947402804195";
const TEST_ACTION_CID = "QmdMQGxDinAJqADD37xm5GcS8oHTfLu9hUXCq7oyCJNJdU";

async function main() {
  console.log('Adding test PKP signing action to PKP...\n');
  
  // Import ethers from the contracts SDK's dependencies to ensure version compatibility
  const contractsSdkPath = require.resolve('@lit-protocol/contracts-sdk/package.json');
  const contractsSdkDir = path.dirname(contractsSdkPath);
  const { ethers } = require(path.join(contractsSdkDir, 'node_modules/ethers'));
  
  const provider = new ethers.providers.JsonRpcProvider('https://yellowstone-rpc.litprotocol.com');
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  
  console.log('Wallet address:', wallet.address);
  console.log('PKP Token ID:', PKP_TOKEN_ID);
  
  const litContracts = new LitContracts({
    signer: wallet,
    network: LIT_NETWORK.DatilTest,
  });
  
  await litContracts.connect();
  console.log('Connected to Lit contracts\n');
  
  // Add test action
  console.log('Adding test action auth method...');
  console.log('CID:', TEST_ACTION_CID);
  
  const testActionMethod = {
    authMethodType: AUTH_METHOD_TYPE.LitAction,
    id: `0x${Buffer.from(bs58.decode(TEST_ACTION_CID)).toString('hex')}`,
    userPubkey: '0x'
  };
  
  try {
    const tx = await litContracts.pkpPermissionsContract.write.addPermittedAuthMethod(
      PKP_TOKEN_ID,
      testActionMethod,
      [AUTH_METHOD_SCOPE.SignAnything]
    );
    
    console.log('Test action tx:', tx.hash);
    console.log('Waiting for confirmation...');
    await tx.wait();
    console.log('✅ Test action added!');
  } catch (error) {
    console.error('Error adding test action:', error.message);
    if (error.message.includes('Already added')) {
      console.log('Test action already authorized, continuing...');
    } else {
      throw error;
    }
  }
  
  console.log('\n🎉 Test action has been added to the PKP!');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });