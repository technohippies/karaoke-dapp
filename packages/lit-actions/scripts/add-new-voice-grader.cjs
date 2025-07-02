const { LitContracts } = require('@lit-protocol/contracts-sdk');
const { LIT_NETWORK, AUTH_METHOD_SCOPE, AUTH_METHOD_TYPE } = require('@lit-protocol/constants');
const dotenv = require('dotenv');
const path = require('path');
const bs58 = require('bs58').default || require('bs58');

dotenv.config({ path: path.join(__dirname, '../../../.env') });

const PKP_TOKEN_ID = "196260105590482038746764926465554673089111253714413885679392811947402804195";
const NEW_VOICE_GRADER_CID = "QmSiYENVbBRCQehriWHvKoV9KD53nBxvhsooPEEVahCfwx";

async function main() {
  console.log('Adding new voice grader action to PKP...\n');
  
  const contractsSdkPath = require.resolve('@lit-protocol/contracts-sdk/package.json');
  const contractsSdkDir = path.dirname(contractsSdkPath);
  const { ethers } = require(path.join(contractsSdkDir, 'node_modules/ethers'));
  
  const provider = new ethers.providers.JsonRpcProvider('https://yellowstone-rpc.litprotocol.com');
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  
  const litContracts = new LitContracts({
    signer: wallet,
    network: LIT_NETWORK.DatilTest,
  });
  
  await litContracts.connect();
  console.log('Connected to Lit contracts\n');
  
  const voiceGraderMethod = {
    authMethodType: AUTH_METHOD_TYPE.LitAction,
    id: `0x${Buffer.from(bs58.decode(NEW_VOICE_GRADER_CID)).toString('hex')}`,
    userPubkey: '0x'
  };
  
  try {
    const tx = await litContracts.pkpPermissionsContract.write.addPermittedAuthMethod(
      PKP_TOKEN_ID,
      voiceGraderMethod,
      [AUTH_METHOD_SCOPE.SignAnything]
    );
    
    console.log('New voice grader tx:', tx.hash);
    await tx.wait();
    console.log('✅ New voice grader action added!');
  } catch (error) {
    console.error('Error:', error.message);
    if (error.message.includes('Already added')) {
      console.log('Voice grader action already authorized');
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });