import { useState, useCallback, useRef } from 'react'
import { midiPlayerService } from '../services/MidiPlayerService'
import * as lame from '@breezystack/lamejs'

interface KaraokeLine {
  time: number
  text: string
  translation?: string
}

interface UseKaraokeProps {
  lyrics: KaraokeLine[]
  midiData: Uint8Array | null
  onComplete: (mp3Blob: Blob, expectedLyrics: string) => void
}

export function useKaraoke({ lyrics, midiData, onComplete }: UseKaraokeProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentLineIndex, setCurrentLineIndex] = useState(-1)
  
  const pcmDataRef = useRef<Float32Array[]>([])
  const audioContextRef = useRef<AudioContext | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const processorRef = useRef<ScriptProcessorNode | null>(null)

  const startKaraoke = useCallback(async () => {
    if (!midiData || lyrics.length === 0) {
      console.error('No MIDI data or lyrics available')
      return
    }

    // Don't handle countdown here - let KaraokeDisplay do it
    // Wait 3 seconds for KaraokeDisplay's countdown to finish
    setTimeout(() => {
      performStart()
    }, 3000)
  }, [midiData, lyrics])

  const performStart = useCallback(async () => {
    try {
      // Start audio recording with PCM capture
      await startPCMRecording()
      
      // Start MIDI playback
      setIsPlaying(true)
      setCurrentLineIndex(0)
      
      await midiPlayerService.loadAndPlayMidi(midiData!, (time) => {
        // Update current line based on time
        const lineIndex = lyrics.findIndex((line, idx) => {
          const nextLine = lyrics[idx + 1]
          return time >= line.time && (!nextLine || time < nextLine.time)
        })
        
        if (lineIndex !== -1 && lineIndex !== currentLineIndex) {
          setCurrentLineIndex(lineIndex)
        }
      })
      
      // Calculate duration for 3 lines  
      // If we have timing, use it; otherwise estimate
      const endTime = lyrics[2] ? (lyrics[2].time + 4) : 12 // Add 4 seconds after third line starts
      
      console.log('🎵 Karaoke duration:', endTime, 'seconds')
      
      // Auto-stop after 3 lines
      setTimeout(() => {
        stopKaraoke()
      }, endTime * 1000)
      
    } catch (error) {
      console.error('Failed to start karaoke:', error)
      setIsPlaying(false)
    }
  }, [lyrics, midiData])

  const startPCMRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 48000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        } 
      })
      
      mediaStreamRef.current = stream
      audioContextRef.current = new AudioContext({ sampleRate: 48000 })
      const source = audioContextRef.current.createMediaStreamSource(stream)
      
      // Create processor for PCM data capture
      const processor = audioContextRef.current.createScriptProcessor(4096, 1, 1)
      processorRef.current = processor
      
      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0)
        // Store PCM data
        pcmDataRef.current.push(new Float32Array(inputData))
      }
      
      source.connect(processor)
      processor.connect(audioContextRef.current.destination)
      
    } catch (error) {
      console.error('Failed to start PCM recording:', error)
      throw error
    }
  }

  const stopKaraoke = useCallback(async () => {
    // Stop MIDI playback
    midiPlayerService.stop()
    setIsPlaying(false)
    
    // Stop audio recording and convert to MP3
    if (processorRef.current) {
      processorRef.current.disconnect()
    }
    
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop())
    }
    
    // Convert PCM to MP3
    const mp3Blob = await convertPCMToMP3()
    
    // Get expected lyrics text (first 3 lines, separated by newlines)
    const expectedLyrics = lyrics.slice(0, 3).map(l => l.text).join('\n')
    
    // Call onComplete with MP3 and expected text
    onComplete(mp3Blob, expectedLyrics)
    
    // Reset state
    setCurrentLineIndex(-1)
    pcmDataRef.current = []
    
  }, [lyrics, onComplete])

  const convertPCMToMP3 = async (): Promise<Blob> => {
    // Combine all PCM chunks
    const totalLength = pcmDataRef.current.reduce((acc, chunk) => acc + chunk.length, 0)
    const combinedPCM = new Float32Array(totalLength)
    
    let offset = 0
    pcmDataRef.current.forEach(chunk => {
      combinedPCM.set(chunk, offset)
      offset += chunk.length
    })
    
    // Convert Float32 to Int16
    const samples = new Int16Array(combinedPCM.length)
    for (let i = 0; i < combinedPCM.length; i++) {
      const s = Math.max(-1, Math.min(1, combinedPCM[i]))
      samples[i] = s < 0 ? s * 0x8000 : s * 0x7FFF
    }
    
    // Encode to MP3
    const mp3encoder = new lame.Mp3Encoder(1, 48000, 128)
    const mp3Data: Int8Array[] = []
    
    let remaining = samples.length
    for (let i = 0; remaining >= 1152; i += 1152) {
      const chunk = samples.subarray(i, i + 1152)
      const mp3buf = mp3encoder.encodeBuffer(chunk)
      if (mp3buf.length > 0) {
        mp3Data.push(mp3buf)
      }
      remaining -= 1152
    }
    
    // Flush remaining
    const mp3buf = mp3encoder.flush()
    if (mp3buf.length > 0) {
      mp3Data.push(mp3buf)
    }
    
    // Create blob
    return new Blob(mp3Data, { type: 'audio/mp3' })
  }

  return {
    isPlaying,
    currentLineIndex,
    startKaraoke,
    stopKaraoke
  }
}