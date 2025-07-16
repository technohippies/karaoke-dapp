import * as Tone from 'tone'
import { Midi } from '@tonejs/midi'

export class MidiPlayerService {
  private synth: Tone.PolySynth | null = null
  private isPlaying = false

  constructor() {
    this.initializeSynth()
  }

  private initializeSynth() {
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
      
      // Set BPM from MIDI if available
      if (midi.header.tempos && midi.header.tempos.length > 0) {
        Tone.Transport.bpm.value = midi.header.tempos[0].bpm
      }
      
      // Schedule all notes using Transport time
      midi.tracks.forEach(track => {
        track.notes.forEach(note => {
          // Schedule note with transport time
          Tone.Transport.schedule((time) => {
            this.synth?.triggerAttackRelease(
              note.name,
              note.duration,
              time,
              note.velocity
            )
          }, note.time)
        })
      })
      
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
      console.log('🎵 Scheduling stop at:', totalDuration, 'seconds')
      
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
    this.synth?.dispose()
    this.synth = null
  }
}

export const midiPlayerService = new MidiPlayerService()