import { useState, useEffect } from 'react'
import { Microphone, Square, CircleNotch } from '@phosphor-icons/react'
import { Button } from './ui/button'
import { Card } from './ui/card'
import { cn } from '../lib/utils'
import { useAudioRecorder } from '../hooks/useAudioRecorder'
import { lineScoringScoringService } from '../services/integrations/lit/LineScoringService'
import { walletClientToSigner } from '../utils/walletClientToSigner'
import type { SessionSigsMap } from '@lit-protocol/types'

interface SayItBackProps {
  expectedText: string
  songId: string
  onComplete: (score: number, transcript: string) => void
  isStudyMode?: boolean
  sessionSigs?: SessionSigsMap | null
  walletClient?: any
}

export function SayItBack({ 
  expectedText, 
  onComplete, 
  isStudyMode = false,
  sessionSigs,
  walletClient
}: SayItBackProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [score, setScore] = useState<number | null>(null)
  const [showResult, setShowResult] = useState(false)
  const [audioData, setAudioData] = useState<Uint8Array | null>(null)
  
  const { startRecording, stopRecording } = useAudioRecorder()
  
  // Process recording when available
  useEffect(() => {
    if (audioData && !isProcessing) {
      processRecording()
    }
  }, [audioData])
  
  const handleStartRecording = async () => {
    setShowResult(false)
    setTranscript('')
    setScore(null)
    setAudioData(null)
    
    try {
      await startRecording()
      setIsRecording(true)
    } catch (error) {
      console.error('Failed to start recording:', error)
    }
  }
  
  const handleStopRecording = async () => {
    try {
      const result = await stopRecording()
      setIsRecording(false)
      if (result) {
        setAudioData(result.audioData)
      }
    } catch (error) {
      console.error('Failed to stop recording:', error)
      setIsRecording(false)
    }
  }
  
  const processRecording = async () => {
    if (!audioData || !walletClient) return
    
    setIsProcessing(true)
    
    try {
      console.log('🎤 Processing audio:', audioData.length, 'bytes')
      
      // Convert wallet client to signer
      const signer = await walletClientToSigner(walletClient)
      
      // Score using Lit Protocol
      const result = await lineScoringScoringService.scoreLine(
        audioData,
        expectedText,
        signer,
        sessionSigs
      )
      
      if (result.success && result.transcript) {
        setTranscript(result.transcript)
        setScore(result.score || 0)
        setShowResult(true)
        
        // Notify parent component
        onComplete(result.score || 0, result.transcript)
      } else {
        console.error('Scoring failed:', result.error)
        setTranscript('Failed to process audio')
        setScore(0)
        setShowResult(true)
      }
    } catch (error) {
      console.error('Processing error:', error)
      setTranscript('Error processing audio')
      setScore(0)
      setShowResult(true)
    } finally {
      setIsProcessing(false)
    }
  }
  
  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-500'
    if (score >= 70) return 'text-yellow-500'
    return 'text-red-500'
  }
  
  const getScoreEmoji = (score: number) => {
    if (score >= 90) return '🎉'
    if (score >= 70) return '👍'
    return '🔄'
  }
  
  return (
    <div className="space-y-4">
      {/* Recording controls */}
      <div className="flex justify-center">
        {!isRecording ? (
          <Button
            size="lg"
            onClick={handleStartRecording}
            disabled={isProcessing}
            className="bg-red-600 hover:bg-red-700 text-white px-8 py-6 rounded-full"
          >
            {isProcessing ? (
              <>
                <CircleNotch className="w-6 h-6 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Microphone className="w-6 h-6 mr-2" />
                Start Recording
              </>
            )}
          </Button>
        ) : (
          <Button
            size="lg"
            onClick={handleStopRecording}
            className="bg-red-700 hover:bg-red-800 text-white px-8 py-6 rounded-full animate-pulse"
          >
            <Square className="w-6 h-6 mr-2" />
            Stop Recording
          </Button>
        )}
      </div>
      
      {/* Results */}
      {showResult && transcript && score !== null && (
        <Card className="bg-white/5 border-white/10 p-4 space-y-3">
          <div>
            <p className="text-sm text-white/60 mb-1">You said:</p>
            <p className="text-white">{transcript}</p>
          </div>
          
          <div className="flex items-center justify-between pt-3 border-t border-white/10">
            <span className="text-white/60">Score:</span>
            <span className={cn("text-2xl font-bold", getScoreColor(score))}>
              {score}% {getScoreEmoji(score)}
            </span>
          </div>
          
          {isStudyMode && score < 70 && (
            <p className="text-sm text-white/60 text-center pt-2">
              Try again to improve your score!
            </p>
          )}
        </Card>
      )}
    </div>
  )
}