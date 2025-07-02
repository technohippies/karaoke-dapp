import { useState, useEffect, useRef } from 'react'
import { Microphone, StopCircle } from '@phosphor-icons/react'
import { Button } from '../ui/button'
import { Spinner } from '../ui/spinner'

export interface ExerciseRecordingFooterProps {
  onSubmit: (audioBlob: Blob) => void
  isChecking: boolean
}

export function ExerciseRecordingFooter({
  onSubmit,
  isChecking
}: ExerciseRecordingFooterProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }
      
      mediaRecorder.onstop = async () => {
        setIsProcessing(true)
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        setIsProcessing(false)
        onSubmit(audioBlob)
      }
      
      mediaRecorder.start()
      setIsRecording(true)
      
    } catch (error) {
      console.error('Error starting recording:', error)
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
    }
  }

  const handleButtonClick = () => {
    if (isRecording) {
      stopRecording()
    } else {
      startRecording()
    }
  }

  const getButtonState = () => {
    if (isProcessing || isChecking) return 'processing'
    if (isRecording) return 'stop'
    return 'record'
  }

  const buttonState = getButtonState()

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-neutral-900 border-t border-neutral-800 p-4">
        <div className="max-w-2xl mx-auto">
          <Button
            onClick={handleButtonClick}
            disabled={buttonState === 'processing'}
            className="w-full px-8 py-4 font-semibold rounded-lg transition-all flex items-center justify-center gap-3"
          >
            {buttonState === 'processing' ? (
              <>
                <Spinner size="sm" />
                <span>Processing...</span>
              </>
            ) : buttonState === 'stop' ? (
              <>
                <StopCircle size={24} weight="fill" className="text-neutral-700" />
                <span>Stop</span>
              </>
            ) : (
              <>
                <Microphone size={24} weight="fill" className="text-neutral-700" />
                <span>Record</span>
              </>
            )}
          </Button>
        </div>
      </div>
  )
}