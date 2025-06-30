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
 * Handles MIDI file parsing, scheduling, and playback with multiple instruments
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
  
  private transport = Tone.Transport;
  private pauseTime: number = 0;
  private scheduledEvents: Tone.ToneEvent[] = [];
  private options: MidiPlayerOptions;
  private updateTimer: number | null = null;
  
  constructor(options: MidiPlayerOptions = {}) {
    this.options = {
      volume: options.volume ?? -6,
      loop: options.loop ?? false,
      instruments: options.instruments ?? {},
      onTimeUpdate: options.onTimeUpdate,
      onEnd: options.onEnd,
      onError: options.onError,
    };
    
    // Initialize transport settings
    this.transport.loop = this.options.loop || false;
    this.transport.loopEnd = '1m'; // Will be updated when MIDI is loaded
  }
  
  async load(midiData: Uint8Array): Promise<ParsedMidiData> {
    try {
      this.state.isLoading = true;
      
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
      
      // Set transport tempo
      this.transport.bpm.value = parsedData.tempo;
      this.transport.loopEnd = `${parsedData.duration}s`;
      
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
  
  async play(): Promise<void> {
    if (!this.midi) {
      throw new Error('No MIDI loaded');
    }
    
    console.log('🎹 MidiPlayerService.play() called');
    
    // Start audio context if needed
    if (Tone.context.state === 'suspended') {
      console.log('🔊 Starting Tone.js audio context');
      await Tone.start();
    }
    
    console.log('🎼 Starting transport, scheduled events:', this.scheduledEvents.length);
    
    if (this.state.isPaused) {
      // Resume from pause
      this.transport.start('+0', this.pauseTime);
    } else {
      // Start from beginning or current position
      this.transport.start('+0', this.state.currentTime);
    }
    
    this.state.isPlaying = true;
    this.state.isPaused = false;
    this.startUpdateTimer();
  }
  
  pause(): void {
    if (!this.state.isPlaying) return;
    
    this.pauseTime = this.transport.seconds;
    this.transport.pause();
    
    this.state.isPlaying = false;
    this.state.isPaused = true;
    this.stopUpdateTimer();
  }
  
  stop(): void {
    this.transport.stop();
    this.transport.seconds = 0;
    
    // Stop all instruments
    this.instruments.forEach(instrument => instrument.stop());
    
    this.state.isPlaying = false;
    this.state.isPaused = false;
    this.state.currentTime = 0;
    this.stopUpdateTimer();
    
    this.options.onTimeUpdate?.(0);
  }
  
  seek(time: number): void {
    const wasPlaying = this.state.isPlaying;
    
    if (wasPlaying) {
      this.pause();
    }
    
    this.state.currentTime = Math.max(0, Math.min(time, this.state.duration));
    this.transport.seconds = this.state.currentTime;
    
    if (wasPlaying) {
      this.play();
    }
    
    this.options.onTimeUpdate?.(this.state.currentTime);
  }
  
  setVolume(volume: number): void {
    this.options.volume = volume;
    this.instruments.forEach(instrument => {
      instrument.setVolume(volume);
    });
  }
  
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
      this.clearScheduledEvents();
      this.scheduleNotes();
    }
  }
  
  getState(): MidiPlayerState {
    return { ...this.state };
  }
  
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
    if (!this.midi) return;
    
    console.log('📋 Scheduling notes for', this.midi.tracks.length, 'tracks');
    
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
      
      console.log(`🎵 Track ${trackIndex} "${track.name}": ${track.notes.length} notes, instrument: ${instrumentType}`);
      
      // Schedule each note
      track.notes.forEach(note => {
        const noteEvent: NoteEvent = {
          note: note.name,
          midi: note.midi,
          time: note.time,
          duration: note.duration,
          velocity: note.velocity * (config?.volume ?? 1),
          channel: track.channel ?? 0,
        };
        
        const event = new Tone.ToneEvent((time) => {
          instrument.playNote(noteEvent, time);
        }, note.time);
        
        event.start(0);
        this.scheduledEvents.push(event);
      });
    });
  }
  
  private clearScheduledEvents(): void {
    this.scheduledEvents.forEach(event => {
      event.stop();
      event.dispose();
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
        this.state.currentTime = this.transport.seconds;
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