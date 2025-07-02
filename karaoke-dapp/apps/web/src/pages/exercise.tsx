import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ExerciseContainer, Header } from '@karaoke-dapp/ui'
import { useExerciseGrading } from '../hooks/use-exercise-grading'
import { wordSRSService, EncryptionService } from '@karaoke-dapp/services/browser'
import type { Exercise } from '@karaoke-dapp/services'
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
  const [exercises, setExercises] = useState<Exercise[]>(mockExercises)
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
        
        // Load exercises from SRS service
        try {
          await wordSRSService.initialize()
          
          // Get both due words and problem words
          const [dueWords, problemWords] = await Promise.all([
            wordSRSService.getDueWords(10),
            wordSRSService.getProblemWords(1) // Min 1 mistake
          ])
          
          const srsExercises: Exercise[] = []
          
          // First add due words (up to 3)
          for (const word of dueWords.slice(0, 3)) {
            if (word.contexts.length > 0) {
              srsExercises.push({
                id: `due-${srsExercises.length}`,
                word: word.word,
                context: word.contexts[0], // Use actual context from song
                type: 'say-it-back' as const
              })
            }
          }
          
          // Then add problem words (fill remaining slots)
          const remainingSlots = 5 - srsExercises.length
          for (const word of problemWords.slice(0, remainingSlots)) {
            // Get the actual lyric contexts for this problem word
            const mistakes = await wordSRSService.getWordMistakes(word.word)
            const contexts = mistakes
              .flatMap(m => m.contexts)
              .map(c => c.lineText)
              .filter((v, i, a) => a.indexOf(v) === i) // unique
            
            // Use the first context or check due words
            const dueWord = dueWords.find((d) => d.word === word.word)
            const context = contexts[0] || dueWord?.contexts[0] || `Practice saying: ${word.word}`
            
            srsExercises.push({
              id: `problem-${srsExercises.length}`,
              word: word.word,
              context,
              type: 'say-it-back' as const
            })
          }
          
          // If we still have less than 5 exercises, use mock exercises
          if (srsExercises.length < 5) {
            const remaining = 5 - srsExercises.length
            setExercises([...srsExercises, ...mockExercises.slice(0, remaining)])
          } else {
            setExercises(srsExercises)
          }
        } catch (error) {
          console.error('Failed to load SRS exercises:', error)
          // Fall back to mock exercises
          setExercises(mockExercises.slice(0, 5))
        }
      } catch (error) {
        console.error('Failed to initialize:', error)
      } finally {
        setIsLoading(false)
      }
    }

    initializeSession()
  }, [address])

  const handleComplete = async (results: any[]) => {
    console.log('Exercise session complete!', results)
    
    // Save results to SRS service
    try {
      for (const [index, result] of results.entries()) {
        const exercise = exercises[index]
        if (exercise && result.transcript) {
          // Process the result for SRS tracking
          await wordSRSService.processLineResult(
            index,
            exercise.context, // Use the full context line for expected text
            result.transcript,
            result.isCorrect ? 1.0 : 0.0,
            0 // No specific song ID for exercises
          )
        }
      }
      console.log('✅ Exercise results saved to SRS')
    } catch (error) {
      console.error('Failed to save exercise results:', error)
    }
    
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