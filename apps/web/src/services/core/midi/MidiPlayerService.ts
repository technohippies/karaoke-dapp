import * as Tone from 'tone'
import { Midi } from '@tonejs/midi'
import { pianoSampler } from '../../instruments/PianoSampler'

export class MidiPlayerService {
  private isPlaying = false
  private usePiano = true // Toggle between piano and synth
  private synth: Tone.PolySynth | null = null

  constructor() {
    // console.log('🎵 MidiPlayerService constructor - usePiano:', this.usePiano);
    // Only initialize synth as fallback
    if (!this.usePiano) {
      this.initializeSynth()
    }
  }

  private initializeSynth() {
    // console.log('🎵 Initializing synth (fallback mode)');
    // Simple piano-like synth with increased polyphony
    this.synth = new Tone.PolySynth(Tone.Synth, {
      maxPolyphony: 32, // Increase from default
      oscillator: {
        type: 'triangle'
      },
      envelope: {
        attack: 0.02,
        decay: 0.1,
        sustain: 0.3,
        release: 1
      },
      volume: -10 // Reduce volume to prevent loud noise
    }).toDestination()
  }

  async loadAndPlayMidi(midiData: Uint8Array, onProgress?: (time: number) => void) {
    try {
      // Parse MIDI data
      const midi = new Midi(midiData)
      console.log('🎵 MIDI info:', {
        duration: midi.duration,
        tracks: midi.tracks.length,
        totalNotes: midi.tracks.reduce((sum, track) => sum + track.notes.length, 0)
      })
      
      // Clear any existing scheduled events
      this.stop()
      
      // Start Tone.js
      await Tone.start()
      
      // Initialize piano if using it
      if (this.usePiano) {
        // console.log('🎵 Initializing piano sampler...');
        await pianoSampler.initialize()
        // console.log('🎵 Piano sampler initialized');
      }
      
      // Set BPM from MIDI if available
      if (midi.header.tempos && midi.header.tempos.length > 0) {
        Tone.Transport.bpm.value = midi.header.tempos[0].bpm
      }
      
      // Schedule all notes using Transport time
      let noteCount = 0;
      
      midi.tracks.forEach((track, trackIndex) => {
        track.notes.forEach(note => {
          if (this.usePiano) {
            // Use piano sampler
            noteCount++;
            // Uncomment for debugging note scheduling
            // if (noteCount <= 10) { // Log first 10 notes
            //   console.log(`🎵 Scheduling piano note ${noteCount}:`, note.name, 'at time:', note.time);
            // }
            
            // Schedule note with Transport
            Tone.Transport.schedule((time) => {
              pianoSampler.playNote(
                note.name,
                note.duration,
                time,
                note.velocity
              )
            }, note.time)
          } else {
            // Fall back to synth
            console.log('🎵 Using synth for note:', note.name);
            Tone.Transport.schedule((time) => {
              this.synth?.triggerAttackRelease(
                note.name,
                note.duration,
                time,
                note.velocity
              )
            }, note.time)
          }
        })
      })
      
      // console.log(`🎵 Total notes scheduled: ${noteCount} using ${this.usePiano ? 'piano' : 'synth'}`);
      
      // Start transport from beginning
      Tone.Transport.position = 0
      Tone.Transport.start()
      this.isPlaying = true
      
      // Progress callback
      let progressInterval: number | null = null
      if (onProgress) {
        progressInterval = setInterval(() => {
          if (this.isPlaying) {
            onProgress(Tone.Transport.seconds)
          } else {
            if (progressInterval) clearInterval(progressInterval)
          }
        }, 100) as unknown as number
      }
      
      // Auto-stop at end
      const totalDuration = midi.duration
      // console.log('🎵 Scheduling stop at:', totalDuration, 'seconds')
      
      Tone.Transport.schedule(() => {
        this.stop()
        if (progressInterval) clearInterval(progressInterval)
      }, totalDuration)
      
    } catch (error) {
      console.error('Failed to play MIDI:', error)
      throw error
    }
  }

  stop() {
    // Stop and clear transport
    Tone.Transport.stop()
    Tone.Transport.cancel()
    Tone.Transport.position = 0
    
    this.isPlaying = false
  }

  dispose() {
    this.stop()
    if (this.usePiano) {
      pianoSampler.dispose()
    }
    this.synth?.dispose()
    this.synth = null
  }
}

export const midiPlayerService = new MidiPlayerService()