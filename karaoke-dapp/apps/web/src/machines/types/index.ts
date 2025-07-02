import type { SessionSigsMap } from '@lit-protocol/types';

export interface SongContext {
  songId: number;
  userAddress?: string;
  tokenId?: string;
  encryptedCid?: string;
  midiData?: Uint8Array;
  audioUrl?: string;
  lyricsUrl?: string;
  sessionSigs?: SessionSigsMap;
  credits?: number;
  error?: string;
  lastKaraokeScore?: number;
}

export interface KaraokeContext {
  songId: number;
  songTitle?: string;
  artistName?: string;
  userAddress?: string;
  midiData: Uint8Array;
  audioUrl?: string;
  lyricsUrl?: string;
  sessionSigs?: SessionSigsMap;
  audioBuffer?: AudioBuffer;
  lyrics?: LyricLine[];
  currentLineIndex: number;
  score: number;
  startTime?: number;
  recordingData?: Blob;
  sessionId?: string;
  error?: string;
  countdown?: number;
}

export interface LyricLine {
  timestamp: number;
  text: string;
  duration: number;
}

export type SongEvent =
  | { type: 'CHECK_ACCESS' }
  | { type: 'PURCHASE' }
  | { type: 'UNLOCK' }
  | { type: 'DOWNLOAD' }
  | { type: 'START_KARAOKE' }
  | { type: 'COUNTDOWN_COMPLETE' }
  | { type: 'COMPLETE' }
  | { type: 'EXIT' }
  | { type: 'PRACTICE' }
  | { type: 'CANCEL' }
  | { type: 'RETRY' }
  | { type: 'UPDATE_ADDRESS'; address: string }
  | { type: 'ERROR'; error: string };

export type KaraokeEvent =
  | { type: 'UPDATE_COUNTDOWN'; value: number }
  | { type: 'LOAD_AUDIO'; url: string }
  | { type: 'PLAY' }
  | { type: 'STOP' }
  | { type: 'COMPLETE' }
  | { type: 'NEXT_LINE' }
  | { type: 'SUBMIT_SCORE' }
  | { type: 'RESTART' }
  | { type: 'ERROR'; error: string };