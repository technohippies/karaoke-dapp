import * as Tone from 'tone';
import { Midi } from '@tonejs/midi';
import { InstrumentFactory } from './instruments';
import type {
  MidiPlayer,
  MidiPlayerOptions,
  MidiPlayerState,
  ParsedMidiData,
  Instrument,
  InstrumentType,
  NoteEvent,
  TrackConfig,
} from '../types/midi.types';

/**
 * MIDI Player Service
 * 
 * Handles MIDI file parsing, scheduling, and playback with multiple instruments.
 * Uses setTimeout-based scheduling for accurate timing instead of Tone.Transport.
 * 
 * Features:
 * - Multi-track MIDI playback
 * - Dynamic instrument loading
 * - Play/pause/stop/seek controls
 * - Volume control per track
 * - Solo/mute functionality
 * 
 * @example
 * const player = new MidiPlayerService();
 * await player.load(midiData);
 * await player.play();
 */
export class MidiPlayerService implements MidiPlayer {
  private midi: Midi | null = null;
  private instruments: Map<InstrumentType, Instrument> = new Map();
  private trackConfigs: Map<number, TrackConfig> = new Map();
  private state: MidiPlayerState = {
    isPlaying: false,
    isPaused: false,
    isLoading: false,
    currentTime: 0,
    duration: 0,
    tempo: 120,
  };
  
  private scheduledEvents: number[] = []; // Timeout IDs
  private options: MidiPlayerOptions;
  private updateTimer: number | null = null;
  private startTime: number = 0;
  private pausedAt: number = 0;
  
  constructor(options: MidiPlayerOptions = {}) {
    this.options = {
      volume: options.volume ?? -6,
      loop: options.loop ?? false,
      instruments: options.instruments ?? {},
      onTimeUpdate: options.onTimeUpdate,
      onEnd: options.onEnd,
      onError: options.onError,
    };
  }
  
  async load(midiData: Uint8Array): Promise<ParsedMidiData> {
    try {
      this.state.isLoading = true;
      
      // Validate input
      if (!midiData || midiData.length === 0) {
        throw new Error('Invalid MIDI data: empty or null');
      }
      
      // Parse MIDI data
      this.midi = new Midi(midiData);
      
      
      // Extract metadata
      const parsedData: ParsedMidiData = {
        name: this.midi.name || 'Untitled',
        duration: this.midi.duration,
        tempo: this.midi.header.tempos[0]?.bpm || 120,
        timeSignature: {
          numerator: this.midi.header.timeSignatures[0]?.timeSignature?.[0] || 4,
          denominator: this.midi.header.timeSignatures[0]?.timeSignature?.[1] || 4,
        },
        tracks: this.midi.tracks.map((track, index) => ({
          name: track.name || `Track ${index + 1}`,
          channel: track.channel ?? index,
          instrument: this.guessInstrumentType(track.name, track.channel),
          noteCount: track.notes.length,
          duration: track.duration,
        })),
        raw: this.midi,
      };
      
      // Update state
      this.state.duration = parsedData.duration;
      this.state.tempo = parsedData.tempo;
      
      // Initialize instruments for tracks
      await this.initializeInstruments(parsedData);
      
      // Schedule all notes
      this.scheduleNotes();
      
      this.state.isLoading = false;
      return parsedData;
      
    } catch (error) {
      this.state.isLoading = false;
      const err = error instanceof Error ? error : new Error('Failed to load MIDI');
      this.options.onError?.(err);
      throw err;
    }
  }
  
  /**
   * Start or resume playback
   * @throws {Error} If no MIDI is loaded
   */
  async play(): Promise<void> {
    if (!this.midi) {
      throw new Error('No MIDI loaded');
    }
    
    // Start audio context if needed
    if (Tone.context.state === 'suspended') {
      await Tone.start();
    }
    
    // Clear any existing scheduled events
    this.clearScheduledEvents();
    
    // Calculate start offset
    let startOffset = 0;
    if (this.state.isPaused) {
      startOffset = this.pausedAt;
    } else {
      startOffset = this.state.currentTime * 1000; // Convert to ms
    }
    
    
    this.startTime = Date.now() - startOffset;
    
    // Schedule all notes using setTimeout
    this.scheduleNotesWithTimeout(startOffset);
    
    this.state.isPlaying = true;
    this.state.isPaused = false;
    this.startUpdateTimer();
  }
  
  /**
   * Pause playback (can be resumed)
   */
  pause(): void {
    if (!this.state.isPlaying) return;
    
    this.pausedAt = Date.now() - this.startTime;
    this.clearScheduledEvents();
    
    this.state.isPlaying = false;
    this.state.isPaused = true;
    this.stopUpdateTimer();
  }
  
  /**
   * Stop playback and reset to beginning
   */
  stop(): void {
    this.clearScheduledEvents();
    
    // Stop all instruments
    this.instruments.forEach(instrument => instrument.stop());
    
    this.state.isPlaying = false;
    this.state.isPaused = false;
    this.state.currentTime = 0;
    this.pausedAt = 0;
    this.stopUpdateTimer();
    
    this.options.onTimeUpdate?.(0);
  }
  
  /**
   * Seek to a specific time in seconds
   * @param time - Time in seconds
   */
  seek(time: number): void {
    const wasPlaying = this.state.isPlaying;
    
    if (wasPlaying) {
      this.pause();
    }
    
    this.state.currentTime = Math.max(0, Math.min(time, this.state.duration));
    
    if (wasPlaying) {
      this.play();
    }
    
    this.options.onTimeUpdate?.(this.state.currentTime);
  }
  
