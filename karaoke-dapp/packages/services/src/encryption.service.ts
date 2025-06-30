import { LitNodeClient } from '@lit-protocol/lit-node-client';
import { encryptString, decryptToString } from '@lit-protocol/encryption';

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
      litNetwork: 'datil', // production network
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
}