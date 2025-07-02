import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ExerciseContainer, Header } from '@karaoke-dapp/ui'
import { useExerciseGrading } from '../hooks/use-exercise-grading'
import { WordSRSService, EncryptionService } from '@karaoke-dapp/services/browser'
import { useAccount } from 'wagmi'
import type { SessionSigsMap } from '@lit-protocol/types'

// Mock exercises for testing
const mockExercises = [
  {
    id: '1',
    word: 'Hello',
    context: 'Hello, how are you today?',
    type: 'say-it-back' as const,
  },
  {
    id: '2',
    word: 'beautiful',
    context: 'What a beautiful sunset!',
    type: 'say-it-back' as const,
  },
  {
    id: '3',
    word: 'amazing',
    context: 'That performance was amazing!',
    type: 'say-it-back' as const,
  }
]

export function ExercisePage() {
  const navigate = useNavigate()
  const { address } = useAccount()
  const [sessionSigs, setSessionSigs] = useState<SessionSigsMap | null>(null)
  const { gradeAudio } = useExerciseGrading(sessionSigs)
  const [exercises, setExercises] = useState(mockExercises)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const initializeSession = async () => {
      if (!address) return
      
      try {
        // Get session signatures
        const encryptionService = new EncryptionService()
        await encryptionService.connect()
        const sigs = await encryptionService.requestSessionSigs(address)
        setSessionSigs(sigs)
        
        // TODO: Load exercises from SRS service
        setExercises(mockExercises)
      } catch (error) {
        console.error('Failed to initialize:', error)
      } finally {
        setIsLoading(false)
      }
    }

    initializeSession()
  }, [address])

  const handleComplete = (results: any[]) => {
    console.log('Exercise session complete!', results)
    // TODO: Save results to SRS service
    navigate('/progress')
  }

  const handleAccountClick = () => {
    // Handle account/wallet click
  }

  if (!address || !sessionSigs) {
    return (
      <div className="min-h-screen bg-neutral-900 text-white flex flex-col">
        <Header onAccountClick={handleAccountClick} onLogoClick={() => navigate('/')} />
        <div className="flex-1 flex items-center justify-center">
          <p>Please connect your wallet to start exercises</p>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-900 text-white flex flex-col">
        <Header onAccountClick={handleAccountClick} onLogoClick={() => navigate('/')} />
        <div className="flex-1 flex items-center justify-center">
          <p>Loading exercises...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-900">
      <Header onAccountClick={handleAccountClick} onLogoClick={() => navigate('/')} />
      <ExerciseContainer
        exercises={exercises}
        onComplete={handleComplete}
        onGrade={gradeAudio}
      />
    </div>
  )
}