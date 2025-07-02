import { useEffect, useState } from 'react'
import { useMachine } from '@xstate/react'
import { AnimatePresence } from 'framer-motion'
import { exerciseMachine, getExerciseProgress, shouldShowRetry } from '../../machines/exerciseMachine'
import { ExerciseFooter } from './exercise-footer'
import { ExerciseRecordingFooter } from './exercise-recording-footer'
import { SayItBack } from './exercises/say-it-back'
import { Progress } from '../ui/progress'

export interface ExerciseContainerProps {
  exercises: Array<{
    id: string
    word: string
    context: string
    type: 'say-it-back' | 'multiple-choice' | 'fill-in-blank'
    targetPhonetic?: string
    options?: string[]
    blank?: { start: number; end: number }
  }>
  onComplete: (results: any[]) => void
  onGrade?: (word: string, answer: string) => Promise<boolean>
}

export function ExerciseContainer({
  exercises,
  onComplete,
  onGrade
}: ExerciseContainerProps) {
  const [state, send] = useMachine(exerciseMachine, {
    input: {
      exercises: [],
      onComplete,
      onGrade
    }
  })
  
  const [transcript, setTranscript] = useState<string>('')

  useEffect(() => {
    if (exercises.length > 0) {
      send({ type: 'START', exercises })
    }
  }, [exercises, send])

  const progress = getExerciseProgress(state.context)
  
  const handleSubmit = (answer: string) => {
    setTranscript(answer)
    send({ type: 'SUBMIT_ANSWER', answer })
  }

  const handleNext = () => {
    setTranscript('') // Clear transcript for next exercise
    send({ type: 'NEXT' })
  }

  const handleRetry = () => {
    setTranscript('') // Clear transcript for retry
    send({ type: 'RETRY' })
  }

  const isCorrect = state.context.results.length > 0
    ? state.context.results[state.context.results.length - 1].isCorrect
    : null

  const progressPercentage = state.context.exercises.length > 0
    ? ((state.context.currentIndex + 1) / state.context.exercises.length) * 100
    : 0

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex flex-col">
      {/* Progress bar at the top */}
      <Progress value={progressPercentage} className="h-1" />
      
      <div className="flex-1 flex items-start justify-center p-8 pt-16">
        <div className="max-w-2xl w-full">
          <AnimatePresence mode="wait">
            {(state.matches('instruction') || state.matches('exercising') || state.matches('checking')) && 
             state.context.currentExercise && (
              <div key="exercise" className="space-y-6">
                {/* Show instruction */}
                {state.context.currentExercise.type === 'say-it-back' && (
                  <h2 className="text-2xl font-semibold text-white">Say it back:</h2>
                )}
                {state.context.currentExercise.type === 'multiple-choice' && (
                  <h2 className="text-2xl font-semibold text-white">Select the correct option:</h2>
                )}
                {state.context.currentExercise.type === 'fill-in-blank' && (
                  <h2 className="text-2xl font-semibold text-white">Fill in the blank:</h2>
                )}
                
                {/* Show exercise content */}
                {state.context.currentExercise.type === 'say-it-back' && (
                  <SayItBack
                    line={state.context.currentExercise.context}
                    transcript={state.matches('checking') ? transcript : undefined}
                    isCorrect={null}
                  />
                )}
                
                {/* Future exercise types */}
                {state.context.currentExercise.type === 'multiple-choice' && (
                  <div>Multiple choice exercise coming soon</div>
                )}
                
                {state.context.currentExercise.type === 'fill-in-blank' && (
                  <div>Fill in the blank exercise coming soon</div>
                )}
              </div>
            )}
            
            {state.matches('feedback') && state.context.currentExercise && (
              <div key="feedback" className="space-y-6">
                {/* Show instruction */}
                {state.context.currentExercise.type === 'say-it-back' && (
                  <h2 className="text-2xl font-semibold text-white">Say it back:</h2>
                )}
                
                {/* Show exercise content */}
                {state.context.currentExercise.type === 'say-it-back' && (
                  <SayItBack
                    line={state.context.currentExercise.context}
                    transcript={transcript}
                    isCorrect={isCorrect}
                  />
                )}
              </div>
            )}
            
            {state.matches('complete') && (
              <div key="complete" className="text-center space-y-4">
                <h2 className="text-3xl font-bold">Exercise Complete!</h2>
                <p className="text-xl">
                  You got {progress.completed} out of {progress.total} correct
                </p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
      
      {/* Show recording footer during exercise phase */}
      {(state.matches('exercising') || state.matches('checking')) && 
       state.context.currentExercise?.type === 'say-it-back' && (
        <ExerciseRecordingFooter
          onSubmit={handleSubmit}
          isChecking={state.matches('checking')}
        />
      )}
      
      {/* Show feedback footer */}
      {state.matches('feedback') && (
        <ExerciseFooter
          isCorrect={isCorrect}
          attemptCount={state.context.attemptCount}
          maxAttempts={state.context.maxAttempts}
          onNext={handleNext}
          onRetry={handleRetry}
        />
      )}
    </div>
  )
}