const { LitNodeClient } = require("@lit-protocol/lit-node-client");
const { LIT_NETWORK } = require("@lit-protocol/constants");
const { ethers } = require("ethers");
const dotenv = require("dotenv");
const path = require("path");
const fs = require("fs/promises");

// Load environment variables
dotenv.config({ path: path.join(__dirname, "../../../.env") });

async function main() {
  console.log("Creating Lit PKP wallet...");
  
  // Initialize Lit client
  const client = new LitNodeClient({
    litNetwork: LIT_NETWORK.DatilDev,
    debug: false
  });
  
  await client.connect();
  console.log("Connected to Lit Network");
  
  // Generate auth method for the PKP
  // Using a simple auth method for now - in production you'd want more secure methods
  const authMethod = {
    authMethodType: 1, // ADDRESS auth method
    accessToken: JSON.stringify({
      address: "0x7d3924A73f1242663fD8BbD1f2559fa6081Ba6D1", // Your deployer address
      timestamp: Date.now()
    })
  };
  
  try {
    // For now, we'll generate a deterministic PKP address
    // In production, you would mint a real PKP on-chain
    console.log("\n⚠️  Note: For production, you need to mint a real PKP on-chain");
    console.log("For testing, here's a deterministic PKP address based on your project:");
    
    // Generate a deterministic PKP address for testing
    const pkpSeed = ethers.keccak256(
      ethers.toUtf8Bytes("karaoke-dapp-pkp-v0.1.0")
    );
    const pkpWallet = new ethers.Wallet(pkpSeed);
    
    const pkpInfo = {
      publicKey: pkpWallet.publicKey,
      address: pkpWallet.address,
      network: "datil",
      createdAt: new Date().toISOString(),
      purpose: "Karaoke dApp voice session management"
    };
    
    // Save PKP info
    const deploymentsPath = path.join(__dirname, "../deployments");
    await fs.mkdir(deploymentsPath, { recursive: true });
    
    await fs.writeFile(
      path.join(deploymentsPath, "lit-pkp.json"),
      JSON.stringify(pkpInfo, null, 2)
    );
    
    console.log("\n✅ PKP wallet info generated!");
    console.log("PKP Address:", pkpWallet.address);
    console.log("PKP Public Key:", pkpWallet.publicKey);
    console.log("\nAdd this to your .env file:");
    console.log(`LIT_PKP_PUBLIC_KEY=${pkpWallet.address}`);
    console.log("\n⚡ Fund this address with:");
    console.log("- ETH for gas fees");
    console.log("\nPKP info saved to packages/lit-actions/deployments/lit-pkp.json");
    
    // Instructions for real PKP minting
    console.log("\n📝 To mint a real PKP for production:");
    console.log("1. Visit https://explorer.litprotocol.com/mint-pkp");
    console.log("2. Or use the Lit SDK to mint programmatically");
    console.log("3. Update the LIT_PKP_PUBLIC_KEY in your .env with the real PKP address");
    
  } catch (error) {
    console.error("Error creating PKP:", error);
    throw error;
  } finally {
    client.disconnect();
  }
}

main().catch(console.error);