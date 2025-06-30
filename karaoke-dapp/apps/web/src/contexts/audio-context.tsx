import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react'
import { MidiPlayerService } from '../services/midi-player.service'
import type { ParsedMidiData } from '../types/midi.types'

interface AudioContextState {
  isPlaying: boolean
  currentTime: number
  duration: number
  isRecording: boolean
  recordingTime: number
  audioBuffer: AudioBuffer | null
  midiData: ParsedMidiData | null
  hasMidi: boolean
  hasAudio: boolean
  play: () => void
  pause: () => void
  seek: (time: number) => void
  startRecording: () => Promise<void>
  stopRecording: () => Promise<Blob | null>
  loadAudio: (url: string) => Promise<void>
  loadMidi: (midiData: Uint8Array) => Promise<void>
  setVolume: (volume: number) => void
  midiVolume: number
  audioVolume: number
}

const AudioContext = createContext<AudioContextState | null>(null)

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null)
  const [midiData, setMidiData] = useState<ParsedMidiData | null>(null)
  const [midiVolume, setMidiVolume] = useState(-6)
  const [audioVolume, setAudioVolume] = useState(-6)
  
  const audioContextRef = useRef<AudioContext | null>(null)
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null)
  const gainNodeRef = useRef<GainNode | null>(null)
  const startTimeRef = useRef<number>(0)
  const pauseTimeRef = useRef<number>(0)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordingChunksRef = useRef<Blob[]>([])
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const midiPlayerRef = useRef<MidiPlayerService | null>(null)
  
  // Initialize Web Audio API context and MIDI player
  useEffect(() => {
    audioContextRef.current = new window.AudioContext()
    gainNodeRef.current = audioContextRef.current.createGain()
    gainNodeRef.current.connect(audioContextRef.current.destination)
    
    // Initialize MIDI player
    midiPlayerRef.current = new MidiPlayerService({
      volume: midiVolume,
      onTimeUpdate: (time) => {
        // Only update time if MIDI is playing
        if (midiData && !audioBuffer) {
          setCurrentTime(time)
        }
      },
      onEnd: () => {
        setIsPlaying(false)
        setCurrentTime(0)
        pauseTimeRef.current = 0
      },
    })
    
    return () => {
      midiPlayerRef.current?.dispose()
      audioContextRef.current?.close()
    }
  }, [])
  
  // Update current time while playing (only for audio, MIDI handles its own timing)
  useEffect(() => {
    if (!isPlaying || !audioBuffer) return
    
    const interval = setInterval(() => {
      if (audioContextRef.current && sourceNodeRef.current) {
        const elapsed = audioContextRef.current.currentTime - startTimeRef.current + pauseTimeRef.current
        setCurrentTime(Math.min(elapsed, duration))
        
        if (elapsed >= duration) {
          setIsPlaying(false)
          setCurrentTime(0)
          pauseTimeRef.current = 0
        }
      }
    }, 50)
    
    return () => clearInterval(interval)
  }, [isPlaying, duration, audioBuffer])
  
  const loadAudio = useCallback(async (url: string) => {
    if (!audioContextRef.current) return
    
    try {
      const response = await fetch(url)
      const arrayBuffer = await response.arrayBuffer()
      const buffer = await audioContextRef.current.decodeAudioData(arrayBuffer)
      setAudioBuffer(buffer)
      setDuration(buffer.duration)
      setCurrentTime(0)
      pauseTimeRef.current = 0
    } catch (error) {
      console.error('Error loading audio:', error)
    }
  }, [])
  
  const loadMidi = useCallback(async (midiDataArray: Uint8Array) => {
    if (!midiPlayerRef.current) {
      console.error('❌ MIDI player not initialized')
      return
    }
    
    try {
      console.log('🎹 Loading MIDI in audio context, size:', midiDataArray.length)
      const parsedData = await midiPlayerRef.current.load(midiDataArray)
      console.log('✅ MIDI loaded successfully:', {
        name: parsedData.name,
        duration: parsedData.duration,
        tracks: parsedData.tracks.length,
        tempo: parsedData.tempo
      })
      setMidiData(parsedData)
      
      // Use MIDI duration if no audio is loaded
      if (!audioBuffer) {
        setDuration(parsedData.duration)
        setCurrentTime(0)
        pauseTimeRef.current = 0
      }
    } catch (error) {
      console.error('❌ Error loading MIDI:', error)
    }
  }, [audioBuffer])
  
  const play = useCallback(async () => {
    if (isPlaying) return
    
    console.log('🎵 Play called, state:', {
      hasMidi: !!midiData,
      hasAudio: !!audioBuffer,
      midiTracks: midiData?.tracks.length || 0
    })
    
    // Play MIDI if available
    if (midiData && midiPlayerRef.current) {
      console.log('🎹 Starting MIDI playback')
      await midiPlayerRef.current.play()
    }
    
    // Play audio if available
    if (audioContextRef.current && audioBuffer && gainNodeRef.current) {
      console.log('🔊 Starting audio playback')
      sourceNodeRef.current = audioContextRef.current.createBufferSource()
      sourceNodeRef.current.buffer = audioBuffer
      sourceNodeRef.current.connect(gainNodeRef.current)
      
      const offset = pauseTimeRef.current
      sourceNodeRef.current.start(0, offset)
      startTimeRef.current = audioContextRef.current.currentTime
    }
    
    setIsPlaying(true)
  }, [audioBuffer, isPlaying, midiData])
  
  const pause = useCallback(() => {
    if (!isPlaying) return
    
    // Pause MIDI if playing
    if (midiData && midiPlayerRef.current) {
      midiPlayerRef.current.pause()
    }
    
    // Pause audio if playing
    if (sourceNodeRef.current) {
      sourceNodeRef.current.stop()
      sourceNodeRef.current.disconnect()
      sourceNodeRef.current = null
    }
    
    pauseTimeRef.current = currentTime
    setIsPlaying(false)
  }, [isPlaying, currentTime, midiData])
  
  const seek = useCallback((time: number) => {
    const wasPlaying = isPlaying
    
    if (isPlaying) {
      pause()
    }
    
    const seekTime = Math.max(0, Math.min(time, duration))
    pauseTimeRef.current = seekTime
    setCurrentTime(seekTime)
    
    // Seek MIDI if available
    if (midiData && midiPlayerRef.current) {
      midiPlayerRef.current.seek(seekTime)
    }
    
    if (wasPlaying) {
      play()
    }
  }, [isPlaying, duration, play, pause, midiData])
  
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaRecorderRef.current = new MediaRecorder(stream)
      recordingChunksRef.current = []
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordingChunksRef.current.push(event.data)
        }
      }
      
      mediaRecorderRef.current.start()
      setIsRecording(true)
      setRecordingTime(0)
      
      // Update recording time
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 0.1)
      }, 100)
    } catch (error) {
      console.error('Error starting recording:', error)
    }
  }, [])
  
  const stopRecording = useCallback(async (): Promise<Blob | null> => {
    if (!mediaRecorderRef.current || !isRecording) return null
    
    return new Promise((resolve) => {
      mediaRecorderRef.current!.onstop = () => {
        const blob = new Blob(recordingChunksRef.current, { type: 'audio/webm' })
        resolve(blob)
      }
      
      mediaRecorderRef.current!.stop()
      mediaRecorderRef.current!.stream.getTracks().forEach(track => track.stop())
      
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current)
      }
      
      setIsRecording(false)
      setRecordingTime(0)
    })
  }, [isRecording])
  
  const setVolume = useCallback((volume: number) => {
    // Set MIDI volume
    if (midiPlayerRef.current) {
      midiPlayerRef.current.setVolume(volume)
      setMidiVolume(volume)
    }
    
    // Set audio volume
    if (gainNodeRef.current) {
      // Convert dB to linear gain
      const gain = Math.pow(10, volume / 20)
      gainNodeRef.current.gain.value = gain
      setAudioVolume(volume)
    }
  }, [])
  
  const contextValue: AudioContextState = {
    isPlaying,
    currentTime,
    duration,
    isRecording,
    recordingTime,
    audioBuffer,
    midiData,
    hasMidi: midiData !== null,
    hasAudio: audioBuffer !== null,
    play,
    pause,
    seek,
    startRecording,
    stopRecording,
    loadAudio,
    loadMidi,
    setVolume,
    midiVolume,
    audioVolume,
  }
  
  return (
    <AudioContext.Provider value={contextValue}>
      {children}
    </AudioContext.Provider>
  )
}

export function useAudio() {
  const context = useContext(AudioContext)
  if (!context) {
    throw new Error('useAudio must be used within AudioProvider')
  }
  return context
}