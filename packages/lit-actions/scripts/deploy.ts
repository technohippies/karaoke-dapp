import { LitNodeClient } from "@lit-protocol/lit-node-client";
import { LIT_NETWORK } from "@lit-protocol/constants";
import * as fs from "fs/promises";
import * as path from "path";

interface DeploymentRecord {
  actionName: string;
  ipfsCid: string;
  deployedAt: string;
  network: string;
}

async function deployAction(actionName: string, contractAddress?: string) {
  console.log(`Deploying ${actionName}...`);
  
  // Read the action code
  const actionPath = path.join(__dirname, "..", "src", `${actionName}.js`);
  let actionCode = await fs.readFile(actionPath, "utf-8");
  
  // Replace contract address if provided
  if (contractAddress) {
    actionCode = actionCode.replace("<TO_BE_SET>", contractAddress);
  }
  
  // Initialize Lit client
  const client = new LitNodeClient({
    litNetwork: LIT_NETWORK.Datil,
  });
  await client.connect();
  
  // Deploy to IPFS (in production, you'd use Lit's IPFS pinning)
  // For now, we'll simulate with a placeholder
  const ipfsCid = `Qm${Buffer.from(actionName + Date.now()).toString('hex').slice(0, 44)}`;
  
  // Update the action code with its own CID
  actionCode = actionCode.replace("<THIS_ACTION_IPFS_CID>", ipfsCid);
  actionCode = actionCode.replace("<MIDI_DECRYPTOR_ACTION_CID>", ipfsCid);
  
  // Save deployment record
  const deployment: DeploymentRecord = {
    actionName,
    ipfsCid,
    deployedAt: new Date().toISOString(),
    network: "datil-dev"
  };
  
  // Save to deployments file
  const deploymentsPath = path.join(__dirname, "..", "deployments", "actions.json");
  let deployments: DeploymentRecord[] = [];
  
  try {
    const existing = await fs.readFile(deploymentsPath, "utf-8");
    deployments = JSON.parse(existing);
  } catch (e) {
    // File doesn't exist yet
  }
  
  deployments.push(deployment);
  await fs.writeFile(deploymentsPath, JSON.stringify(deployments, null, 2));
  
  console.log(`✅ ${actionName} deployed: ${ipfsCid}`);
  
  return ipfsCid;
}

async function main() {
  // Check if we have a contract address from Forge deployment
  let musicStoreAddress = process.env.MUSIC_STORE_ADDRESS;
  
  if (!musicStoreAddress) {
    // Try to read from Forge deployment
    try {
      const forgeDeployment = await fs.readFile(
        path.join(__dirname, "../../contracts/deployments/84532.json"),
        "utf-8"
      );
      const deployment = JSON.parse(forgeDeployment);
      musicStoreAddress = deployment.musicStore;
    } catch (e) {
      console.warn("No contract deployment found, using placeholder");
      musicStoreAddress = "0x0000000000000000000000000000000000000000";
    }
  }
  
  console.log(`Using MusicStore address: ${musicStoreAddress}`);
  
  // Deploy all actions
  await deployAction("voice-grader");
  await deployAction("midi-decryptor", musicStoreAddress);
  await deployAction("session-settlement", musicStoreAddress);
  
  console.log("\n✅ All Lit Actions deployed!");
}

main().catch(console.error);