import { Database } from "@tableland/sdk";
import { Wallet, getDefaultProvider } from "ethers";
import * as fs from "fs/promises";
import * as path from "path";
import { LitNodeClient } from "@lit-protocol/lit-node-client";
import { LIT_NETWORK } from "@lit-protocol/constants";

interface Song {
  id: number;
  title: string;
  artist: string;
  midiPath: string;
  isrc?: string;
  duration?: number;
  language?: string;
}

async function encryptMidiWithLitAction(midiData: string, actionCid: string) {
  const client = new LitNodeClient({
    litNetwork: LIT_NETWORK.Datil,
  });
  await client.connect();

  // Encrypt with the Lit Action's access
  const { ciphertext, dataToEncryptHash } = await client.encrypt({
    accessControlConditions: [{
      contractAddress: '',
      standardContractType: '',
      chain: 'base-sepolia',
      method: '',
      parameters: [':currentActionIpfsId'],
      returnValueTest: {
        comparator: '=',
        value: actionCid
      }
    }],
    dataToEncrypt: midiData,
  });

  return { ciphertext, dataToEncryptHash };
}

async function main() {
  // Load configuration
  const privateKey = process.env.PRIVATE_KEY!;
  const tableName = process.env.TABLELAND_SONGS_TABLE!;
  
  if (!privateKey || !tableName) {
    throw new Error("Missing PRIVATE_KEY or TABLELAND_SONGS_TABLE in .env");
  }

  // Get MIDI decryptor action CID
  let midiDecryptorCid: string;
  try {
    const deployments = JSON.parse(
      await fs.readFile(path.join(__dirname, "../../lit-actions/deployments/actions.json"), "utf-8")
    );
    const midiDecryptor = deployments.find((d: any) => d.actionName === "midi-decryptor");
    midiDecryptorCid = midiDecryptor.ipfsCid;
  } catch (e) {
    throw new Error("MIDI decryptor not deployed yet. Run 'bun run deploy:lit' first");
  }

  // Initialize database connection
  const wallet = new Wallet(privateKey);
  const provider = getDefaultProvider(process.env.RPC_URL_SEPOLIA);
  const signer = wallet.connect(provider);
  const db = new Database({ signer });

  // Load songs to update
  const songsPath = path.join(__dirname, "../data/songs.json");
  const songs: Song[] = JSON.parse(await fs.readFile(songsPath, "utf-8"));

  console.log(`Updating ${songs.length} songs in ${tableName}...`);

  for (const song of songs) {
    try {
      // Read MIDI file
      const midiPath = path.join(__dirname, "../data/midi", song.midiPath);
      const midiData = await fs.readFile(midiPath, "base64");
      
      // Encrypt MIDI with Lit Action access
      console.log(`Encrypting MIDI for ${song.title}...`);
      const { ciphertext, dataToEncryptHash } = await encryptMidiWithLitAction(midiData, midiDecryptorCid);
      
      // For MVP, store encrypted MIDI locally (in production, use IPFS/AIOZ)
      const encryptedPath = path.join(__dirname, "../data/encrypted", `${song.id}.enc`);
      await fs.mkdir(path.dirname(encryptedPath), { recursive: true });
      await fs.writeFile(encryptedPath, JSON.stringify({ ciphertext, dataToEncryptHash }));
      
      // Update Tableland with song metadata
      const { meta } = await db
        .prepare(`
          INSERT INTO ${tableName} (id, title, artist, isrc, duration, language, stems)
          VALUES (?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            title = excluded.title,
            artist = excluded.artist,
            isrc = excluded.isrc,
            duration = excluded.duration,
            language = excluded.language,
            stems = excluded.stems
        `)
        .bind(
          song.id,
          song.title,
          song.artist,
          song.isrc || "",
          song.duration || 0,
          song.language || "en",
          JSON.stringify({ midi: `encrypted/${song.id}.enc` })
        )
        .run();
      
      await meta.txn?.wait();
      console.log(`✅ Updated ${song.title}`);
      
    } catch (error) {
      console.error(`❌ Failed to update ${song.title}:`, error);
    }
  }
  
  console.log("\n✅ Song update complete!");
}

main().catch(console.error);