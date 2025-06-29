import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react'

interface AudioContextState {
  isPlaying: boolean
  currentTime: number
  duration: number
  isRecording: boolean
  recordingTime: number
  audioBuffer: AudioBuffer | null
  play: () => void
  pause: () => void
  seek: (time: number) => void
  startRecording: () => Promise<void>
  stopRecording: () => Promise<Blob | null>
  loadAudio: (url: string) => Promise<void>
}

const AudioContext = createContext<AudioContextState | null>(null)

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null)
  
  const audioContextRef = useRef<AudioContext | null>(null)
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null)
  const startTimeRef = useRef<number>(0)
  const pauseTimeRef = useRef<number>(0)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordingChunksRef = useRef<Blob[]>([])
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  
  // Initialize Web Audio API context
  useEffect(() => {
    audioContextRef.current = new window.AudioContext()
    return () => {
      audioContextRef.current?.close()
    }
  }, [])
  
  // Update current time while playing
  useEffect(() => {
    if (!isPlaying) return
    
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
  }, [isPlaying, duration])
  
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
  
  const play = useCallback(() => {
    if (!audioContextRef.current || !audioBuffer || isPlaying) return
    
    sourceNodeRef.current = audioContextRef.current.createBufferSource()
    sourceNodeRef.current.buffer = audioBuffer
    sourceNodeRef.current.connect(audioContextRef.current.destination)
    
    const offset = pauseTimeRef.current
    sourceNodeRef.current.start(0, offset)
    startTimeRef.current = audioContextRef.current.currentTime
    
    setIsPlaying(true)
  }, [audioBuffer, isPlaying])
  
  const pause = useCallback(() => {
    if (!sourceNodeRef.current || !isPlaying) return
    
    sourceNodeRef.current.stop()
    sourceNodeRef.current.disconnect()
    sourceNodeRef.current = null
    
    pauseTimeRef.current = currentTime
    setIsPlaying(false)
  }, [isPlaying, currentTime])
  
  const seek = useCallback((time: number) => {
    const wasPlaying = isPlaying
    
    if (isPlaying) {
      pause()
    }
    
    pauseTimeRef.current = Math.max(0, Math.min(time, duration))
    setCurrentTime(pauseTimeRef.current)
    
    if (wasPlaying) {
      play()
    }
  }, [isPlaying, duration, play, pause])
  
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
  
  const contextValue: AudioContextState = {
    isPlaying,
    currentTime,
    duration,
    isRecording,
    recordingTime,
    audioBuffer,
    play,
    pause,
    seek,
    startRecording,
    stopRecording,
    loadAudio,
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