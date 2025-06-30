#!/usr/bin/env node
import { LitNodeClient } from '@lit-protocol/lit-node-client';
import { ethers } from 'ethers';
import ora from 'ora';
import dotenv from 'dotenv';
import { MIDI_DECRYPTOR_ACTION } from '../packages/lit-actions/src/index';

dotenv.config();

class LitActionDeployer {
  private litNodeClient: LitNodeClient;
  private wallet: ethers.Wallet;

  constructor() {
    if (!process.env.PRIVATE_KEY) {
      throw new Error('PRIVATE_KEY not set in environment');
    }

    this.wallet = new ethers.Wallet(process.env.PRIVATE_KEY);
    this.litNodeClient = new LitNodeClient({
      litNetwork: process.env.LIT_NETWORK || 'datil',
      debug: false
    });
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

  async prepareActionCode(): Promise<void> {
    const spinner = ora('Preparing MIDI Decryptor Action...').start();
    
    try {
      // Replace environment variables in the action code
      const actionCode = MIDI_DECRYPTOR_ACTION
        .replace('${process.env.KARAOKE_STORE_ADDRESS || \'\'}', process.env.KARAOKE_STORE_ADDRESS || '')
        .replace('${process.env.RPC_URL || \'https://sepolia.base.org\'}', process.env.RPC_URL || 'https://sepolia.base.org');
      
      spinner.succeed('MIDI Decryptor Action prepared');
      
      console.log('\n📄 Action Code:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(actionCode);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      return;
      
    } catch (error: any) {
      spinner.fail(`Preparation failed: ${error.message}`);
      throw error;
    }
  }

  async verifyAction(cid: string): Promise<void> {
    const spinner = ora('Verifying deployed action...').start();
    
    try {
      // Test execution with mock parameters
      const authSig = {
        sig: await this.wallet.signMessage('test'),
        derivedVia: 'web3.eth.personal.sign',
        signedMessage: 'test',
        address: this.wallet.address
      };

      const result = await this.litNodeClient.executeJs({
        code: `
          const testParams = {
            userAddress: '${this.wallet.address}',
            songId: 1,
            encryptedMIDI: 'test',
            midiHash: 'test'
          };
          Lit.Actions.setResponse({ response: JSON.stringify({ test: true }) });
        `,
        authSig,
        jsParams: {}
      });

      if (result.response) {
        spinner.succeed('Action verification successful');
      } else {
        spinner.fail('Action verification failed');
      }
      
    } catch (error: any) {
      spinner.warn(`Verification warning: ${error.message}`);
    }
  }
}

async function deployMidiDecryptorAction() {
  const deployer = new LitActionDeployer();
  
  try {
    console.log('🎵 Preparing MIDI Decryptor Lit Action');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Network: ${process.env.LIT_NETWORK || 'datil'}`);
    console.log(`Contract: ${process.env.KARAOKE_STORE_ADDRESS || 'Not set'}`);
    console.log(`RPC: ${process.env.RPC_URL || 'https://sepolia.base.org'}`);
    console.log('');
    
    await deployer.prepareActionCode();
    
    console.log('\n📝 Manual Deployment Steps:');
    console.log('1. Copy the action code above');
    console.log('2. Upload to IPFS using Lit Protocol tools or pinata.cloud');
    console.log('3. Update your .env file:');
    console.log('   MIDI_DECRYPTOR_ACTION_CID=<your-ipfs-cid>');
    console.log('');
    console.log('4. Test the action:');
    console.log('   bun run test-decrypt --cid <encrypted-midi-cid> --song-id 1 --private-key $PRIVATE_KEY');
    
  } catch (error) {
    console.error('Preparation failed:', error);
  }
}

// Run deployment
deployMidiDecryptorAction().catch(console.error);