import { useState, useRef, useCallback } from 'react'

export function useAudioRecorder(sampleRate: number = 16000) {
  const [isRecording, setIsRecording] = useState(false)
  const [duration, setDuration] = useState(0)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const startTimeRef = useRef<number>(0)
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        } 
      })
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm'
      })
      
      audioChunksRef.current = []
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }
      
      mediaRecorderRef.current = mediaRecorder
      mediaRecorder.start()
      setIsRecording(true)
      startTimeRef.current = Date.now()
      
      // Update duration every 100ms
      durationIntervalRef.current = setInterval(() => {
        setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000))
      }, 100)
      
    } catch (error) {
      console.error('Failed to start recording:', error)
      throw error
    }
  }, [sampleRate])

  const stopRecording = useCallback(async (): Promise<{ audioData: Uint8Array; duration: number }> => {
    return new Promise((resolve, reject) => {
      if (!mediaRecorderRef.current) {
        reject(new Error('No recording in progress'))
        return
      }
      
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current)
        durationIntervalRef.current = null
      }
      
      const finalDuration = Math.floor((Date.now() - startTimeRef.current) / 1000)
      
      mediaRecorderRef.current.onstop = async () => {
        try {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
          
          // Convert to raw PCM data for processing
          const arrayBuffer = await audioBlob.arrayBuffer()
          const audioContext = new AudioContext({ sampleRate })
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
          
          // Get PCM data from first channel
          const pcmData = audioBuffer.getChannelData(0)
          
          // Convert float32 array to int16 array
          const int16Array = new Int16Array(pcmData.length)
          for (let i = 0; i < pcmData.length; i++) {
            const s = Math.max(-1, Math.min(1, pcmData[i]))
            int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF
          }
          
          // Convert to Uint8Array
          const uint8Array = new Uint8Array(int16Array.buffer)
          
          // Stop all tracks
          mediaRecorderRef.current?.stream.getTracks().forEach(track => track.stop())
          
          setIsRecording(false)
          setDuration(0)
          resolve({ audioData: uint8Array, duration: finalDuration })
        } catch (error) {
          reject(error)
        }
      }
      
      mediaRecorderRef.current.stop()
    })
  }, [sampleRate])

  return {
    isRecording,
    duration,
    startRecording,
    stopRecording
  }
}