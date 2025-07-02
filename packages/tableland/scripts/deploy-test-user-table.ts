import { createUserTable } from "./create-user-table";
import * as dotenv from "dotenv";
import * as path from "path";

// Load environment variables
dotenv.config({ path: path.join(__dirname, "../../../.env") });

async function deployTestUserTable() {
  // Test user address (a dummy address for testing)
  const testUserAddress = "0x742d35Cc6634C0532925a3b844Bc9e7595f4b1c0";
  
  console.log("🎤 Deploying test user table for Karaoke dApp");
  console.log("============================================");
  console.log("Test user address:", testUserAddress);
  console.log("Chain: Base Sepolia (84532)");
  console.log();
  
  try {
    const tableName = await createUserTable({
      userAddress: testUserAddress,
      // Using the deployer's private key for this test
      privateKey: process.env.PRIVATE_KEY
    });
    
    console.log("\n✅ Test user table deployed successfully!");
    console.log("Table name:", tableName);
    console.log("\nYou can now run the test script to verify functionality");
    
    return tableName;
  } catch (error) {
    console.error("\n❌ Failed to deploy test user table:", error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  deployTestUserTable()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export { deployTestUserTable };