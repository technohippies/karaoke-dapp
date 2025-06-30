import type { Midi } from '@tonejs/midi';
import type * as Tone from 'tone';

// Instrument types that can be extended later
export type InstrumentType = 'piano' | 'bass' | 'drums' | 'guitar' | 'strings';

// MIDI track information
export interface MidiTrackInfo {
  name: string;
  channel: number;
  instrument: InstrumentType;
  noteCount: number;
  duration: number;
}

// Parsed MIDI data structure
export interface ParsedMidiData {
  name: string;
  duration: number;
  tracks: MidiTrackInfo[];
  tempo: number;
  timeSignature: {
    numerator: number;
    denominator: number;
  };
  raw: Midi;
}

// Note event for scheduling
export interface NoteEvent {
  note: string;
  midi: number;
  time: number;
  duration: number;
  velocity: number;
  channel: number;
}

// Instrument interface for extensibility
export interface Instrument {
  type: InstrumentType;
  volume: number;
  initialize(): Promise<void>;
  playNote(note: NoteEvent, when: number): void;
  stop(): void;
  dispose(): void;
  setVolume(volume: number): void;
  connect(destination: Tone.ToneAudioNode): void;
}

// MIDI player state
export interface MidiPlayerState {
  isPlaying: boolean;
  isPaused: boolean;
  isLoading: boolean;
  currentTime: number;
  duration: number;
  tempo: number;
}

// MIDI player options
export interface MidiPlayerOptions {
  volume?: number;
  loop?: boolean;
  instruments?: Partial<Record<InstrumentType, Instrument>>;
  onTimeUpdate?: (time: number) => void;
  onEnd?: () => void;
  onError?: (error: Error) => void;
}

// Track configuration
export interface TrackConfig {
  enabled: boolean;
  volume: number;
  instrument: InstrumentType;
  muted: boolean;
  solo: boolean;
}

// MIDI player interface
export interface MidiPlayer {
  load(midiData: Uint8Array): Promise<ParsedMidiData>;
  play(): Promise<void>;
  pause(): void;
  stop(): void;
  seek(time: number): void;
  setVolume(volume: number): void;
  setTrackConfig(trackIndex: number, config: Partial<TrackConfig>): void;
  getState(): MidiPlayerState;
  dispose(): void;
}