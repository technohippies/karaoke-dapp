import * as Tone from 'tone';
import { Piano } from '@tonejs/piano';
import { BaseInstrument } from './base-instrument';
import type { InstrumentType, NoteEvent } from '../../types/midi.types';

/**
 * Piano instrument implementation using @tonejs/piano
 * High-quality multi-sampled piano sounds
 */
export class PianoInstrument extends BaseInstrument {
  type: InstrumentType = 'piano';
  private piano: Piano | null = null;
  
  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    try {
      await Tone.start();

      // Create and load the piano instrument
      this.piano = new Piano();
      await this.piano.load();

      // Connect to output and apply initial volume
      this.piano.toDestination();
      this.applyVolume();
      
      this.isInitialized = true;
    } catch (error) {
      console.error('❌ Failed to initialize piano:', error);
      throw error;
    }
  }
  
  playNote(note: NoteEvent, when: number): void {
    this.ensureInitialized();
    if (!this.piano) return;
    
    try {
      // Scale velocity for more dynamic range
      const scaledVelocity = Math.max(0, Math.min(1, note.velocity * 0.8));
      
      // Use the piano's keyDown/keyUp methods for note playback
      this.piano.keyDown({
        note: note.note,
        time: when,
        velocity: scaledVelocity
      });
      
      // Schedule the note off event
      this.piano.keyUp({
        note: note.note,
        time: when + note.duration,
        velocity: 0
      });
    } catch (error) {
      // Log error but don't throw to prevent playback interruption
      console.error(`Failed to play note ${note.note}:`, error);
    }
  }
  
  stop(): void {
    if (this.piano) {
      // Stop all currently playing notes
      this.piano.stopAll();
    }
  }
  
  dispose(): void {
    if (this.piano) {
      this.piano.dispose();
      this.piano = null;
    }
    this.isInitialized = false;
  }
  
  connect(destination: Tone.ToneAudioNode): void {
    this.ensureInitialized();
    if (this.piano) {
      this.piano.connect(destination);
    }
  }
  
  protected applyVolume(): void {
    if (this.piano) {
      // Adjust all component volumes based on the main volume
      const volumeDB = this._volume;
      this.piano.strings.value = volumeDB;
      this.piano.harmonics.value = volumeDB - 6; // Slightly quieter harmonics
      this.piano.keybed.value = volumeDB - 12; // Quieter keybed clicks
      this.piano.pedal.value = volumeDB - 8; // Quieter pedal sounds
    }
  }
  
  /**
   * Piano-specific methods for future enhancements
   */
  
  /**
   * Set pedal (sustain) - for future implementation
   */
  setSustainPedal(_on: boolean): void {
    // TODO: Implement sustain pedal logic using @tonejs/piano pedal methods
  }
  
  /**
   * Adjust piano brightness/tone by modifying harmonics volume
   * @param value - Brightness level (0-1)
   */
  setBrightness(value: number): void {
    if (this.piano) {
      // Adjust harmonics volume for brightness effect
      // Higher harmonics = brighter sound
      const harmonicsBoost = value * 6; // 0-6dB boost for harmonics
      this.piano.harmonics.value = this._volume - 6 + harmonicsBoost;
    }
  }
}