  /**
   * Set master volume in decibels
   * @param volume - Volume in dB (typically -60 to 0)
   */
  setVolume(volume: number): void {
    this.options.volume = volume;
    this.instruments.forEach(instrument => {
      instrument.setVolume(volume);
    });
  }
  
  /**
   * Configure individual track settings
   * @param trackIndex - Track index
   * @param config - Partial track configuration
   */
  setTrackConfig(trackIndex: number, config: Partial<TrackConfig>): void {
    const currentConfig = this.trackConfigs.get(trackIndex) || {
      enabled: true,
      volume: 0,
      instrument: 'piano' as InstrumentType,
      muted: false,
      solo: false,
    };
    
    this.trackConfigs.set(trackIndex, { ...currentConfig, ...config });
    
    // Re-schedule notes if needed
    if (this.midi) {
      // Don't reschedule during playback
      if (this.state.isPlaying) {
        console.warn('Cannot change track config during playback');
      }
    }
  }
  
  /**
   * Get current player state
   * @returns Copy of the current state
   */
  getState(): MidiPlayerState {
    return { ...this.state };
  }
  
  /**
   * Clean up resources
   */
  dispose(): void {
    this.stop();
    this.clearScheduledEvents();
    
    // Dispose all instruments
    this.instruments.forEach(instrument => instrument.dispose());
    this.instruments.clear();
    
    this.midi = null;
    this.trackConfigs.clear();
  }
  
  private async initializeInstruments(parsedData: ParsedMidiData): Promise<void> {
    // Get unique instrument types needed
    const neededInstruments = new Set<InstrumentType>(
      parsedData.tracks.map(track => track.instrument)
    );
    
    // Create and initialize instruments
    for (const type of neededInstruments) {
      if (!this.instruments.has(type)) {
        const instrument = this.options.instruments?.[type] || InstrumentFactory.create(type);
        await instrument.initialize();
        instrument.setVolume(this.options.volume || -6);
        instrument.connect(Tone.Destination);
        this.instruments.set(type, instrument);
      }
    }
  }
  
  private scheduleNotes(): void {
    // This method is called during load to prepare the data
    // Actual scheduling happens in scheduleNotesWithTimeout
    if (!this.midi) return;
  }
  
  private scheduleNotesWithTimeout(startOffset: number): void {
    if (!this.midi) return;
    
    
    this.midi.tracks.forEach((track, trackIndex) => {
      const config = this.trackConfigs.get(trackIndex);
      
      // Skip if track is disabled or muted
      if (config && (!config.enabled || config.muted)) {
        return;
      }
      
      // Check if any track is soloed
      const hasSoloTrack = Array.from(this.trackConfigs.values()).some(c => c.solo);
      if (hasSoloTrack && (!config || !config.solo)) {
        return;
      }
      
      const instrumentType = this.guessInstrumentType(track.name, track.channel);
      const instrument = this.instruments.get(instrumentType);
      
      if (!instrument) {
        console.warn(`No instrument found for type: ${instrumentType}`);
        return;
      }
      
      
      // Schedule each note with setTimeout
      track.notes.forEach(note => {
        const noteTimeMs = note.time * 1000;
        
        // Only schedule notes that haven't been played yet
        if (noteTimeMs >= startOffset) {
          const delay = noteTimeMs - startOffset;
          
          const timeoutId = setTimeout(() => {
            if (this.state.isPlaying) {
              const noteEvent: NoteEvent = {
                note: note.name,
                midi: note.midi,
                time: note.time,
                duration: note.duration,
                velocity: note.velocity * (config?.volume ?? 1),
                channel: track.channel ?? 0,
              };
              
              // Play the note immediately (we're already at the right time)
              instrument.playNote(noteEvent, Tone.now());
            }
          }, delay) as unknown as number;
          
          this.scheduledEvents.push(timeoutId);
        }
      });
    });
    
  }
  
  private clearScheduledEvents(): void {
    // Clear all setTimeout events
    this.scheduledEvents.forEach(timeoutId => {
      clearTimeout(timeoutId);
    });
    this.scheduledEvents = [];
  }
  
  private guessInstrumentType(trackName: string, _channel: number): InstrumentType {
    const name = trackName.toLowerCase();
    
    // Try to guess from track name
    if (name.includes('piano') || name.includes('keyboard')) return 'piano';
    if (name.includes('bass')) return 'bass';
    if (name.includes('drum') || name.includes('percussion')) return 'drums';
    if (name.includes('guitar')) return 'guitar';
    if (name.includes('string') || name.includes('violin')) return 'strings';
    
    // Default to piano for now (channel 0 is typically piano)
    return 'piano';
  }
  
  private startUpdateTimer(): void {
    if (this.updateTimer) return;
    
    const update = () => {
      if (this.state.isPlaying) {
        this.state.currentTime = (Date.now() - this.startTime) / 1000;
        this.options.onTimeUpdate?.(this.state.currentTime);
        
        // Check if reached end
        if (this.state.currentTime >= this.state.duration) {
          if (!this.options.loop) {
            this.stop();
            this.options.onEnd?.();
            return;
          }
        }
        
        this.updateTimer = requestAnimationFrame(update);
      }
    };
    
    this.updateTimer = requestAnimationFrame(update);
  }
  
  private stopUpdateTimer(): void {
    if (this.updateTimer) {
      cancelAnimationFrame(this.updateTimer);
      this.updateTimer = null;
    }
  }
}