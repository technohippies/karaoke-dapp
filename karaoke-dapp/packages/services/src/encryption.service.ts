import { LitNodeClient } from '@lit-protocol/lit-node-client';
import { encryptString, decryptToString } from '@lit-protocol/encryption';
import type { SessionSigsMap } from '@lit-protocol/types';
import { LIT_NETWORK, LIT_ABILITY } from '@lit-protocol/constants';
import { 
  LitActionResource, 
  createSiweMessageWithRecaps, 
  generateAuthSig 
} from '@lit-protocol/auth-helpers';
import { ethers } from 'ethers';

export interface EncryptionResult {
  ciphertext: string;
  dataToEncryptHash: string;
  accessControlConditions: any[];
}

export class EncryptionService {
  private litNodeClient: LitNodeClient;
  private connected: boolean = false;

  constructor() {
    this.litNodeClient = new LitNodeClient({
      litNetwork: LIT_NETWORK.Datil, // production network
      debug: false
    });
  }

  async connect(): Promise<void> {
    if (this.connected) return;
    
    await this.litNodeClient.connect();
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    if (!this.connected) return;
    
    await this.litNodeClient.disconnect();
    this.connected = false;
  }

  /**
   * Create access control conditions for the MIDI Decryptor Action
   */
  createMidiDecryptorAccessConditions(
    _contractAddress: string,
    _songId: number,
    midiDecryptorActionCid: string
  ): any[] {
    return [
      {
        contractAddress: '', // Empty for action-based access
        standardContractType: '',
        chain: 'base',
        method: '',
        parameters: [':currentActionIpfsId'],
        returnValueTest: {
          comparator: '=',
          value: midiDecryptorActionCid
        }
      }
    ];
  }

  /**
   * Encrypt MIDI file content
   */
  async encryptMidi(
    midiContent: Uint8Array,
    contractAddress: string,
    songId: number,
    midiDecryptorActionCid: string
  ): Promise<EncryptionResult> {
    if (!this.connected) {
      await this.connect();
    }

    const accessControlConditions = this.createMidiDecryptorAccessConditions(
      contractAddress,
      songId,
      midiDecryptorActionCid
    );

    // Convert to base64 for encryption
    const base64Content = Buffer.from(midiContent).toString('base64');

    // Encrypt with Lit
    const { ciphertext, dataToEncryptHash } = await encryptString(
      {
        dataToEncrypt: base64Content,
        accessControlConditions,
      },
      this.litNodeClient
    );

    return {
      ciphertext,
      dataToEncryptHash,
      accessControlConditions
    };
  }

  /**
   * Verify encryption by attempting to decrypt (for testing)
   */
  async verifyEncryption(
    encryptionResult: EncryptionResult,
    authSig: any
  ): Promise<boolean> {
    if (!this.connected) {
      await this.connect();
    }

    try {
      const decrypted = await decryptToString(
        {
          ciphertext: encryptionResult.ciphertext,
          dataToEncryptHash: encryptionResult.dataToEncryptHash,
          accessControlConditions: encryptionResult.accessControlConditions,
          chain: 'base',
          authSig
        },
        this.litNodeClient
      );

      return decrypted.length > 0;
    } catch (error) {
      console.error('Verification failed:', error);
      return false;
    }
  }

  /**
   * Get session signatures for extended access without repeated signing
   */
  async getSessionSigs(): Promise<SessionSigsMap> {
    if (!this.connected) {
      await this.connect();
    }

    // Clear any corrupted stored session data
    console.log('🧹 Clearing any existing Lit session data...');
    localStorage.removeItem('lit-session-key');
    localStorage.removeItem('lit-wallet-sig');
    localStorage.removeItem('lit-session-sigs');
    
    // Create a wallet instance (in production, this would use the connected wallet)
    const provider = new ethers.BrowserProvider((window as any).ethereum);
    const ethersSigner = await provider.getSigner();

    console.log('🔐 Creating session signatures using proper Lit SDK approach...');
    
    const sessionSigs = await this.litNodeClient.getSessionSigs({
      chain: 'base',
      expiration: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(), // 24 hours
      resourceAbilityRequests: [
        {
          resource: new LitActionResource('*'),
          ability: LIT_ABILITY.LitActionExecution,
        },
      ],
      authNeededCallback: async ({ resourceAbilityRequests, expiration, uri }) => {
        console.log('🔐 authNeededCallback called with proper params:', {
          resourceAbilityRequests: resourceAbilityRequests?.length || 0,
          expiration,
          uri
        });
        
        // Create proper SIWE message using Lit SDK helper
        const toSign = await createSiweMessageWithRecaps({
          uri: uri!,
          expiration: expiration!,
          resources: resourceAbilityRequests!,
          walletAddress: await ethersSigner.getAddress(),
          nonce: await this.litNodeClient.getLatestBlockhash(),
          litNodeClient: this.litNodeClient,
        });

        console.log('📝 Proper SIWE message created:', toSign.substring(0, 100) + '...');

        // Generate auth signature using Lit SDK helper
        const authSig = await generateAuthSig({
          signer: ethersSigner,
          toSign,
        });

        console.log('✅ Auth signature generated successfully');
        return authSig;
      },
    });
    
    console.log('✅ Session signatures created successfully with proper SIWE format');
    return sessionSigs;
  }

  /**
   * Decrypt MIDI using Lit Action
   */
  async decryptWithAction(
    encryptedData: EncryptionResult,
    sessionSigs: SessionSigsMap,
    songId: number,
    userAddress: `0x${string}`
  ): Promise<ArrayBuffer> {
    if (!this.connected) {
      await this.connect();
    }

    // Execute the Lit Action with session signatures
    const response = await this.litNodeClient.executeJs({
      sessionSigs,
      code: `
        (async () => {
          const decrypted = await Lit.Actions.decrypt({
            ciphertext: encryptedMIDI,
            dataToEncryptHash: midiHash,
            accessControlConditions
          });
          
          // Convert base64 back to bytes
          const binaryString = atob(decrypted);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          
          return bytes;
        })();
      `,
      jsParams: {
        encryptedMIDI: encryptedData.ciphertext,
        midiHash: encryptedData.dataToEncryptHash,
        accessControlConditions: encryptedData.accessControlConditions,
        songId,
        userAddress,
      },
    });

    return response.response as ArrayBuffer;
  }
}