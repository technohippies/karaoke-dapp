#!/usr/bin/env node
import { readFileSync } from 'fs';
import path from 'path';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import ora from 'ora';
import dotenv from 'dotenv';
import { LitNodeClient } from '@lit-protocol/lit-node-client';
import { ethers } from 'ethers';

dotenv.config();

interface TestOptions {
  cid: string;
  songId: number;
  userAddress?: string;
  privateKey?: string;
}

class DecryptionTester {
  private litNodeClient: LitNodeClient;
  private contractAddress: string;
  private midiDecryptorCid: string;

  constructor() {
    this.litNodeClient = new LitNodeClient({
      litNetwork: 'datil',
      debug: false
    });
    
    this.contractAddress = process.env.KARAOKE_STORE_ADDRESS || '';
    this.midiDecryptorCid = process.env.MIDI_DECRYPTOR_ACTION_CID || '';
  }

  async connect(): Promise<void> {
    const spinner = ora('Connecting to Lit Protocol...').start();
    try {
      await this.litNodeClient.connect();
      spinner.succeed('Connected to Lit Protocol');
    } catch (error) {
      spinner.fail('Failed to connect to Lit Protocol');
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    await this.litNodeClient.disconnect();
  }

  async testDecryption(
    cid: string,
    songId: number,
    userAddress: string,
    authSig: any
  ): Promise<void> {
    const spinner = ora(`Testing decryption for song ${songId}...`).start();
    
    try {
      // 1. Fetch encrypted data from AIOZ
      spinner.text = 'Fetching encrypted data from AIOZ...';
      const response = await fetch(`https://premium.aiozpin.network/ipfs/${cid}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch from AIOZ: ${response.statusText}`);
      }
      
      const encryptedData = await response.json();
      spinner.text = 'Encrypted data fetched successfully';
      
      // 2. Execute Lit Action to decrypt
      spinner.text = 'Executing MIDI Decryptor Lit Action...';
      
      const litActionCode = `
        (async () => {
          const response = await Lit.Actions.call({
            ipfsId: "${this.midiDecryptorCid}",
            params: {
              userAddress: "${userAddress}",
              songId: ${songId},
              encryptedMIDI: ${JSON.stringify(encryptedData.ciphertext)},
              midiHash: "${encryptedData.dataToEncryptHash}"
            }
          });
          
          Lit.Actions.setResponse({ response });
        })();
      `;
      
      const result = await this.litNodeClient.executeJs({
        code: litActionCode,
        authSig,
        jsParams: {}
      });
      
      if (result.response.success) {
        spinner.succeed(`Successfully decrypted MIDI for song ${songId}`);
        console.log('\n✅ Decryption successful!');
        console.log(`   Song ID: ${songId}`);
        console.log(`   MIDI size: ${result.response.midi.length} bytes`);
        console.log(`   Decrypted at: ${new Date(result.response.decryptedAt).toISOString()}`);
      } else {
        spinner.fail(`Decryption failed: ${result.response.error}`);
      }
      
    } catch (error: any) {
      spinner.fail(`Test failed: ${error.message}`);
      throw error;
    }
  }

  async checkContractAccess(userAddress: string, songId: number): Promise<boolean> {
    const spinner = ora('Checking contract access...').start();
    
    try {
      // Create read-only provider
      const provider = new ethers.JsonRpcProvider(
        process.env.RPC_URL || 'https://sepolia.base.org'
      );
      
      // Contract ABI for checkAccess function
      const abi = [
        'function checkAccess(address user, uint256 songId) view returns (bool)'
      ];
      
      const contract = new ethers.Contract(this.contractAddress, abi, provider);
      const hasAccess = await contract.checkAccess(userAddress, songId);
      
      if (hasAccess) {
        spinner.succeed(`User ${userAddress} has access to song ${songId}`);
      } else {
        spinner.fail(`User ${userAddress} does NOT have access to song ${songId}`);
      }
      
      return hasAccess;
    } catch (error: any) {
      spinner.fail(`Failed to check access: ${error.message}`);
      return false;
    }
  }
}

async function testDecryption(options: TestOptions) {
  const tester = new DecryptionTester();
  
  try {
    await tester.connect();
    
    // Get user address
    let userAddress = options.userAddress;
    let authSig = null;
    
    if (options.privateKey) {
      const wallet = new ethers.Wallet(options.privateKey);
      userAddress = wallet.address;
      
      // Create auth signature
      const domain = 'localhost';
      const origin = 'http://localhost:3000';
      const statement = 'I am signing to decrypt MIDI files';
      
      const message = `${domain} wants you to sign in with your Ethereum account:\n${userAddress}\n\n${statement}\n\nURI: ${origin}\nVersion: 1\nChain ID: 84532\nNonce: ${Date.now()}\nIssued At: ${new Date().toISOString()}`;
      
      const signature = await wallet.signMessage(message);
      
      authSig = {
        sig: signature,
        derivedVia: 'web3.eth.personal.sign',
        signedMessage: message,
        address: userAddress
      };
    }
    
    if (!userAddress) {
      throw new Error('User address or private key required');
    }
    
    // Check contract access first
    const hasAccess = await tester.checkContractAccess(userAddress, options.songId);
    
    if (!hasAccess) {
      console.log('\n⚠️  User does not have access to this song');
      console.log('   Please purchase the song first using the contract');
      return;
    }
    
    // Test decryption
    await tester.testDecryption(options.cid, options.songId, userAddress, authSig);
    
  } finally {
    await tester.disconnect();
  }
}

async function main() {
  const argv = await yargs(hideBin(process.argv))
    .command(
      'test',
      'Test MIDI decryption',
      {
        cid: {
          alias: 'c',
          description: 'AIOZ CID of encrypted MIDI',
          type: 'string',
          demandOption: true
        },
        'song-id': {
          alias: 's',
          description: 'Song ID',
          type: 'number',
          demandOption: true
        },
        'user-address': {
          alias: 'u',
          description: 'User wallet address',
          type: 'string'
        },
        'private-key': {
          alias: 'k',
          description: 'Private key for signing (alternative to user-address)',
          type: 'string'
        }
      },
      async (argv) => {
        await testDecryption({
          cid: argv.cid as string,
          songId: argv['song-id'] as number,
          userAddress: argv['user-address'] as string,
          privateKey: argv['private-key'] as string
        });
      }
    )
    .demandCommand()
    .help()
    .argv;
}

if (require.main === module) {
  main().catch(console.error);
}