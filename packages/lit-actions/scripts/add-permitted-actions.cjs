const { LitContracts } = require("@lit-protocol/contracts-sdk");
const { LIT_NETWORK, AUTH_METHOD_SCOPE, AUTH_METHOD_TYPE, LIT_RPC } = require("@lit-protocol/constants");
const { ethers } = require("ethers");
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../../.env') });

const PKP_TOKEN_ID = "196260105590482038746764926465554673089111253714413885679392811947402804195";
const VOICE_GRADER_CID = "QmTgQGR33ETR79Ab5VFwzEYiHCCVjDQFozqYkdTwLnS4nb";
const FINAL_GRADER_CID = "QmdmSw585x6oCncuZ2yRPHV7C1eH8HFmCA5hcXNRRZ6vY6";

async function addPermittedLitActions() {
  try {
    // Initialize signer - using the admin wallet that owns the PKP
    const provider = new ethers.providers.JsonRpcProvider(LIT_RPC.CHRONICLE_YELLOWSTONE);
    const wallet = new ethers.Wallet(process.env.ADMIN_PRIVATE_KEY || process.env.PRIVATE_KEY, provider);
    
    console.log("🔑 Using wallet:", wallet.address);
    
    // Initialize Lit Contracts
    console.log("📄 Connecting to Lit Contracts...");
    const litContracts = new LitContracts({
      signer: wallet,
      network: LIT_NETWORK.DatilTest,
      debug: true,
    });
    await litContracts.connect();
    
    // Convert IPFS CID to bytes using base58
    const voiceGraderBytes = `0x${Buffer.from(
      ethers.utils.base58.decode(VOICE_GRADER_CID)
    ).toString("hex")}`;
    
    const finalGraderBytes = `0x${Buffer.from(
      ethers.utils.base58.decode(FINAL_GRADER_CID)
    ).toString("hex")}`;
    
    console.log("Voice Grader CID:", VOICE_GRADER_CID);
    console.log("Voice Grader Bytes:", voiceGraderBytes);
    console.log("Final Grader CID:", FINAL_GRADER_CID);
    console.log("Final Grader Bytes:", finalGraderBytes);
    
    // Add voice grader as permitted auth method
    console.log("\n🎤 Adding voice grader as permitted auth method...");
    const tx1 = await litContracts.pkpPermissionsContract.write.addPermittedAuthMethod(
      PKP_TOKEN_ID,
      {
        authMethodType: AUTH_METHOD_TYPE.LitAction,
        id: voiceGraderBytes,
        userPubkey: "0x"
      },
      [AUTH_METHOD_SCOPE.SignAnything], // Allows signing within this Lit Action
      { 
        gasLimit: 500000,
        gasPrice: ethers.utils.parseUnits("10", "gwei")
      }
    );
    console.log("Voice grader tx hash:", tx1.hash);
    const receipt1 = await tx1.wait();
    console.log("✅ Voice grader added successfully");
    
    // Add final grader as permitted auth method
    console.log("\n📊 Adding final grader as permitted auth method...");
    const tx2 = await litContracts.pkpPermissionsContract.write.addPermittedAuthMethod(
      PKP_TOKEN_ID,
      {
        authMethodType: AUTH_METHOD_TYPE.LitAction,
        id: finalGraderBytes,
        userPubkey: "0x"
      },
      [AUTH_METHOD_SCOPE.SignAnything], // Allows signing within this Lit Action
      { 
        gasLimit: 500000,
        gasPrice: ethers.utils.parseUnits("10", "gwei")
      }
    );
    console.log("Final grader tx hash:", tx2.hash);
    const receipt2 = await tx2.wait();
    console.log("✅ Final grader added successfully");
    
    console.log("\n🎉 Successfully added both Lit Actions as permitted auth methods!");
    console.log("Voice grader tx:", `https://yellowstone-explorer.litprotocol.com/tx/${tx1.hash}`);
    console.log("Final grader tx:", `https://yellowstone-explorer.litprotocol.com/tx/${tx2.hash}`);
    
  } catch (error) {
    console.error("❌ Error adding permitted actions:", error);
    throw error;
  }
}

// Run the script
addPermittedLitActions()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });