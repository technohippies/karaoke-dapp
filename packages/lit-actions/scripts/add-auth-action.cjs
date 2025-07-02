const { LitContracts } = require('@lit-protocol/contracts-sdk');
const { LIT_NETWORK, AUTH_METHOD_SCOPE, AUTH_METHOD_TYPE } = require('@lit-protocol/constants');
const dotenv = require('dotenv');
const path = require('path');
const bs58 = require('bs58').default || require('bs58');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../../.env') });

const PKP_TOKEN_ID = "196260105590482038746764926465554673089111253714413885679392811947402804195";
const AUTH_ACTION_CID = "Qmcfy53FEh4AjeiXeWy3Rsxm4sK4u7ZU19nGJFDZfTHhXV";

async function main() {
  console.log('Adding auth action to PKP...\n');
  
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
  
  // Add auth action
  console.log('Adding auth action auth method...');
  console.log('CID:', AUTH_ACTION_CID);
  
  const authActionMethod = {
    authMethodType: AUTH_METHOD_TYPE.LitAction,
    id: `0x${Buffer.from(bs58.decode(AUTH_ACTION_CID)).toString('hex')}`,
    userPubkey: '0x'
  };
  
  try {
    const tx = await litContracts.pkpPermissionsContract.write.addPermittedAuthMethod(
      PKP_TOKEN_ID,
      authActionMethod,
      [AUTH_METHOD_SCOPE.SignAnything]
    );
    
    console.log('Auth action tx:', tx.hash);
    console.log('Waiting for confirmation...');
    await tx.wait();
    console.log('✅ Auth action added!');
  } catch (error) {
    console.error('Error adding auth action:', error.message);
    if (error.message.includes('Already added')) {
      console.log('Auth action already authorized, continuing...');
    } else {
      throw error;
    }
  }
  
  console.log('\n🎉 Auth action has been added to the PKP!');
  
  // Update PKP info
  const fs = require('fs');
  const pkpInfoPath = path.join(__dirname, '../deployments/pkp.json');
  const pkpInfo = JSON.parse(fs.readFileSync(pkpInfoPath, 'utf8'));
  
  pkpInfo.permittedActions = {
    ...pkpInfo.permittedActions,
    authAction: AUTH_ACTION_CID
  };
  
  fs.writeFileSync(pkpInfoPath, JSON.stringify(pkpInfo, null, 2));
  console.log('Updated pkp.json with auth action CID');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });