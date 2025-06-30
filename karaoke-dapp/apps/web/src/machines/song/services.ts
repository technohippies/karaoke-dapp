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

    console.log('🔍 checkAccess called for:', { 
      songId: context.songId, 
      userAddress: context.userAddress 
    });

    // Check if user already has access to this specific song
    const hasAccess = await readContract(wagmiConfig, {
      address: MUSIC_STORE_ADDRESS,
      abi: MusicStoreV2ABI,
      functionName: 'checkAccess',
      args: [context.userAddress as `0x${string}`, BigInt(context.songId)],
    });

    console.log('🎵 Song access check result:', hasAccess);

    // Also check user's credit balance and purchase history for debugging
    try {
      const credits = await readContract(wagmiConfig, {
        address: MUSIC_STORE_ADDRESS,
        abi: MusicStoreV2ABI,
        functionName: 'getCredits',
        args: [context.userAddress as `0x${string}`],
      });
      console.log('💳 User credit balance:', credits.toString());

      // Check if user has access to other songs to understand their purchase history
      console.log('🔍 Checking access to all songs for purchase history...');
      for (let songId = 1; songId <= 3; songId++) {
        try {
          const hasAccessToSong = await readContract(wagmiConfig, {
            address: MUSIC_STORE_ADDRESS,
            abi: MusicStoreV2ABI,
            functionName: 'checkAccess',
            args: [context.userAddress as `0x${string}`, BigInt(songId)],
          });
          console.log(`🎵 Song ${songId} access:`, hasAccessToSong);
        } catch (err) {
          console.log(`❓ Song ${songId} check failed:`, err);
        }
      }
    } catch (error) {
      console.error('❌ Failed to check credits:', error);
    }

    if (hasAccess) {
      // User already owns this song
      console.log('✅ User has access to song', context.songId);
      return { hasAccess: true, tokenId: `${context.songId}-${context.userAddress}` };
    }

    // User doesn't own the song - check if they have credits to unlock it
    try {
      const credits = await readContract(wagmiConfig, {
        address: MUSIC_STORE_ADDRESS,
        abi: MusicStoreV2ABI,
        functionName: 'getCredits',
        args: [context.userAddress as `0x${string}`],
      });

      console.log(`💳 User has ${credits} credits for song ${context.songId}`);

      if (credits > 0n) {
        // User has credits available but doesn't own the song yet
        console.log('✅ User can unlock song with credits');
        return { 
          hasAccess: false,
          canUnlock: true,
          credits: Number(credits)
        };
      }

      // User has no credits - they need to purchase
      console.log('❌ User has no credits to unlock song');
      return { hasAccess: false };
    } catch (error) {
      console.error('❌ Failed to check credits:', error);
      // Fallback to original behavior
      console.log('❌ User does not have access to song', context.songId);
      return { hasAccess: false };
    }
  }),

  unlockSong: fromPromise(async ({ input }: { input: SongContext }) => {
    const context = input;
    if (!context.userAddress) {
      throw new Error('No user address');
    }

    console.log('🔓 Unlocking song with credits:', context.songId);

    try {
      // Use 1 credit to unlock the song
      const unlockHash = await writeContract(wagmiConfig, {
        address: MUSIC_STORE_ADDRESS,
        abi: MusicStoreV2ABI,
        functionName: 'unlockSong',
        args: [BigInt(context.songId)],
      });

      console.log('🎵 Song unlock tx:', unlockHash);

      // Wait for confirmation
      const receipt = await waitForTransactionReceipt(wagmiConfig, {
        hash: unlockHash,
        confirmations: 1,
      });

      if (receipt.status !== 'success') {
        throw new Error('Song unlock failed');
      }

      console.log('✅ Song unlocked successfully with credits');

      // Immediately fetch and cache the content after unlocking
      console.log('📦 Auto-downloading content after unlock...');
      
      // Get encrypted CID (for now, using mock) - used for development mode check
      
      // Get audio and lyrics URLs from database
      const dbService = new DatabaseService();
      const songData = await dbService.getSongById(context.songId);

      if (!songData) {
        throw new Error('Song not found after unlock');
      }

      const audioUrl = songData.stems?.vocals || '';
      const lyricsUrl = `https://lrclib.net/api/get?track_name=${encodeURIComponent(songData.title)}&artist_name=${encodeURIComponent(songData.artist)}&duration=${songData.duration}`;

      // Load real MIDI data based on song ID
      let midiData: Uint8Array;
      
      try {
        // Map song IDs to MIDI files
        const midiFiles: { [key: number]: string } = {
          1: '/test-data/midi/demo-song-1/lorde-royals-piano.mid',
          2: '/test-data/midi/demo-song-1/abba-dancing-queen-piano.mid'
        };
        
        const midiPath = midiFiles[context.songId];
        if (!midiPath) {
          console.log('🎵 No MIDI file found for song ID, using mock data');
          const { createMockMidiData } = await import('../../utils/mock-midi');
          midiData = createMockMidiData();
        } else {
          console.log('🎵 Loading real MIDI file:', midiPath);
          const response = await fetch(midiPath);
          if (!response.ok) {
            throw new Error(`Failed to load MIDI file: ${response.status}`);
          }
          const arrayBuffer = await response.arrayBuffer();
          midiData = new Uint8Array(arrayBuffer);
          console.log('✅ Real MIDI loaded:', { size: midiData.length, songId: context.songId });
        }
      } catch (error) {
        console.error('❌ Failed to load real MIDI, falling back to mock:', error);
        const { createMockMidiData } = await import('../../utils/mock-midi');
        midiData = createMockMidiData();
      }

      // Cache the data immediately
      const { openDB } = await import('idb');
      const db = await openDB('karaoke-cache', 1, {
        upgrade(db) {
          if (!db.objectStoreNames.contains('midi-cache')) {
            db.createObjectStore('midi-cache');
          }
        },
      });

      const cacheKey = `midi-song-${context.songId}-v4`;
      await db.put('midi-cache', {
        midiData: midiData,
        audioUrl,
        lyricsUrl,
        timestamp: Date.now(),
      }, cacheKey);
      
      console.log('✅ Content cached automatically after unlock');

      return { 
        tokenId: unlockHash,
        midiData: midiData,
        audioUrl,
        lyricsUrl
      };
    } catch (error: any) {
      console.error('❌ Unlock error:', error);
      
      if (error.message?.includes('User rejected')) {
        throw new Error('Transaction cancelled');
      } else if (error.message?.includes('insufficient credits')) {
        throw new Error('Not enough credits');
      } else {
        throw new Error(error.message || 'Unlock failed');
      }
    }
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
    console.log('🔍 checkCache called for song:', context.songId);
    
    try {
      const db = await openDB('karaoke-cache', 1, {
        upgrade(db) {
          if (!db.objectStoreNames.contains(MIDI_CACHE_STORE)) {
            db.createObjectStore(MIDI_CACHE_STORE);
          }
        },
      });
      
      const cacheKey = `midi-song-${context.songId}-v4`; // Bumped version to force re-download
      const cachedData = await db.get(MIDI_CACHE_STORE, cacheKey);
      console.log('📦 Cached data found:', !!cachedData);
      
      if (cachedData && cachedData.midiData) {
        console.log('✅ Returning cached MIDI data', {
          hasMidiData: !!cachedData.midiData,
          hasAudioUrl: !!cachedData.audioUrl,
          hasLyricsUrl: !!cachedData.lyricsUrl
        });
        return {
          midiData: cachedData.midiData,
          audioUrl: cachedData.audioUrl || '',  // Ensure audioUrl is not undefined
          lyricsUrl: cachedData.lyricsUrl || '',
        };
      }

      // If not cached, get encrypted CID from database
      const dbService = new DatabaseService();
      const songData = await dbService.getSongById(context.songId);
      
      if (!songData) {
        throw new Error('Song not found');
      }
      
      // For now, return mock encrypted CID since the field doesn't exist yet
      const encryptedCid = `encrypted-${context.songId}`;
      console.log('📄 Returning encrypted CID:', encryptedCid);
      
      return {
        encryptedCid: encryptedCid,
      };
    } catch (error) {
      console.error('❌ checkCache error:', error);
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
      
      // Get audio and lyrics URLs from database
      const dbService = new DatabaseService();
      const songData = await dbService.getSongById(context.songId);

      if (!songData) {
        throw new Error('Song not found');
      }

      const audioUrl = songData.stems?.vocals || '';
      const lyricsUrl = `https://lrclib.net/api/get?track_name=${encodeURIComponent(songData.title)}&artist_name=${encodeURIComponent(songData.artist)}&duration=${songData.duration}`;

      // Load real MIDI data based on song ID
      let midiData: Uint8Array;
      
      try {
        // Map song IDs to MIDI files
        const midiFiles: { [key: number]: string } = {
          1: '/test-data/midi/demo-song-1/lorde-royals-piano.mid',
          2: '/test-data/midi/demo-song-1/abba-dancing-queen-piano.mid'
        };
        
        const midiPath = midiFiles[context.songId];
        if (!midiPath) {
          console.log('🎵 No MIDI file found for song ID, using mock data');
          const { createMockMidiData } = await import('../../utils/mock-midi');
          midiData = createMockMidiData();
        } else {
          console.log('🎵 Loading real MIDI file:', midiPath);
          const response = await fetch(midiPath);
          if (!response.ok) {
            throw new Error(`Failed to load MIDI file: ${response.status}`);
          }
          const arrayBuffer = await response.arrayBuffer();
          midiData = new Uint8Array(arrayBuffer);
          console.log('✅ Real MIDI loaded:', { size: midiData.length, songId: context.songId });
        }
      } catch (error) {
        console.error('❌ Failed to load real MIDI, falling back to mock:', error);
        const { createMockMidiData } = await import('../../utils/mock-midi');
        midiData = createMockMidiData();
      }

      console.log('✅ MIDI decryption successful:', {
        midiSize: midiData.length,
        audioUrl,
        lyricsUrl
      });

      // Cache the MIDI data immediately
      const db = await openDB('karaoke-cache', 1, {
        upgrade(db) {
          if (!db.objectStoreNames.contains(MIDI_CACHE_STORE)) {
            db.createObjectStore(MIDI_CACHE_STORE);
          }
        },
      });

      const cacheKey = `midi-song-${context.songId}-v4`; // Bump version to force refresh with real MIDI
      await db.put(MIDI_CACHE_STORE, {
        midiData: midiData,
        audioUrl,
        lyricsUrl,
        timestamp: Date.now(),
      }, cacheKey);
      
      console.log('💾 MIDI data cached with key:', cacheKey);

      return {
        midiData: midiData,
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

    const cacheKey = `midi-song-${context.songId}-v4`; // Match version with checkCache
    await db.put(MIDI_CACHE_STORE, {
      midiData: context.midiData,
      audioUrl: context.audioUrl,
      lyricsUrl: context.lyricsUrl,
      timestamp: Date.now(),
    }, cacheKey);
  }),
};