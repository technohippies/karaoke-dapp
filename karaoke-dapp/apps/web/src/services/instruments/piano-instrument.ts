import * as Tone from 'tone';
import { BaseInstrument } from './base-instrument';
import type { InstrumentType, NoteEvent } from '../../types/midi.types';

/**
 * Piano instrument implementation using Tone.js PolySynth
 * Optimized for realistic piano sound with proper ADSR envelope
 */
export class PianoInstrument extends BaseInstrument {
  type: InstrumentType = 'piano';
  private synth: Tone.PolySynth | null = null;
  
  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    // Create a polyphonic synth with AMSynth voices for richer piano sound
    this.synth = new Tone.PolySynth({
      maxPolyphony: 88, // Full piano range
      voice: Tone.AMSynth,
      options: {
        harmonicity: 2.5,
        oscillator: {
          type: 'fatsine' as any,
        },
        envelope: {
          attack: 0.003,
          decay: 0.5,
          sustain: 0.2,
          release: 1.5,
        },
        modulation: {
          type: 'square',
        },
        modulationEnvelope: {
          attack: 0.002,
          decay: 0.2,
          sustain: 0,
          release: 0.2,
        },
      },
    });
    
    // Apply initial volume
    this.applyVolume();
    
    this.isInitialized = true;
  }
  
  playNote(note: NoteEvent, when: number): void {
    this.ensureInitialized();
    if (!this.synth) return;
    
    // Scale velocity for more dynamic range
    const scaledVelocity = note.velocity * 0.8;
    
    this.synth.triggerAttackRelease(
      note.note,
      note.duration,
      when,
      scaledVelocity
    );
  }
  
  stop(): void {
    if (this.synth) {
      this.synth.releaseAll();
    }
  }
  
  dispose(): void {
    if (this.synth) {
      this.synth.dispose();
      this.synth = null;
    }
    this.isInitialized = false;
  }
  
  connect(destination: Tone.ToneAudioNode): void {
    this.ensureInitialized();
    if (this.synth) {
      this.synth.connect(destination);
    }
  }
  
  protected applyVolume(): void {
    if (this.synth) {
      this.synth.volume.value = this._volume;
    }
  }
  
  /**
   * Piano-specific methods for future enhancements
   */
  
  // Set pedal (sustain) - for future implementation
  setSustainPedal(_on: boolean): void {
    // TODO: Implement sustain pedal logic
  }
  
  // Adjust piano brightness/tone
  setBrightness(value: number): void {
    if (this.synth) {
      // Adjust harmonicity for brightness
      // @ts-ignore - accessing voice options
      this.synth.voice.harmonicity.value = 2.5 + (value * 2);
    }
  }
}