import { LitNodeClient } from '@lit-protocol/lit-node-client';
import { encryptString, decryptToString } from '@lit-protocol/encryption';
import type { SessionSigsMap } from '@lit-protocol/types';
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

  /**
   * Get session signatures for extended access without repeated signing
   */
  async getSessionSigs(userAddress: `0x${string}`): Promise<SessionSigsMap> {
    if (!this.connected) {
      await this.connect();
    }

    // Create a wallet instance (in production, this would use the connected wallet)
    const provider = new ethers.BrowserProvider((window as any).ethereum);
    const signer = await provider.getSigner();

    const authNeededCallback = async (params: any) => {
      const toSign = params.message || params.statement;
      const signature = await signer.signMessage(toSign);
      
      return {
        sig: signature,
        derivedVia: 'web3.eth.personal.sign',
        signedMessage: toSign,
        address: userAddress,
      };
    };

    const sessionSigs = await this.litNodeClient.getSessionSigs({
      chain: 'base',
      expiration: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(), // 24 hours
      resourceAbilityRequests: [
        {
          resource: {
            resource: '*',
            resourcePrefix: 'lit-litaction',
            getResourceKey: () => 'lit-litaction/*',
            isValidLitAbility: () => true
          } as any,
          ability: 'lit-action-execution' as any
        },
        {
          resource: {
            resource: '*',
            resourcePrefix: 'lit-accesscontrolcondition',
            getResourceKey: () => 'lit-accesscontrolcondition/*',
            isValidLitAbility: () => true
          } as any,
          ability: 'access-control-condition-decryption' as any
        }
      ],
      authNeededCallback,
    });

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