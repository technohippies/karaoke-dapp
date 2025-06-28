const { LitNodeClient } = require("@lit-protocol/lit-node-client");
const { LIT_NETWORK } = require("@lit-protocol/constants");
const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");

async function deployAction(actionName, contractAddress) {
  console.log(`Deploying ${actionName}...`);
  
  // Read the action code
  const actionPath = path.join(__dirname, "..", "src", `${actionName}.js`);
  let actionCode = await fs.readFile(actionPath, "utf-8");
  
  // Replace contract address if provided
  if (contractAddress) {
    actionCode = actionCode.replace("<TO_BE_SET>", contractAddress);
  }
  
  // Generate a mock IPFS CID for testing
  // In production, you would upload to IPFS or use Lit's IPFS pinning service
  const hash = crypto.createHash('sha256').update(actionCode).digest('hex');
  const ipfsCid = `Qm${hash.slice(0, 44)}`;
  
  // Update the action code with its own CID
  actionCode = actionCode.replace("<THIS_ACTION_IPFS_CID>", ipfsCid);
  actionCode = actionCode.replace("<MIDI_DECRYPTOR_ACTION_CID>", ipfsCid);
  
  // Save deployment record
  const deployment = {
    actionName,
    ipfsCid,
    deployedAt: new Date().toISOString(),
    network: "datil",
    contractAddress: contractAddress || null
  };
  
  // Save to deployments file
  const deploymentsPath = path.join(__dirname, "..", "deployments", "actions.json");
  let deployments = [];
  
  try {
    const existing = await fs.readFile(deploymentsPath, "utf-8");
    deployments = JSON.parse(existing);
  } catch (e) {
    // File doesn't exist yet
  }
  
  // Remove old deployment of same action
  deployments = deployments.filter(d => d.actionName !== actionName);
  deployments.push(deployment);
  
  await fs.mkdir(path.join(__dirname, "..", "deployments"), { recursive: true });
  await fs.writeFile(deploymentsPath, JSON.stringify(deployments, null, 2));
  
  console.log(`✅ ${actionName} deployed: ${ipfsCid}`);
  
  return ipfsCid;
}

async function main() {
  // Get contract address from environment or deployment
  let karaokeStoreAddress = process.env.KARAOKE_STORE_ADDRESS;
  
  if (!karaokeStoreAddress) {
    // Try to read from Forge deployment
    try {
      const forgeDeployment = await fs.readFile(
        path.join(__dirname, "../../contracts/deployments/84532.json"),
        "utf-8"
      );
      const deployment = JSON.parse(forgeDeployment);
      karaokeStoreAddress = deployment.karaokeStore;
    } catch (e) {
      console.warn("No contract deployment found, using placeholder");
      karaokeStoreAddress = "0x0000000000000000000000000000000000000000";
    }
  }
  
  console.log(`Using KaraokeStore address: ${karaokeStoreAddress}`);
  console.log("\n⚠️  Note: This is a mock deployment for testing.");
  console.log("For production, you need to:");
  console.log("1. Upload actions to IPFS using a pinning service");
  console.log("2. Or use Lit Protocol's action deployment tools");
  console.log("3. Update the IPFS CIDs in the deployment file\n");
  
  // Deploy all actions
  await deployAction("voice-grader");
  await deployAction("midi-decryptor", karaokeStoreAddress);
  await deployAction("session-settlement", karaokeStoreAddress);
  
  console.log("\n✅ All Lit Actions deployed (mock)!");
  console.log("\nDeployment info saved to packages/lit-actions/deployments/actions.json");
  
  // Show deployment summary
  const deploymentsPath = path.join(__dirname, "..", "deployments", "actions.json");
  const deployments = JSON.parse(await fs.readFile(deploymentsPath, "utf-8"));
  
  console.log("\nDeployment Summary:");
  console.log("==================");
  deployments.forEach(d => {
    console.log(`${d.actionName}: ${d.ipfsCid}`);
  });
}

main().catch(console.error);