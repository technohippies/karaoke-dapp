#!/usr/bin/env node
import { Database } from '@tableland/sdk';
import { Wallet, ethers } from 'ethers';
import ora from 'ora';
import dotenv from 'dotenv';
import * as path from 'path';

// Load from parent directory .env
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Parse command line arguments
const args = process.argv.slice(2);
if (args.length < 3) {
  console.error('Usage: npm run update-song <id> <field> <value>');
  console.error('Example: npm run update-song 1 genius_id 114153');
  console.error('For JSON fields, wrap in single quotes: npm run update-song 1 streaming_links \'{"spotify":"..."}\'');
  process.exit(1);
}

const [songId, field, value] = args;

async function updateSong() {
  const spinner = ora(`Updating song ${songId} - ${field}...`).start();
  
  try {
    // Validate environment
    if (!process.env.PRIVATE_KEY) {
      throw new Error('PRIVATE_KEY not set in environment');
    }
    
    // Create wallet with provider
    const provider = new ethers.JsonRpcProvider('https://sepolia.base.org');
    const wallet = new Wallet(process.env.PRIVATE_KEY, provider);
    spinner.text = `Using wallet: ${wallet.address}`;
    
    // Initialize Tableland
    const db = new Database({ 
      signer: wallet,
      baseUrl: 'https://tableland.network' 
    });
    
    const tableName = 'songs_v8_84532_135';
    
    // Parse value if it's JSON
    let parsedValue = value;
    if (field === 'stems' || field === 'artwork_hash' || field === 'streaming_links') {
      try {
        parsedValue = JSON.stringify(JSON.parse(value));
      } catch {
        // If not valid JSON, keep as string
      }
    }
    
    // Update the song
    spinner.text = `Updating ${field} for song ${songId}...`;
    
    const { meta } = await db
      .prepare(`UPDATE ${tableName} SET ${field} = ? WHERE id = ?`)
      .bind(parsedValue, parseInt(songId))
      .run();
    
    await meta.txn?.wait();
    spinner.succeed(`Successfully updated ${field} for song ${songId}`);
    
    console.log('\n✅ Verify at:');
    console.log(`https://testnets.tableland.network/api/v1/query?statement=SELECT%20*%20FROM%20${tableName}%20WHERE%20id=${songId}`);
    
  } catch (error) {
    spinner.fail(`Failed to update song: ${error.message}`);
    console.error('Error details:', error);
    process.exit(1);
  }
}

// Run update
updateSong();