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
  lyrics?: any[]; // LyricLine[]
  voiceCredits?: number;
  creditsNeeded?: number;
  sessionId?: string;
  pkpSignature?: string;
  songDuration?: number; // Duration in seconds
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
  | { type: 'CONFIRM_CREDITS' }
  | { type: 'CANCEL_KARAOKE' }
  | { type: 'PURCHASE_VOICE_CREDITS' }
  | { type: 'PURCHASE_COMBO_PACK' }
  | { type: 'PURCHASE_BUNDLED' }
  | { type: 'PURCHASE_SUCCESS'; txHash: string }
  | { type: 'PURCHASE_ERROR'; error: string }
  | { type: 'COUNTDOWN_COMPLETE' }
  | { type: 'COMPLETE' }
  | { type: 'EXIT' }
  | { type: 'PRACTICE' }
  | { type: 'CANCEL' }
  | { type: 'RETRY' }
  | { type: 'UPDATE_ADDRESS'; address: string }
  | { type: 'ERROR'; error: string }
  | { type: 'PORTO_DETECTED'; isPorto: boolean }
  | { type: 'END_KARAOKE' }
  | { type: 'END_SESSION' };

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

// Tableland state machine types
export interface TablelandContext {
  userAddress: string;
  tableInfo?: UserTableInfo;
  pendingOperations: TablelandOperation[];
  retryCount: number;
  error?: string;
  sessionData?: KaraokeSessionData;
  exerciseData?: ExerciseSessionData;
}

export interface UserTableInfo {
  userAddress: string;
  karaokeSessionsTable: string;
  karaokeLinesTable: string;
  exerciseSessionsTable: string;
  chainId: number;
  createdAt: string;
}

export interface TablelandOperation {
  type: 'session' | 'line' | 'exercise';
  statement: string;
  bindings: any[];
}

export interface KaraokeSessionData {
  sessionId: string;
  songId: number;
  songTitle: string;
  artistName: string;
  totalScore: number;
  startedAt: number;
  completedAt: number;
  lines: KaraokeLineData[];
}

export interface KaraokeLineData {
  songId: number;
  lineIndex: number;
  expectedText: string;
  accuracy: number;
  wasCorrect: boolean;
}

export interface ExerciseSessionData {
  sessionId: string;
  cardsReviewed: number;
  cardsCorrect: number;
}

export type TablelandEvent =
  | { type: 'SAVE_SESSION'; data: KaraokeSessionData }
  | { type: 'SAVE_EXERCISE'; data: ExerciseSessionData }
  | { type: 'RETRY' }
  | { type: 'RESET' };