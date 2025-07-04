import { fromPromise } from 'xstate';
import { readContract, writeContract, waitForTransactionReceipt } from 'wagmi/actions';
import { wagmiConfig } from '../../wagmi';
import { MusicStoreV2ABI, CONTRACTS } from '@karaoke-dapp/contracts';
import { EncryptionService, DatabaseService, LIT_ACTION_CIDS, PKP_CONFIG } from '@karaoke-dapp/services/browser';
import { openDB } from 'idb';
import type { SongContext } from '../types';
import type { SessionSigsMap } from '@lit-protocol/types';
import { karaokeMachine } from '../karaoke/karaokeMachine';
import { karaokeServices } from '../karaoke/services';
import { karaokeActions, karaokeGuards } from '../karaoke/actions';
import { parseLRC, calculateCreditsNeeded } from '../../utils/lyrics-parser';
import { purchaseAndUnlockWithPermit as purchaseAndUnlockWithPermitService } from './permit-purchase.service';

const MUSIC_STORE_ADDRESS = CONTRACTS.baseSepolia.musicStore;
const SESSION_STORAGE_KEY = 'lit-session-sigs';
const MIDI_CACHE_STORE = 'midi-cache';

export const songServices = {
  // New permit-based purchase (reduces 3 tx to 2)
  purchaseAndUnlockWithPermit: fromPromise(purchaseAndUnlockWithPermitService),
  
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

    // First check if user is new to determine which pack they'll buy
    const credits = await readContract(wagmiConfig, {
      address: MUSIC_STORE_ADDRESS,
      abi: MusicStoreV2ABI,
      functionName: 'getCredits',
      args: [context.userAddress as `0x${string}`],
    });
    
    const voiceCredits = await readContract(wagmiConfig, {
      address: MUSIC_STORE_ADDRESS,
      abi: MusicStoreV2ABI,
      functionName: 'getVoiceCredits',
      args: [context.userAddress as `0x${string}`],
    });
    
    // Check if user has any songs
    let hasAnyAccess = false;
    for (let i = 1; i <= 5; i++) {
      try {
        const access = await readContract(wagmiConfig, {
          address: MUSIC_STORE_ADDRESS,
          abi: MusicStoreV2ABI,
          functionName: 'checkAccess',
          args: [context.userAddress as `0x${string}`, BigInt(i)],
        });
        if (access) {
          hasAnyAccess = true;
          break;
        }
      } catch {
        // Ignore errors
      }
    }
    
    const isNewUser = credits === 0n && voiceCredits === 0n && !hasAnyAccess;
    
    // Get the appropriate pack price
    const packPrice = isNewUser 
      ? await readContract(wagmiConfig, {
          address: MUSIC_STORE_ADDRESS,
          abi: MusicStoreV2ABI,
          functionName: 'getComboPackPrice',
        })
      : await readContract(wagmiConfig, {
          address: MUSIC_STORE_ADDRESS,
          abi: MusicStoreV2ABI,
          functionName: 'SONG_PACK_PRICE',
        });

    console.log(`${isNewUser ? 'Combo' : 'Song'} pack price (USDC wei):`, packPrice);
    
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
      console.log(`Approving USDC spending for ${isNewUser ? 'combo' : 'song'} pack...`);
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

      // If no credits, check if this is a new user
      if (credits === 0n) {
        console.log('No credits, checking if new user...');
        
        // Check if user has any voice credits to determine if they're new
        const voiceCredits = await readContract(wagmiConfig, {
          address: MUSIC_STORE_ADDRESS,
          abi: MusicStoreV2ABI,
          functionName: 'getVoiceCredits',
          args: [context.userAddress as `0x${string}`],
        });
        
        // Check if user has access to any songs
        let hasAnyAccess = false;
        for (let i = 1; i <= 5; i++) {
          try {
            const access = await readContract(wagmiConfig, {
              address: MUSIC_STORE_ADDRESS,
              abi: MusicStoreV2ABI,
              functionName: 'checkAccess',
              args: [context.userAddress as `0x${string}`, BigInt(i)],
            });
            if (access) {
              hasAnyAccess = true;
              break;
            }
          } catch {
            // Ignore errors for non-existent songs
          }
        }
        
        const isNewUser = voiceCredits === 0n && !hasAnyAccess;
        console.log(`User status: ${isNewUser ? 'NEW' : 'EXISTING'} (voice credits: ${voiceCredits}, has songs: ${hasAnyAccess})`);

        // Buy appropriate pack based on user status
        const functionName = isNewUser ? 'buyCombopack' : 'buyCreditPack';
        const packType = isNewUser ? 'combo pack' : 'credit pack';
        
        console.log(`Buying ${packType}...`);
        
        // TODO: When Porto supports sendCalls, we can bundle:
        // 1. USDC permit (gasless approval)
        // 2. Buy pack (combo or song)
        // 3. Unlock song
        // All in one user signature!
        
        const hash = await writeContract(wagmiConfig, {
          address: MUSIC_STORE_ADDRESS,
          abi: MusicStoreV2ABI,
          functionName,
          // No value field - payment is in USDC
        });

        console.log(`${packType} purchase tx:`, hash);

        // Wait for confirmation
        const receipt = await waitForTransactionReceipt(wagmiConfig, {
          hash,
          confirmations: 1,
        });

        if (receipt.status !== 'success') {
          throw new Error(`${packType} purchase failed`);
        }

        console.log(`${packType} purchased successfully`);
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

  // Add karaokeMachine as an actor with its services and actions
  karaokeMachine: karaokeMachine.provide({
    actors: karaokeServices,
    actions: karaokeActions,
    guards: karaokeGuards,
  }),

  // Check voice credits and calculate needed credits
  checkVoiceCredits: fromPromise(async ({ input }: { input: SongContext & { lyrics?: any[], songDuration?: number } }) => {
    const context = input;
    if (!context.userAddress) {
      throw new Error('No user address');
    }

    console.log('💳 Checking voice credits for user:', context.userAddress);

    // Get user's voice credit balance
    const voiceCredits = await readContract(wagmiConfig, {
      address: MUSIC_STORE_ADDRESS,
      abi: MusicStoreV2ABI,
      functionName: 'getVoiceCredits',
      args: [context.userAddress as `0x${string}`],
    });

    console.log('💳 Voice credits balance:', voiceCredits.toString());

    // Calculate credits needed based on song duration
    let creditsNeeded = 1; // Default to 1 credit
    
    // First try to use songDuration if provided
    if (context.songDuration) {
      const { calculateCreditsFromDuration } = await import('../../utils/lyrics-parser');
      creditsNeeded = calculateCreditsFromDuration(context.songDuration);
      console.log(`⏱️ Duration-based calculation: ${context.songDuration}s = ${creditsNeeded} credits`);
    }
    // Fallback to lyrics-based calculation if we have lyrics
    else if (context.lyrics) {
      creditsNeeded = calculateCreditsNeeded(context.lyrics);
      console.log(`📝 Lyrics-based calculation: ${context.lyrics.length} lines, ${creditsNeeded} credits needed`);
    }
    // Last fallback: get song duration from database
    else {
      try {
        const dbService = new DatabaseService();
        const songData = await dbService.getSongById(context.songId);
        if (songData?.duration) {
          const { calculateCreditsFromDuration } = await import('../../utils/lyrics-parser');
          creditsNeeded = calculateCreditsFromDuration(songData.duration);
          console.log(`🗄️ DB duration-based calculation: ${songData.duration}s = ${creditsNeeded} credits`);
        }
      } catch (error) {
        console.warn('Failed to get song duration from database:', error);
      }
    }

    return {
      balance: Number(voiceCredits),
      creditsNeeded,
      hasEnoughCredits: Number(voiceCredits) >= creditsNeeded
    };
  }),

  // Pre-emptively deduct voice credits
  deductVoiceCredits: fromPromise(async ({ input }: { input: SongContext & { creditsNeeded: number; sessionId: string; pkpSignature: string } }) => {
    const context = input;
    if (!context.userAddress) {
      throw new Error('No user address');
    }

    console.log('💸 Deducting voice credits:', {
      user: context.userAddress,
      credits: context.creditsNeeded,
      sessionId: context.sessionId
    });

    // Convert session ID to bytes32 format
    const sessionIdBytes32 = '0x' + Buffer.from(context.sessionId).toString('hex').padEnd(64, '0').slice(0, 64);

    // Call smart contract to deduct credits
    const txHash = await writeContract(wagmiConfig, {
      address: MUSIC_STORE_ADDRESS,
      abi: MusicStoreV2ABI,
      functionName: 'settleVoiceSession',
      args: [
        context.userAddress as `0x${string}`,
        sessionIdBytes32 as `0x${string}`,
        BigInt(context.creditsNeeded),
        context.pkpSignature as `0x${string}`
      ],
    });

    console.log('💸 Voice credit deduction tx:', txHash);

    // Wait for confirmation
    const receipt = await waitForTransactionReceipt(wagmiConfig, {
      hash: txHash,
      confirmations: 1,
    });

    if (receipt.status !== 'success') {
      throw new Error('Voice credit deduction failed');
    }

    console.log('✅ Voice credits deducted successfully');
    return { success: true, txHash };
  }),

  // Generate PKP signature for voice credit deduction
  generateVoiceSessionSignature: fromPromise(async ({ input }: { input: SongContext & { creditsNeeded: number; sessionId: string } }) => {
    const context = input;
    if (!context.sessionSigs) {
      throw new Error('No session signatures available');
    }

    console.log('🔏 Generating PKP signature for voice session');

    const encryptionService = new EncryptionService();
    await encryptionService.connect();

    // Convert session ID to bytes32 format
    const sessionIdBytes32 = '0x' + Buffer.from(context.sessionId).toString('hex').padEnd(64, '0').slice(0, 64);

    console.log('🔐 Lit Action parameters:', {
      userId: context.userAddress,
      sessionId: sessionIdBytes32,
      creditsUsed: context.creditsNeeded,
      pkpPublicKey: PKP_CONFIG.publicKey,
      pkpPublicKeyLength: PKP_CONFIG.publicKey?.length,
      hasSessionSigs: !!context.sessionSigs
    });

    // Execute Lit Action to generate signature
    const result = await encryptionService.executeDeployedLitAction(
      LIT_ACTION_CIDS.sessionSettlement,
      {
        userId: context.userAddress, // Changed from userAddress to userId
        sessionId: sessionIdBytes32,
        creditsUsed: context.creditsNeeded,
        pkpPublicKey: PKP_CONFIG.publicKey // Added missing parameter
      },
      context.sessionSigs
    );

    console.log('📦 PKP signature result type:', typeof result);
    console.log('📦 PKP signature result:', result);
    
    // The result is already an object (not a JSON string)
    if (typeof result === 'string') {
      // If it's a string, parse it
      const parsed = JSON.parse(result);
      console.log('📦 Parsed result:', parsed);
      if (parsed.response?.success && parsed.signatures?.settlement?.signature) {
        console.log('✅ PKP signature generated from parsed string');
        return parsed.signatures.settlement.signature;
      }
    } else if (result.response?.success && result.signatures?.settlement?.signature) {
      // If it's already an object
      console.log('✅ PKP signature generated from object');
      return result.signatures.settlement.signature;
    }
    
    console.error('❌ Signature not found in result structure');
    console.error('Expected path: result.signatures.settlement.signature');
    console.error('Actual result:', JSON.stringify(result, null, 2));
    throw new Error('Failed to generate PKP signature');
  }),

  // Fetch lyrics for credit calculation
  fetchLyrics: fromPromise(async ({ input }: { input: SongContext & { lyricsUrl?: string } }) => {
    const context = input;
    if (!context.lyricsUrl) {
      // If no lyrics URL, get from database
      const dbService = new DatabaseService();
      const songData = await dbService.getSongById(context.songId);
      if (!songData) {
        throw new Error('Song not found');
      }
      
      const lyricsUrl = `https://lrclib.net/api/get?track_name=${encodeURIComponent(songData.title)}&artist_name=${encodeURIComponent(songData.artist)}&duration=${songData.duration}`;
      const response = await fetch(lyricsUrl);
      if (!response.ok) {
        throw new Error('Failed to fetch lyrics');
      }
      
      const data = await response.json();
      if (!data.syncedLyrics) {
        throw new Error('No synced lyrics available');
      }
      
      return parseLRC(data.syncedLyrics);
    }

    // Fetch from provided URL
    const response = await fetch(context.lyricsUrl);
    if (!response.ok) {
      throw new Error('Failed to fetch lyrics');
    }
    
    const lrcContent = await response.text();
    return parseLRC(lrcContent);
  }),

  // Purchase voice credits with permit
  purchaseVoiceCredits: fromPromise(async ({ input }: { input: SongContext }) => {
    const context = input;
    if (!context.userAddress) {
      throw new Error('No user address');
    }

    console.log('💳 Purchasing voice credits with permit for user:', context.userAddress);

    try {
      // USDC permit ABI
      const USDC_PERMIT_ABI = [
        {
          name: 'nonces',
          type: 'function',
          inputs: [{ name: 'owner', type: 'address' }],
          outputs: [{ type: 'uint256' }],
          stateMutability: 'view'
        }
      ] as const;

      // Get nonce for permit
      const nonce = await readContract(wagmiConfig, {
        address: CONTRACTS.baseSepolia.usdc,
        abi: USDC_PERMIT_ABI,
        functionName: 'nonces',
        args: [context.userAddress as `0x${string}`],
      });
      
      // Set deadline to 5 minutes from now
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 300);
      
      // Create typed data for permit
      const domain = {
        name: 'USD Coin',
        version: '2',
        chainId: 84532, // Base Sepolia
        verifyingContract: CONTRACTS.baseSepolia.usdc as `0x${string}`,
      };
      
      const types = {
        Permit: [
          { name: 'owner', type: 'address' },
          { name: 'spender', type: 'address' },
          { name: 'value', type: 'uint256' },
          { name: 'nonce', type: 'uint256' },
          { name: 'deadline', type: 'uint256' },
        ],
      } as const;
      
      const message = {
        owner: context.userAddress as `0x${string}`,
        spender: MUSIC_STORE_ADDRESS as `0x${string}`,
        value: 1000000n, // $1 for voice pack
        nonce: nonce,
        deadline: deadline,
      };
      
      console.log('🖊️ Requesting permit signature for voice credits...');
      
      // Sign the permit
      const { signTypedData } = await import('@wagmi/core');
      const signature = await signTypedData(wagmiConfig, {
        domain,
        types,
        primaryType: 'Permit',
        message,
      });
      
      // Extract r, s, v from signature
      const sig = signature.slice(2);
      const r = `0x${sig.slice(0, 64)}` as `0x${string}`;
      const s = `0x${sig.slice(64, 128)}` as `0x${string}`;
      const v = parseInt(sig.slice(128, 130), 16);
      
      // Buy voice pack with permit
      const txHash = await writeContract(wagmiConfig, {
        address: MUSIC_STORE_ADDRESS,
        abi: MusicStoreV2ABI,
        functionName: 'buyVoicePackWithPermit',
        args: [deadline, v, r, s],
      });

      console.log('💳 Voice credit purchase tx:', txHash);

      // Wait for confirmation
      const receipt = await waitForTransactionReceipt(wagmiConfig, {
        hash: txHash,
        confirmations: 1,
      });

      if (receipt.status !== 'success') {
        throw new Error('Voice credit purchase failed');
      }

      console.log('✅ Voice credits purchased successfully with permit!');
      return { success: true, txHash };
    } catch (error) {
      console.error('Voice credit purchase error:', error);
      throw error;
    }
  }),

  // Purchase combo pack with permit (song credits + voice credits)
  purchaseComboPack: fromPromise(async ({ input }: { input: SongContext }) => {
    const context = input;
    if (!context.userAddress) {
      throw new Error('No user address');
    }

    console.log('💳 Purchasing combo pack with permit for user:', context.userAddress);

    try {
      // USDC permit ABI
      const USDC_PERMIT_ABI = [
        {
          name: 'nonces',
          type: 'function',
          inputs: [{ name: 'owner', type: 'address' }],
          outputs: [{ type: 'uint256' }],
          stateMutability: 'view'
        }
      ] as const;

      // Get nonce for permit
      const nonce = await readContract(wagmiConfig, {
        address: CONTRACTS.baseSepolia.usdc,
        abi: USDC_PERMIT_ABI,
        functionName: 'nonces',
        args: [context.userAddress as `0x${string}`],
      });
      
      // Set deadline to 5 minutes from now
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 300);
      
      // Create typed data for permit
      const domain = {
        name: 'USD Coin',
        version: '2',
        chainId: 84532, // Base Sepolia
        verifyingContract: CONTRACTS.baseSepolia.usdc as `0x${string}`,
      };
      
      const types = {
        Permit: [
          { name: 'owner', type: 'address' },
          { name: 'spender', type: 'address' },
          { name: 'value', type: 'uint256' },
          { name: 'nonce', type: 'uint256' },
          { name: 'deadline', type: 'uint256' },
        ],
      } as const;
      
      const message = {
        owner: context.userAddress as `0x${string}`,
        spender: MUSIC_STORE_ADDRESS as `0x${string}`,
        value: 3000000n, // $3 for combo pack
        nonce: nonce,
        deadline: deadline,
      };
      
      console.log('🖊️ Requesting permit signature for combo pack...');
      
      // Sign the permit
      const { signTypedData } = await import('@wagmi/core');
      const signature = await signTypedData(wagmiConfig, {
        domain,
        types,
        primaryType: 'Permit',
        message,
      });
      
      // Extract r, s, v from signature
      const sig = signature.slice(2);
      const r = `0x${sig.slice(0, 64)}` as `0x${string}`;
      const s = `0x${sig.slice(64, 128)}` as `0x${string}`;
      const v = parseInt(sig.slice(128, 130), 16);
      
      // Buy combo pack with permit
      const txHash = await writeContract(wagmiConfig, {
        address: MUSIC_STORE_ADDRESS,
        abi: MusicStoreV2ABI,
        functionName: 'buyComboPackWithPermit',
        args: [deadline, v, r, s],
      });

      console.log('💳 Combo pack purchase tx:', txHash);

      // Wait for confirmation
      const receipt = await waitForTransactionReceipt(wagmiConfig, {
        hash: txHash,
        confirmations: 1,
      });

      if (receipt.status !== 'success') {
        throw new Error('Combo pack purchase failed');
      }

      console.log('✅ Combo pack purchased successfully with permit!');
      return { success: true, txHash };
    } catch (error) {
      console.error('Combo pack purchase error:', error);
      throw error;
    }
  }),
};