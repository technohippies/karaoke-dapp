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
  error?: string;
}

export interface KaraokeContext {
  songId: number;
  midiData: Uint8Array;
  audioUrl?: string;
  lyricsUrl?: string;
  audioBuffer?: AudioBuffer;
  lyrics?: LyricLine[];
  currentLineIndex: number;
  score: number;
  startTime?: number;
  recordingData?: Blob;
  sessionId?: string;
  error?: string;
}

export interface LyricLine {
  timestamp: number;
  text: string;
  duration: number;
}

export type SongEvent =
  | { type: 'CHECK_ACCESS' }
  | { type: 'PURCHASE' }
  | { type: 'DOWNLOAD' }
  | { type: 'START_KARAOKE' }
  | { type: 'RETRY' }
  | { type: 'UPDATE_ADDRESS'; address: string }
  | { type: 'ERROR'; error: string };

export type KaraokeEvent =
  | { type: 'LOAD_AUDIO' }
  | { type: 'PLAY' }
  | { type: 'PAUSE' }
  | { type: 'STOP' }
  | { type: 'NEXT_LINE' }
  | { type: 'PREVIOUS_LINE' }
  | { type: 'START_RECORDING' }
  | { type: 'STOP_RECORDING' }
  | { type: 'SUBMIT_SCORE' }
  | { type: 'RESTART' }
  | { type: 'ERROR'; error: string };