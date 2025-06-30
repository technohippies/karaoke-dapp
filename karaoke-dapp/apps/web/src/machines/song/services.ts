import { fromPromise } from 'xstate';
import { readContract, writeContract, waitForTransactionReceipt } from 'wagmi/actions';
import { wagmiConfig } from '../../wagmi';
import { MusicStoreV2ABI, CONTRACTS } from '@karaoke-dapp/contracts';
import { EncryptionService, DatabaseService } from '@karaoke-dapp/services/browser';
import { openDB } from 'idb';
import type { SongContext } from '../types';
import type { SessionSigsMap } from '@lit-protocol/types';

const MUSIC_STORE_ADDRESS = CONTRACTS.baseSepolia.musicStore;
const SESSION_STORAGE_KEY = 'lit-session-sigs';
const MIDI_CACHE_STORE = 'midi-cache';

export const songServices = {
  checkAccess: fromPromise(async ({ input }: { input: SongContext }) => {
    const context = input;
    if (!context.userAddress) {
      throw new Error('No user address');
    }

    const hasAccess = await readContract(wagmiConfig, {
      address: MUSIC_STORE_ADDRESS,
      abi: MusicStoreV2ABI,
      functionName: 'checkAccess',
      args: [context.userAddress as `0x${string}`, BigInt(context.songId)],
    });

    if (hasAccess) {
      // For now, just return a mock token ID since getUserTokenForSong doesn't exist in the ABI
      return { hasAccess: true, tokenId: `${context.songId}-${context.userAddress}` };
    }

    return { hasAccess: false };
  }),

  approveUSDC: fromPromise(async ({ input }: { input: SongContext }) => {
    const context = input;
    if (!context.userAddress) {
      throw new Error('No user address');
    }

    // Get the credit pack price in USDC
    const packPrice = await readContract(wagmiConfig, {
      address: MUSIC_STORE_ADDRESS,
      abi: MusicStoreV2ABI,
      functionName: 'SONG_PACK_PRICE',
    });

    console.log('Credit pack price (USDC wei):', packPrice);
    
    // Define USDC contract ABI (minimal)
    const USDC_ABI = [
      {
        name: 'approve',
        type: 'function',
        inputs: [
          { name: 'spender', type: 'address' },
          { name: 'amount', type: 'uint256' }
        ],
        outputs: [{ type: 'bool' }],
        stateMutability: 'nonpayable'
      },
      {
        name: 'allowance',
        type: 'function',
        inputs: [
          { name: 'owner', type: 'address' },
          { name: 'spender', type: 'address' }
        ],
        outputs: [{ type: 'uint256' }],
        stateMutability: 'view'
      }
    ] as const;
    
    // Check current allowance
    const allowance = await readContract(wagmiConfig, {
      address: CONTRACTS.baseSepolia.usdc,
      abi: USDC_ABI,
      functionName: 'allowance',
      args: [context.userAddress as `0x${string}`, MUSIC_STORE_ADDRESS],
    });
    
    console.log('Current USDC allowance:', allowance);
    
    // Only approve if allowance is insufficient
    if (allowance < packPrice) {
      console.log('Approving USDC spending...');
      const approveHash = await writeContract(wagmiConfig, {
        address: CONTRACTS.baseSepolia.usdc,
        abi: USDC_ABI,
        functionName: 'approve',
        args: [MUSIC_STORE_ADDRESS, packPrice],
      });
      
      await waitForTransactionReceipt(wagmiConfig, {
        hash: approveHash,
        confirmations: 1,
      });
      
      console.log('USDC approved');
      return { approved: true, hash: approveHash };
    } else {
      console.log('USDC already approved');
      return { approved: false, hash: null };
    }
  }),

  purchaseAndUnlock: fromPromise(async ({ input }: { input: SongContext }) => {
    const context = input;
    if (!context.userAddress) {
      throw new Error('No user address');
    }

    try {
      // First check if user has credits
      const credits = await readContract(wagmiConfig, {
        address: MUSIC_STORE_ADDRESS,
        abi: MusicStoreV2ABI,
        functionName: 'getCredits',
        args: [context.userAddress as `0x${string}`],
      });

      console.log('User credits:', credits);

      // If no credits, buy a credit pack (assumes USDC is already approved)
      if (credits === 0n) {
        console.log('No credits, buying credit pack...');

        // Buy credit pack (this will pull USDC)
        const hash = await writeContract(wagmiConfig, {
          address: MUSIC_STORE_ADDRESS,
          abi: MusicStoreV2ABI,
          functionName: 'buyCreditPack',
          // No value field - payment is in USDC
        });

        console.log('Credit pack purchase tx:', hash);

        // Wait for confirmation
        const receipt = await waitForTransactionReceipt(wagmiConfig, {
          hash,
          confirmations: 1,
        });

        if (receipt.status !== 'success') {
          throw new Error('Credit pack purchase failed');
        }

        console.log('Credit pack purchased successfully');
      }

      // Now unlock the song using credits
      const unlockHash = await writeContract(wagmiConfig, {
        address: MUSIC_STORE_ADDRESS,
        abi: MusicStoreV2ABI,
        functionName: 'unlockSong',
        args: [BigInt(context.songId)],
      });

      console.log('Song unlock tx:', unlockHash);

      // Wait for confirmation
      const unlockReceipt = await waitForTransactionReceipt(wagmiConfig, {
        hash: unlockHash,
        confirmations: 1,
      });

      if (unlockReceipt.status !== 'success') {
        throw new Error('Song unlock failed');
      }

      console.log('Song unlocked successfully');

      // Return the transaction hash as token ID
      return { tokenId: unlockHash };
    } catch (error: any) {
      console.error('Purchase error:', error);
      
      // Extract user-friendly error message
      if (error.message?.includes('User rejected')) {
        throw new Error('Transaction cancelled');
      } else if (error.message?.includes('insufficient funds')) {
        throw new Error('Insufficient USDC balance');
      } else if (error.message?.includes('ERC20: insufficient balance')) {
        throw new Error('Insufficient USDC balance');
      } else {
        throw new Error(error.message || 'Purchase failed');
      }
    }
  }),

  checkCache: fromPromise(async ({ input }: { input: SongContext }) => {
    const context = input;
    try {
      const db = await openDB('karaoke-cache', 1, {
        upgrade(db) {
          if (!db.objectStoreNames.contains(MIDI_CACHE_STORE)) {
            db.createObjectStore(MIDI_CACHE_STORE);
          }
        },
      });
      
      const cachedData = await db.get(MIDI_CACHE_STORE, `song-${context.songId}`);
      
      if (cachedData && cachedData.midiData) {
        return {
          midiData: cachedData.midiData,
          audioUrl: cachedData.audioUrl,
          lyricsUrl: cachedData.lyricsUrl,
        };
      }

      // If not cached, get encrypted CID from database
      const dbService = new DatabaseService();
      const songData = await dbService.getSongById(context.songId);
      
      if (!songData) {
        throw new Error('Song not found');
      }
      
      // For now, return mock encrypted CID since the field doesn't exist yet
      return {
        encryptedCid: `encrypted-${context.songId}`,
      };
    } catch (error) {
      throw error;
    }
  }),

  checkSession: fromPromise(async () => {
    try {
      const storedSession = localStorage.getItem(SESSION_STORAGE_KEY);
      if (storedSession) {
        const sessionSigs: SessionSigsMap = JSON.parse(storedSession);
        
        // Check if session is still valid
        // Session signatures have expiration in the sig property
        const firstSig = Object.values(sessionSigs)[0];
        if (firstSig) {
          // For now, assume sessions are valid for 24 hours
          // In production, you'd parse the actual expiration from the session
          return sessionSigs;
        }
      }
      return null;
    } catch {
      return null;
    }
  }),

  createSession: fromPromise(async ({ input }: { input: SongContext }) => {
    const context = input;
    console.log('🔐 createSession started for user:', context.userAddress);
    
    if (!context.userAddress) {
      console.error('❌ No user address provided');
      throw new Error('No user address');
    }

    try {
      console.log('🔗 Connecting to encryption service...');
      const encryptionService = new EncryptionService();
      await encryptionService.connect();
      console.log('✅ Encryption service connected');

      console.log('📝 Getting session signatures...');
      const sessionSigs = await encryptionService.getSessionSigs();
      console.log('✅ Session signatures obtained:', Object.keys(sessionSigs).length, 'signatures');

      // Store session for future use
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionSigs));
      console.log('💾 Session stored in localStorage');

      return sessionSigs;
    } catch (error) {
      console.error('❌ createSession failed:', error);
      throw new Error(`Session creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }),

  decryptMidi: fromPromise(async ({ input }: { input: SongContext }) => {
    const context = input;
    console.log('🔓 decryptMidi started with context:', {
      songId: context.songId,
      encryptedCid: context.encryptedCid,
      hasSessionSigs: !!context.sessionSigs,
      userAddress: context.userAddress
    });

    if (!context.encryptedCid || !context.sessionSigs) {
      console.error('❌ Missing required data:', {
        hasEncryptedCid: !!context.encryptedCid,
        hasSessionSigs: !!context.sessionSigs
      });
      throw new Error('Missing encrypted CID or session signatures');
    }

    // Check if this is a mock encrypted CID (development mode)
    if (context.encryptedCid.startsWith('encrypted-')) {
      console.log('🧪 Using mock encrypted CID for development:', context.encryptedCid);
      // Return mock MIDI data for development
      const mockMidiData = new Uint8Array([
        0x4d, 0x54, 0x68, 0x64, // "MThd"
        0x00, 0x00, 0x00, 0x06, // Header length
        0x00, 0x00, // Format type 0
        0x00, 0x01, // 1 track
        0x00, 0x60, // 96 ticks per quarter note
        0x4d, 0x54, 0x72, 0x6b, // "MTrk"
        0x00, 0x00, 0x00, 0x04, // Track length
        0x00, 0xff, 0x2f, 0x00  // End of track
      ]);

      // Get audio and lyrics URLs from database
      const dbService = new DatabaseService();
      const songData = await dbService.getSongById(context.songId);

      if (!songData) {
        throw new Error('Song not found');
      }

      const audioUrl = songData.stems?.vocals || '';
      const lyricsUrl = `https://lrclib.net/api/get?track_name=${encodeURIComponent(songData.title)}&artist_name=${encodeURIComponent(songData.artist)}&duration=${songData.duration}`;

      console.log('✅ Mock MIDI decryption successful:', {
        midiSize: mockMidiData.length,
        audioUrl,
        lyricsUrl
      });

      return {
        midiData: mockMidiData,
        audioUrl,
        lyricsUrl,
      };
    }

    try {
      const encryptionService = new EncryptionService();
      await encryptionService.connect();

      // Fetch encrypted data from IPFS/AIOZ
      const response = await fetch(`https://gateway.pinata.cloud/ipfs/${context.encryptedCid}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch encrypted data: ${response.status} ${response.statusText}`);
      }
      
      const encryptedData = await response.json();

      // Decrypt using Lit Protocol
      const decryptedMidi = await encryptionService.decryptWithAction(
        encryptedData,
        context.sessionSigs,
        context.songId,
        context.userAddress as `0x${string}`
      );

      // Get audio and lyrics URLs from database
      const dbService = new DatabaseService();
      const songData = await dbService.getSongById(context.songId);

      if (!songData) {
        throw new Error('Song not found');
      }

      const audioUrl = songData.stems?.vocals || '';
      const lyricsUrl = `https://lrclib.net/api/get?track_name=${encodeURIComponent(songData.title)}&artist_name=${encodeURIComponent(songData.artist)}&duration=${songData.duration}`;

      return {
        midiData: new Uint8Array(decryptedMidi),
        audioUrl,
        lyricsUrl,
      };
    } catch (error) {
      console.error('MIDI decryption failed:', error);
      throw new Error(`MIDI decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }),

  cacheMidi: fromPromise(async ({ input }: { input: SongContext }) => {
    const context = input;
    if (!context.midiData) {
      throw new Error('No MIDI data to cache');
    }

    const db = await openDB('karaoke-cache', 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(MIDI_CACHE_STORE)) {
          db.createObjectStore(MIDI_CACHE_STORE);
        }
      },
    });

    await db.put(MIDI_CACHE_STORE, {
      midiData: context.midiData,
      audioUrl: context.audioUrl,
      lyricsUrl: context.lyricsUrl,
      timestamp: Date.now(),
    }, `song-${context.songId}`);
  }),
};