import * as Tone from 'tone';

export class PianoSampler {
  private sampler: Tone.Sampler | null = null;
  private isLoaded = false;
  private loadingPromise: Promise<void> | null = null;

  async initialize(): Promise<void> {
    if (this.loadingPromise) {
      return this.loadingPromise;
    }

    if (this.isLoaded) {
      return;
    }

    this.loadingPromise = this.load();
    return this.loadingPromise;
  }

  private async load(): Promise<void> {
    try {
      console.log('🎹 Loading piano samples...');
      
      // Using Salamander Grand Piano samples hosted on Tone.js CDN
      // We'll load a subset of samples for faster loading
      const baseUrl = 'https://tonejs.github.io/audio/salamander/';
      
      this.sampler = new Tone.Sampler({
        urls: {
          'A0': 'A0.mp3',
          'C1': 'C1.mp3',
          'D#1': 'Ds1.mp3',
          'F#1': 'Fs1.mp3',
          'A1': 'A1.mp3',
          'C2': 'C2.mp3',
          'D#2': 'Ds2.mp3',
          'F#2': 'Fs2.mp3',
          'A2': 'A2.mp3',
          'C3': 'C3.mp3',
          'D#3': 'Ds3.mp3',
          'F#3': 'Fs3.mp3',
          'A3': 'A3.mp3',
          'C4': 'C4.mp3',
          'D#4': 'Ds4.mp3',
          'F#4': 'Fs4.mp3',
          'A4': 'A4.mp3',
          'C5': 'C5.mp3',
          'D#5': 'Ds5.mp3',
          'F#5': 'Fs5.mp3',
          'A5': 'A5.mp3',
          'C6': 'C6.mp3',
          'D#6': 'Ds6.mp3',
          'F#6': 'Fs6.mp3',
          'A6': 'A6.mp3',
          'C7': 'C7.mp3',
          'D#7': 'Ds7.mp3',
          'F#7': 'Fs7.mp3',
          'A7': 'A7.mp3',
          'C8': 'C8.mp3'
        },
        baseUrl: baseUrl,
        release: 1,
        attack: 0.02,
        onload: () => {
          console.log('🎹 Piano samples loaded successfully');
          this.isLoaded = true;
        }
      }).toDestination();

      // Set volume
      this.sampler.volume.value = -10;
      
      // Wait for samples to load
      await Tone.loaded();
      
    } catch (error) {
      console.error('🎹 Failed to load piano samples:', error);
      this.isLoaded = false;
      throw error;
    }
  }

  playNote(
    note: string,
    duration: string | number,
    time: number,
    velocity: number = 0.8
  ): void {
    if (!this.sampler || !this.isLoaded) {
      console.error('🎹 Piano sampler not loaded');
      return;
    }

    // Only log first few notes to avoid spam
    if (this.sampler.context.currentTime < 5) {
      console.log(`🎹 Playing note: ${note} at time: ${time}`);
    }
    
    // Schedule the note
    this.sampler.triggerAttackRelease(note, duration, time, velocity);
  }

  dispose(): void {
    if (this.sampler) {
      this.sampler.dispose();
      this.sampler = null;
    }
    this.isLoaded = false;
    this.loadingPromise = null;
  }

  get loaded(): boolean {
    return this.isLoaded;
  }
}

export const pianoSampler = new PianoSampler();