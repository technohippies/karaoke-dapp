const { Database } = require("@tableland/sdk");
const { Wallet, JsonRpcProvider } = require("ethers");
const dotenv = require("dotenv");
const path = require("path");
const fs = require("fs/promises");

// Load environment variables
dotenv.config({ path: path.join(__dirname, "../../../.env") });

async function main() {
  // Get private key from environment or use the one provided
  const privateKey = process.env.PRIVATE_KEY || "4cace81ac8c69f30d6555e283eb1b111d8fe3382ab58d89d1dbae1c2e9126a46";
  
  if (!privateKey) {
    throw new Error("Missing PRIVATE_KEY");
  }

  // Initialize wallet and provider for Base Sepolia using ethers v6
  const provider = new JsonRpcProvider("https://base-sepolia-rpc.publicnode.com");
  const wallet = new Wallet(privateKey, provider);
  
  console.log("Using wallet address:", wallet.address);
  
  // Initialize Tableland database with the wallet as signer
  const db = new Database({ signer: wallet });

  try {
    // Create songs table
    console.log("Creating songs table on Base Sepolia...");
    
    const { meta: createMeta } = await db
      .prepare(`
        CREATE TABLE songs (
          id INTEGER PRIMARY KEY,
          title TEXT NOT NULL,
          artist TEXT NOT NULL,
          isrc TEXT,
          duration INTEGER,
          language TEXT,
          stems TEXT
        )
      `)
      .run();

    // Wait for transaction confirmation
    const createTxn = await createMeta.txn?.wait();
    
    if (createTxn && createMeta.txn?.names) {
      console.log("✅ Songs table created successfully!");
      console.log("Transaction hash:", createTxn.hash);
      
      // Extract table name from transaction metadata
      const tableName = createMeta.txn.names[0];
      console.log("Table name:", tableName);
      console.log("\nAdd this to your .env file:");
      console.log(`TABLELAND_SONGS_TABLE=${tableName}`);
      
      // Also save to a file for easy reference
      const deploymentsPath = path.join(__dirname, "../deployments");
      await fs.mkdir(deploymentsPath, { recursive: true });
      
      const deploymentInfo = {
        tableName,
        chainId: 84532, // Base Sepolia
        createdAt: new Date().toISOString(),
        transactionHash: createTxn.hash,
        walletAddress: wallet.address
      };
      
      await fs.writeFile(
        path.join(deploymentsPath, "tables.json"),
        JSON.stringify(deploymentInfo, null, 2)
      );
      
      console.log("\nDeployment info saved to packages/tableland/deployments/tables.json");
    }
    
  } catch (error) {
    console.error("❌ Failed to create table:", error);
    throw error;
  }
}

main().catch(console.error);