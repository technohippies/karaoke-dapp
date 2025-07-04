#!/usr/bin/env node

import { LitContracts } from "@lit-protocol/contracts-sdk";
import { LIT_NETWORK, AUTH_METHOD_SCOPE, AUTH_METHOD_TYPE, LIT_RPC } from "@lit-protocol/constants";
import ethers5 from "ethers5";
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../../../.env') });

// The PKP we're using
const PKP_PUBLIC_KEY = '0x043a1a467808b48e40b0b4da67f75f15b09fe50c294f8aa664b70e51d16e76f973d30be74f3346f7f1ae551da35e93dae7cf5a8eb1ad5b7e3b443421cc078dc519';
const PKP_ETH_ADDRESS = '0xE2000B0ce17f260c1f3068e424Edf73b0e5052BA';

async function addSessionSettlementPermission() {
  try {
    console.log("🔐 Adding session settlement permission to PKP...");
    console.log("PKP Address:", PKP_ETH_ADDRESS);
    
    // Get session settlement CID from deployments
    const deploymentInfo = JSON.parse(
      readFileSync(join(__dirname, '../deployments/actions.json'), 'utf8')
    );
    
    const sessionSettlementAction = deploymentInfo.find(a => a.actionName === 'session-settlement');
    if (!sessionSettlementAction) {
      throw new Error('Session settlement action not found in deployments');
    }
    
    const SESSION_SETTLEMENT_CID = sessionSettlementAction.ipfsCid;
    console.log("Session Settlement CID:", SESSION_SETTLEMENT_CID);
    
    // Initialize signer
    const provider = new ethers5.providers.JsonRpcProvider(LIT_RPC.CHRONICLE_YELLOWSTONE);
    const wallet = new ethers5.Wallet(process.env.ADMIN_PRIVATE_KEY || process.env.PRIVATE_KEY, provider);
    
    console.log("🔑 Using wallet:", wallet.address);
    
    // Initialize Lit Contracts
    console.log("📄 Connecting to Lit Contracts...");
    const litContracts = new LitContracts({
      signer: wallet,
      network: LIT_NETWORK.DatilTest,
      debug: true,
    });
    await litContracts.connect();
    
    // Get PKP token ID from public key
    // The PKP token ID is derived from the public key
    const publicKeyBytes = PKP_PUBLIC_KEY.slice(2); // Remove 0x prefix
    const publicKeyBuffer = Buffer.from(publicKeyBytes, 'hex');
    const tokenId = ethers5.utils.keccak256('0x' + publicKeyBuffer.toString('hex'));
    
    console.log("PKP Token ID:", tokenId);
    
    // Convert IPFS CID to bytes using bs58
    const bs58Module = await import('bs58');
    const bs58 = bs58Module.default || bs58Module;
    const sessionSettlementBytes = `0x${Buffer.from(
      bs58.decode(SESSION_SETTLEMENT_CID)
    ).toString("hex")}`;
    
    console.log("Session Settlement Bytes:", sessionSettlementBytes);
    
    // Check if already permitted
    console.log("\n🔍 Checking if action is already permitted...");
    try {
      const isPermitted = await litContracts.pkpPermissionsContract.read.isPermittedAuthMethod(
        tokenId,
        {
          authMethodType: AUTH_METHOD_TYPE.LitAction,
          id: sessionSettlementBytes,
          userPubkey: "0x"
        }
      );
      
      if (isPermitted) {
        console.log("✅ Session settlement action is already permitted!");
        return;
      }
    } catch (error) {
      console.log("⚠️  Could not check permission status, proceeding to add...");
    }
    
    // Add session settlement as permitted auth method
    console.log("\n📝 Adding session settlement as permitted auth method...");
    const tx = await litContracts.pkpPermissionsContract.write.addPermittedAuthMethod(
      tokenId,
      {
        authMethodType: AUTH_METHOD_TYPE.LitAction,
        id: sessionSettlementBytes,
        userPubkey: "0x"
      },
      [AUTH_METHOD_SCOPE.SignAnything], // Allows signing within this Lit Action
      { 
        gasLimit: 500000,
        gasPrice: ethers5.utils.parseUnits("10", "gwei")
      }
    );
    
    console.log("Transaction hash:", tx.hash);
    console.log("⏳ Waiting for confirmation...");
    
    const receipt = await tx.wait();
    console.log("✅ Session settlement permission added successfully!");
    console.log("Transaction:", `https://yellowstone-explorer.litprotocol.com/tx/${tx.hash}`);
    console.log("Block number:", receipt.blockNumber);
    
  } catch (error) {
    console.error("❌ Error adding session settlement permission:", error);
    
    // If the error is about ownership, suggest alternatives
    if (error.message?.includes("unauthorized") || error.message?.includes("owner")) {
      console.log("\n💡 Possible solutions:");
      console.log("1. Use the wallet that originally minted the PKP");
      console.log("2. Check if ADMIN_PRIVATE_KEY is set in .env");
      console.log("3. Mint a new PKP with the correct permissions");
    }
    
    throw error;
  }
}

// Run the script
addSessionSettlementPermission()
  .then(() => {
    console.log("\n🎉 Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });