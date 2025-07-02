import { useCallback, useRef } from 'react'
import { KaraokeGradingService } from '../services/karaoke-grading.service'
import type { RecordingSegment } from '../services/recording-manager.service'
import { useAccount } from 'wagmi'
import type { SessionSigsMap } from '@lit-protocol/types'

export function useExerciseGrading(sessionSigs: SessionSigsMap | null) {
  const { address } = useAccount()
  const gradingServiceRef = useRef<KaraokeGradingService | null>(null)

  const initializeGrading = useCallback(async () => {
    if (!sessionSigs || !address) {
      throw new Error('Session signatures and wallet address required')
    }

    if (!gradingServiceRef.current) {
      gradingServiceRef.current = new KaraokeGradingService({
        sessionSigs,
        userAddress: address,
        sessionId: `exercise-${Date.now()}`,
        language: 'en'
      })
      await gradingServiceRef.current.initialize()
    }

    return gradingServiceRef.current
  }, [sessionSigs, address])

  const gradeAudio = useCallback(async (expectedText: string, answer: string | Blob) => {
    // For text answers, just compare directly (not used in current implementation)
    if (typeof answer === 'string') {
      return {
        isCorrect: answer.toLowerCase() === expectedText.toLowerCase(),
        transcript: answer
      }
    }
    
    // For audio answers, use the grading service
    const audioBlob = answer
    const gradingService = await initializeGrading()
    
    // Create a segment format that the grading service expects
    const segment: RecordingSegment = {
      segmentId: `exercise-${Date.now()}`,
      audioBlob,
      expectedText,
      lyricLineId: 0, // For exercises, we don't need real line IDs
      startTime: 0,
      endTime: 0,
      keywords: expectedText.split(' ').filter(w => w.length > 3) // Simple keyword extraction
    }

    const result = await gradingService.gradeSegment(segment)
    
    // Return in the format expected by the exercise machine
    return {
      isCorrect: result.similarity > 0.7, // 70% threshold for exercises
      transcript: result.transcript
    }
  }, [initializeGrading])

  return { gradeAudio }
}