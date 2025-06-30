#!/usr/bin/env node
import { readFileSync, existsSync } from 'fs';
import path from 'path';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import ora from 'ora';
import dotenv from 'dotenv';
import { EncryptionService } from '../packages/services/src/encryption.service';
import { AIOZUploadService } from '../packages/services/src/aioz-upload.service';
import { Database } from '@tableland/sdk';
import { Wallet, JsonRpcProvider } from 'ethers';
import { SONGS_TABLE } from '../packages/db/src/tableland';

// Load .env from parent directory
dotenv.config({ path: path.join(__dirname, '../..', '.env') });

interface ProcessOptions {
  midi: string;
  songId: number;
  dryRun?: boolean;
}

interface BatchProcessOptions {
  csv: string;
  midiDir: string;
  dryRun?: boolean;
}

class SongProcessor {
  private encryptionService: EncryptionService;
  private uploadService: AIOZUploadService;
  private db: Database;
  private contractAddress: string;
  private midiDecryptorCid: string;

  constructor() {
    this.encryptionService = new EncryptionService();
    this.uploadService = new AIOZUploadService(
      process.env.AIOZ_API_URL || 'https://api.w3ipfs.storage/api',
      process.env.AIOZ_PUBLIC_KEY,
      process.env.AIOZ_SECRET_KEY
    );
    
    // Initialize Tableland with wallet and provider
    if (process.env.PRIVATE_KEY && process.env.PRIVATE_KEY !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
      const provider = new JsonRpcProvider(process.env.RPC_URL_SEPOLIA);
      const wallet = new Wallet(process.env.PRIVATE_KEY, provider);
      this.db = new Database({ signer: wallet });
    } else {
      // For dry runs, we can use a read-only database
      this.db = new Database();
    }
    
    this.contractAddress = process.env.KARAOKE_STORE_ADDRESS || '0x0000000000000000000000000000000000000000';
    this.midiDecryptorCid = process.env.MIDI_DECRYPTOR_ACTION_CID || 'QmXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX';
    
    // Only validate for non-dry runs
    if (!process.env.DRY_RUN) {
      this.validateConfig();
    }
  }

  private validateConfig() {
    if (!this.contractAddress) {
      throw new Error('KARAOKE_STORE_ADDRESS not set in environment');
    }
    if (!this.midiDecryptorCid) {
      throw new Error('MIDI_DECRYPTOR_ACTION_CID not set in environment');
    }
    if (!process.env.PRIVATE_KEY) {
      throw new Error('PRIVATE_KEY not set in environment');
    }
  }

  async processSong(midiPath: string, songId: number, dryRun: boolean = false): Promise<void> {
    const spinner = ora(`Processing song ${songId}: ${path.basename(midiPath)}`).start();
    
    try {
      // 1. Read MIDI file
      if (!existsSync(midiPath)) {
        throw new Error(`MIDI file not found: ${midiPath}`);
      }
      
      const midiContent = readFileSync(midiPath);
      spinner.text = 'Encrypting MIDI file...';
      
      // 2. Connect to Lit Protocol
      await this.encryptionService.connect();
      
      // 3. Encrypt MIDI
      const encryptionResult = await this.encryptionService.encryptMidi(
        new Uint8Array(midiContent),
        this.contractAddress,
        songId,
        this.midiDecryptorCid
      );
      
      spinner.text = 'Uploading to AIOZ...';
      
      // 4. Upload encrypted data to AIOZ
      const uploadData = {
        ciphertext: encryptionResult.ciphertext,
        dataToEncryptHash: encryptionResult.dataToEncryptHash,
        accessControlConditions: encryptionResult.accessControlConditions
      };
      
      let uploadResult;
      if (!dryRun) {
        uploadResult = await this.uploadService.uploadJSON(
          uploadData,
          `song-${songId}-piano-encrypted.json`,
          songId
        );
      } else {
        // For dry run, simulate upload result
        uploadResult = {
          cid: 'QmDRYRUN' + Math.random().toString(36).substring(7),
          size: JSON.stringify(uploadData).length,
          url: 'https://premium.aiozpin.network/ipfs/QmDRYRUN...'
        };
      }
      
      spinner.text = 'Updating Tableland...';
      
      // 5. Update Tableland (unless dry run)
      if (!dryRun) {
        const stemsData = JSON.stringify({ piano: uploadResult.cid });
        const updateQuery = `UPDATE ${SONGS_TABLE} SET stems = ? WHERE id = ?`;
        
        const { meta } = await this.db.prepare(updateQuery)
          .bind(stemsData, songId)
          .run();
          
        await meta.txn?.wait();
        
        spinner.succeed(`Song ${songId} processed successfully! CID: ${uploadResult.cid}`);
      } else {
        spinner.succeed(`[DRY RUN] Song ${songId} would be uploaded with CID: ${uploadResult.cid}`);
      }
      
    } catch (error: any) {
      spinner.fail(`Failed to process song ${songId}: ${error.message}`);
      throw error;
    } finally {
      await this.encryptionService.disconnect();
    }
  }

  async verifyAccess(songId: number): Promise<void> {
    // Query Tableland to verify the song was updated
    const query = `SELECT id, title, artist, stems FROM ${SONGS_TABLE} WHERE id = ?`;
    const result = await this.db.prepare(query).bind(songId).first();
    
    if (result && result.stems) {
      console.log(`✅ Song ${songId} verified in Tableland:`);
      console.log(`   Title: ${result.title}`);
      console.log(`   Artist: ${result.artist}`);
      console.log(`   Stems: ${result.stems}`);
    } else {
      console.log(`❌ Song ${songId} not found or has no stems`);
    }
  }
}

async function processSingle(options: ProcessOptions) {
  if (options.dryRun) {
    process.env.DRY_RUN = 'true';
  }
  
  const processor = new SongProcessor();
  await processor.processSong(options.midi, options.songId, options.dryRun);
  
  if (!options.dryRun) {
    console.log('\nVerifying upload...');
    await processor.verifyAccess(options.songId);
  }
}

async function main() {
  const argv = await yargs(hideBin(process.argv))
    .command(
      'process',
      'Process a single song',
      {
        midi: {
          alias: 'm',
          description: 'Path to MIDI file',
          type: 'string',
          demandOption: true
        },
        'song-id': {
          alias: 's',
          description: 'Song ID in database',
          type: 'number',
          demandOption: true
        },
        'dry-run': {
          alias: 'd',
          description: 'Simulate without uploading',
          type: 'boolean',
          default: false
        }
      },
      async (argv) => {
        await processSingle({
          midi: argv.midi as string,
          songId: argv['song-id'] as number,
          dryRun: argv['dry-run'] as boolean
        });
      }
    )
    .command(
      'verify',
      'Verify a song in Tableland',
      {
        'song-id': {
          alias: 's',
          description: 'Song ID to verify',
          type: 'number',
          demandOption: true
        }
      },
      async (argv) => {
        const processor = new SongProcessor();
        await processor.verifyAccess(argv['song-id'] as number);
      }
    )
    .demandCommand()
    .help()
    .argv;
}

if (require.main === module) {
  main().catch(console.error);
}