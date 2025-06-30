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

  purchaseSong: fromPromise(async ({ input }: { input: SongContext }) => {
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

      // If no credits, need to buy a credit pack with USDC
      if (credits === 0n) {
        console.log('No credits, need to buy credit pack with USDC...');
        
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
        
        // If allowance is insufficient, approve USDC spending
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
        }

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
    if (!context.userAddress) {
      throw new Error('No user address');
    }

    const encryptionService = new EncryptionService();
    await encryptionService.connect();

    const sessionSigs = await encryptionService.getSessionSigs(
      context.userAddress as `0x${string}`
    );

    // Store session for future use
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionSigs));

    return sessionSigs;
  }),

  decryptMidi: fromPromise(async ({ input }: { input: SongContext }) => {
    const context = input;
    if (!context.encryptedCid || !context.sessionSigs) {
      throw new Error('Missing encrypted CID or session signatures');
    }

    const encryptionService = new EncryptionService();
    await encryptionService.connect();

    // Fetch encrypted data from IPFS/AIOZ
    const response = await fetch(`https://gateway.pinata.cloud/ipfs/${context.encryptedCid}`);
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

    // Generate URLs based on song data
    const audioUrl = songData.stems?.vocals || ''; // Use vocals stem as audio
    const lyricsUrl = `https://lrclib.net/api/get?track_name=${encodeURIComponent(songData.title)}&artist_name=${encodeURIComponent(songData.artist)}&duration=${songData.duration}`;

    return {
      midiData: new Uint8Array(decryptedMidi),
      audioUrl,
      lyricsUrl,
    };
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