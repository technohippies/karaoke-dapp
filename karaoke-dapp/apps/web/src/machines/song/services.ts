import { fromPromise } from 'xstate';
import { readContract } from 'wagmi/actions';
import { wagmiConfig } from '../../wagmi';
import { MusicStoreV2ABI } from '@karaoke-dapp/contracts';
import { EncryptionService, DatabaseService } from '@karaoke-dapp/services/browser';
import { openDB } from 'idb';
import type { SongContext } from '../types';
import type { SessionSigsMap } from '@lit-protocol/types';

const MUSIC_STORE_ADDRESS = '0x306466a909df4dc0508b68b4511bcf8130abcb43';
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

    // This would be implemented with wagmi's writeContract
    // For now, returning mock data
    throw new Error('Purchase implementation needed');
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