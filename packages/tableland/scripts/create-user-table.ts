import { Database } from "@tableland/sdk";
import { Wallet, JsonRpcProvider } from "ethers";
import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs/promises";

// Load environment variables
dotenv.config({ path: path.join(__dirname, "../../../.env") });

export interface UserTableConfig {
  userAddress: string;
  privateKey?: string; // Optional - use user's signer if not provided
}

export async function createUserTable(config: UserTableConfig): Promise<string> {
  // Use provided private key or the default one
  const privateKey = config.privateKey || process.env.PRIVATE_KEY;
  
  if (!privateKey) {
    throw new Error("No private key provided for table creation");
  }

  // Initialize wallet and provider for Base Sepolia
  const provider = new JsonRpcProvider("https://base-sepolia-rpc.publicnode.com");
  const wallet = new Wallet(privateKey, provider);
  
  console.log("Creating user table for:", config.userAddress);
  console.log("Using signer:", wallet.address);
  
  // Initialize Tableland database
  const db = new Database({ signer: wallet });

  try {
    // Create user-specific karaoke history table
    const { meta: createMeta } = await db
      .prepare(`
        CREATE TABLE karaoke_history_${config.userAddress.slice(2, 8)} (
          id INTEGER PRIMARY KEY,
          session_id TEXT UNIQUE NOT NULL,
          song_id INTEGER NOT NULL,
          song_title TEXT NOT NULL,
          artist_name TEXT NOT NULL,
          total_score INTEGER NOT NULL,
          accuracy INTEGER NOT NULL,
          credits_used INTEGER NOT NULL,
          started_at INTEGER NOT NULL,
          completed_at INTEGER NOT NULL,
          
          difficulty INTEGER DEFAULT 300,
          stability INTEGER DEFAULT 1000,
          elapsed_days INTEGER DEFAULT 0,
          scheduled_days INTEGER DEFAULT 0,
          reps INTEGER DEFAULT 0,
          lapses INTEGER DEFAULT 0,
          state INTEGER DEFAULT 0,
          last_review INTEGER
        )
      `)
      .run();

    // Wait for transaction confirmation
    const createTxn = await createMeta.txn?.wait();
    
    if (createTxn && createMeta.txn?.names) {
      const tableName = createMeta.txn.names[0];
      console.log("✅ User table created successfully!");
      console.log("Table name:", tableName);
      console.log("Transaction hash:", createTxn.hash);
      
      // Save user table info
      const userTableInfo = {
        userAddress: config.userAddress,
        tableName,
        chainId: 84532, // Base Sepolia
        createdAt: new Date().toISOString(),
        transactionHash: createTxn.hash,
        signerAddress: wallet.address
      };
      
      // Store in user-specific deployment file
      const deploymentsPath = path.join(__dirname, "../deployments/users");
      await fs.mkdir(deploymentsPath, { recursive: true });
      
      await fs.writeFile(
        path.join(deploymentsPath, `${config.userAddress}.json`),
        JSON.stringify(userTableInfo, null, 2)
      );
      
      return tableName;
    }
    
    throw new Error("Failed to get table name from transaction");
    
  } catch (error) {
    console.error("❌ Failed to create user table:", error);
    throw error;
  }
}

// CLI support for manual creation
if (require.main === module) {
  const userAddress = process.argv[2];
  
  if (!userAddress) {
    console.error("Usage: bun run create-user-table.ts <userAddress>");
    process.exit(1);
  }
  
  createUserTable({ userAddress })
    .then(tableName => {
      console.log("\nUser table created:", tableName);
      process.exit(0);
    })
    .catch(error => {
      console.error("Error:", error);
      process.exit(1);
    });
}