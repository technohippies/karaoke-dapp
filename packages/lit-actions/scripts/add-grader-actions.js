import { LitContracts } from '@lit-protocol/contracts-sdk';
import { LIT_NETWORK, AUTH_METHOD_SCOPE, AUTH_METHOD_TYPE } from '@lit-protocol/constants';
import { ethers } from 'ethers';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import bs58 from 'bs58';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../../../.env') });

const PKP_TOKEN_ID = "196260105590482038746764926465554673089111253714413885679392811947402804195";
const VOICE_GRADER_CID = "QmTgQGR33ETR79Ab5VFwzEYiHCCVjDQFozqYkdTwLnS4nb";
const FINAL_GRADER_CID = "QmdmSw585x6oCncuZ2yRPHV7C1eH8HFmCA5hcXNRRZ6vY6";

async function main() {
  console.log('Adding voice and final grader actions to PKP...\n');
  
  const provider = new ethers.JsonRpcProvider('https://yellowstone-rpc.litprotocol.com');
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
  
  const tx1 = await litContracts.pkpPermissionsContract.write.addPermittedAuthMethod(
    PKP_TOKEN_ID,
    voiceGraderAuthMethod,
    [AUTH_METHOD_SCOPE.SignAnything]
  );
  
  console.log('Voice grader tx:', tx1.hash);
  await tx1.wait();
  console.log('✅ Voice grader added!\n');
  
  // Add final grader
  console.log('Adding final grader auth method...');
  console.log('CID:', FINAL_GRADER_CID);
  
  const finalGraderAuthMethod = {
    authMethodType: AUTH_METHOD_TYPE.LitAction,
    id: `0x${Buffer.from(bs58.decode(FINAL_GRADER_CID)).toString('hex')}`,
    userPubkey: '0x'
  };
  
  const tx2 = await litContracts.pkpPermissionsContract.write.addPermittedAuthMethod(
    PKP_TOKEN_ID,
    finalGraderAuthMethod,
    [AUTH_METHOD_SCOPE.SignAnything]
  );
  
  console.log('Final grader tx:', tx2.hash);
  await tx2.wait();
  console.log('✅ Final grader added!\n');
  
  console.log('🎉 Both grader actions have been added to the PKP!');
  
  // Update PKP info
  const fs = await import('fs');
  const pkpInfoPath = join(__dirname, '../deployments/pkp.json');
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