import * as Tone from 'tone';
import type { Instrument, InstrumentType, NoteEvent } from '../../types/midi.types';

/**
 * Base class for all instruments
 * Provides common functionality and ensures consistent interface
 */
export abstract class BaseInstrument implements Instrument {
  abstract type: InstrumentType;
  protected _volume: number = -6;
  protected isInitialized: boolean = false;
  
  abstract initialize(): Promise<void>;
  abstract playNote(note: NoteEvent, when: number): void;
  abstract stop(): void;
  abstract dispose(): void;
  abstract connect(destination: Tone.ToneAudioNode): void;
  
  get volume(): number {
    return this._volume;
  }
  
  setVolume(volume: number): void {
    this._volume = volume;
    this.applyVolume();
  }
  
  protected abstract applyVolume(): void;
  
  protected ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error(`${this.type} instrument not initialized. Call initialize() first.`);
    }
  }
}