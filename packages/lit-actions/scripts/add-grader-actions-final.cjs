const { LitContracts } = require('@lit-protocol/contracts-sdk');
const { LIT_NETWORK, AUTH_METHOD_SCOPE, AUTH_METHOD_TYPE } = require('@lit-protocol/constants');
const dotenv = require('dotenv');
const path = require('path');
const bs58 = require('bs58').default || require('bs58');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../../.env') });

const PKP_TOKEN_ID = "196260105590482038746764926465554673089111253714413885679392811947402804195";
const VOICE_GRADER_CID = "QmYhWUGmaRnZ4toeWKfSPhFhVCbhpBcnBFmPZdvmo7yLbS";
const FINAL_GRADER_CID = "QmdRA3ZyYu2CdYrT57NWWeMVLsD89fNshzVoTMEs3WbcMM";

async function main() {
  console.log('Adding voice and final grader actions to PKP...\n');
  
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
  
  // Add voice grader
  console.log('Adding voice grader auth method...');
  console.log('CID:', VOICE_GRADER_CID);
  
  const voiceGraderAuthMethod = {
    authMethodType: AUTH_METHOD_TYPE.LitAction,
    id: `0x${Buffer.from(bs58.decode(VOICE_GRADER_CID)).toString('hex')}`,
    userPubkey: '0x'
  };
  
  try {
    const tx1 = await litContracts.pkpPermissionsContract.write.addPermittedAuthMethod(
      PKP_TOKEN_ID,
      voiceGraderAuthMethod,
      [AUTH_METHOD_SCOPE.SignAnything]
    );
    
    console.log('Voice grader tx:', tx1.hash);
    console.log('Waiting for confirmation...');
    await tx1.wait();
    console.log('✅ Voice grader added!\n');
  } catch (error) {
    console.error('Error adding voice grader:', error.message);
    if (error.message.includes('Already added')) {
      console.log('Voice grader already authorized, continuing...\n');
    } else {
      throw error;
    }
  }
  
  // Add final grader
  console.log('Adding final grader auth method...');
  console.log('CID:', FINAL_GRADER_CID);
  
  const finalGraderAuthMethod = {
    authMethodType: AUTH_METHOD_TYPE.LitAction,
    id: `0x${Buffer.from(bs58.decode(FINAL_GRADER_CID)).toString('hex')}`,
    userPubkey: '0x'
  };
  
  try {
    const tx2 = await litContracts.pkpPermissionsContract.write.addPermittedAuthMethod(
      PKP_TOKEN_ID,
      finalGraderAuthMethod,
      [AUTH_METHOD_SCOPE.SignAnything]
    );
    
    console.log('Final grader tx:', tx2.hash);
    console.log('Waiting for confirmation...');
    await tx2.wait();
    console.log('✅ Final grader added!\n');
  } catch (error) {
    console.error('Error adding final grader:', error.message);
    if (error.message.includes('Already added')) {
      console.log('Final grader already authorized, continuing...\n');
    } else {
      throw error;
    }
  }
  
  console.log('🎉 Both grader actions have been added to the PKP!');
  
  // Update PKP info
  const fs = require('fs');
  const pkpInfoPath = path.join(__dirname, '../deployments/pkp.json');
  const pkpInfo = JSON.parse(fs.readFileSync(pkpInfoPath, 'utf8'));
  
  pkpInfo.permittedActions = {
    ...pkpInfo.permittedActions,
    voiceGrader: VOICE_GRADER_CID,
    finalGrader: FINAL_GRADER_CID
  };
  
  fs.writeFileSync(pkpInfoPath, JSON.stringify(pkpInfo, null, 2));
  console.log('Updated pkp.json with new CIDs');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });