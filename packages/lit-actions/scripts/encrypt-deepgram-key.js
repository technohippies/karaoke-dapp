#!/usr/bin/env node

/**
 * Encrypt Deepgram API key for use by the voice grader Lit Action
 * The key will be encrypted so only the voice grader action can decrypt it
 */

const { LitNodeClient } = require("@lit-protocol/lit-node-client");
const { LIT_NETWORK } = require("@lit-protocol/constants");
const dotenv = require("dotenv");
const path = require("path");
const fs = require("fs/promises");

// Load environment variables
dotenv.config({ path: path.join(__dirname, "../../../.env") });

async function main() {
  console.log("🔐 Encrypting Deepgram API Key");
  console.log("==============================\n");

  const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;
  if (!DEEPGRAM_API_KEY) {
    console.error("❌ DEEPGRAM_API_KEY not found in .env");
    process.exit(1);
  }

  // Get the voice grader CID
  const actionsPath = path.join(__dirname, "../deployments/actions.json");
  const actions = JSON.parse(await fs.readFile(actionsPath, "utf8"));
  const voiceGraderCid = actions.find(a => a.actionName === "voice-grader")?.ipfsCid;

  if (!voiceGraderCid) {
    console.error("❌ Voice grader not found in deployments");
    process.exit(1);
  }

  console.log("Voice Grader CID:", voiceGraderCid);
  console.log("Deepgram API Key:", DEEPGRAM_API_KEY.substring(0, 8) + "...");

  // Initialize Lit client
  const client = new LitNodeClient({
    litNetwork: LIT_NETWORK.DatilTest,
    debug: false
  });

  try {
    await client.connect();
    console.log("✅ Connected to Lit Network\n");

    // Create access control conditions that only allow the voice grader action to decrypt
    const accessControlConditions = [{
      contractAddress: '',
      standardContractType: '',
      chain: 'ethereum', // Use a generic chain for action-based ACC
      method: '',
      parameters: [':currentActionIpfsId'],
      returnValueTest: {
        comparator: '=',
        value: voiceGraderCid
      }
    }];

    console.log("📝 Encrypting API key with access control for voice grader action...");

    // Encrypt the API key
    const { ciphertext, dataToEncryptHash } = await client.encrypt({
      accessControlConditions,
      dataToEncrypt: new TextEncoder().encode(DEEPGRAM_API_KEY),
    });

    console.log("\n✅ API key encrypted successfully!");
    console.log("\nEncryption details:");
    console.log("Ciphertext:", ciphertext);
    console.log("Data hash:", dataToEncryptHash);

    // Save the encrypted key info
    const encryptedKeyInfo = {
      ciphertext,
      dataToEncryptHash,
      accessControlConditions,
      encryptedAt: new Date().toISOString(),
      forAction: "voice-grader",
      actionCid: voiceGraderCid
    };

    const outputPath = path.join(__dirname, "../deployments/encrypted-deepgram-key.json");
    await fs.writeFile(outputPath, JSON.stringify(encryptedKeyInfo, null, 2));

    console.log("\n💾 Saved encrypted key info to:", outputPath);
    console.log("\n📝 Next steps:");
    console.log("1. Update voice-grader.js with the ciphertext and hash");
    console.log("2. Redeploy the voice grader to IPFS");
    console.log("3. Test the complete flow");

    // Output the values to update in voice-grader.js
    console.log("\n🔧 Update these values in voice-grader.js:");
    console.log(`const DEEPGRAM_API_KEY_ENCRYPTED = '${ciphertext}';`);
    console.log(`const DEEPGRAM_KEY_HASH = '${dataToEncryptHash}';`);

  } catch (error) {
    console.error("❌ Encryption failed:", error.message);
    process.exit(1);
  } finally {
    await client.disconnect();
  }
}

main().catch(console.error);