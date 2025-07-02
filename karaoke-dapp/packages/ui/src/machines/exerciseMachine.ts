import { createMachine, assign, fromPromise } from 'xstate'

export interface Exercise {
  id: string
  word: string
  context: string
  type: 'say-it-back' | 'multiple-choice' | 'fill-in-blank'
  targetPhonetic?: string
  options?: string[]
  blank?: { start: number; end: number }
}

export interface ExerciseResult {
  exerciseId: string
  word: string
  isCorrect: boolean
  attempts: number
  userAnswer?: string
  timeSpent: number
}

export interface ExerciseMachineContext {
  exercises: Exercise[]
  currentIndex: number
  currentExercise: Exercise | null
  attemptCount: number
  maxAttempts: number
  results: ExerciseResult[]
  startTime: number
  exerciseStartTime: number
}

export type ExerciseMachineEvent =
  | { type: 'START'; exercises: Exercise[] }
  | { type: 'SUBMIT_ANSWER'; answer: Blob | string }
  | { type: 'CHECK_COMPLETE'; isCorrect: boolean; transcript?: string }
  | { type: 'RETRY' }
  | { type: 'NEXT' }
  | { type: 'COMPLETE' }

interface ExerciseMachineInput {
  exercises: Exercise[]
  onComplete?: (results: ExerciseResult[]) => void
  onGrade?: (expectedText: string, answer: Blob | string) => Promise<{ isCorrect: boolean; transcript?: string }>
}

export const exerciseMachine = createMachine({
  id: 'exercise',
  initial: 'idle',
  context: ({ input }: { input: ExerciseMachineInput }): ExerciseMachineContext => ({
    exercises: input.exercises || [],
    currentIndex: 0,
    currentExercise: null,
    attemptCount: 0,
    maxAttempts: 2,
    results: [],
    startTime: 0,
    exerciseStartTime: 0
  }),
  types: {} as {
    context: ExerciseMachineContext
    events: ExerciseMachineEvent
    input: ExerciseMachineInput
  },
  states: {
    idle: {
      on: {
        START: {
          target: 'instruction',
          actions: assign({
            exercises: ({ event }) => event.exercises,
            currentIndex: () => 0,
            currentExercise: ({ event }) => event.exercises[0] || null,
            attemptCount: () => 0,
            results: () => [],
            startTime: () => Date.now(),
            exerciseStartTime: () => Date.now()
          })
        }
      }
    },
    instruction: {
      after: {
        2000: { target: 'exercising' } // Show instruction for 2 seconds
      }
    },
    exercising: {
      on: {
        SUBMIT_ANSWER: {
          target: 'checking',
          actions: assign({
            attemptCount: ({ context }) => context.attemptCount + 1
          })
        }
      }
    },
    checking: {
      invoke: {
        id: 'checkAnswer',
        src: 'checkAnswer',
        input: ({ context, event }: { context: ExerciseMachineContext; event: ExerciseMachineEvent }, { input: machineInput }: { input: ExerciseMachineInput }) => ({ 
          context, 
          event, 
          onGrade: machineInput.onGrade 
        }),
        onDone: {
          target: 'feedback',
          actions: assign(({ context, event }) => {
            const result = event.output as { isCorrect: boolean; transcript?: string }
            const timeSpent = Date.now() - context.exerciseStartTime
            
            return {
              results: [
                ...context.results,
                {
                  exerciseId: context.currentExercise!.id,
                  word: context.currentExercise!.word,
                  isCorrect: result.isCorrect,
                  attempts: context.attemptCount,
                  userAnswer: result.transcript,
                  timeSpent
                }
              ]
            }
          })
        }
      }
    },
    feedback: {
      entry: ({ context }) => {
        const lastResult = context.results[context.results.length - 1]
        console.log('Result recorded:', lastResult)
      },
      always: [
        {
          target: 'complete',
          guard: ({ context }) => {
            const lastResult = context.results[context.results.length - 1]
            return lastResult.isCorrect && context.currentIndex === context.exercises.length - 1
          }
        }
      ],
      on: {
        RETRY: {
          target: 'exercising',
          guard: ({ context }) => {
            const lastResult = context.results[context.results.length - 1]
            return !lastResult.isCorrect && context.attemptCount < context.maxAttempts
          }
        },
        NEXT: [
          {
            target: 'instruction',
            guard: ({ context }) => context.currentIndex < context.exercises.length - 1,
            actions: assign(({ context }) => ({
              currentIndex: context.currentIndex + 1,
              currentExercise: context.exercises[context.currentIndex + 1],
              attemptCount: 0,
              exerciseStartTime: Date.now()
            }))
          },
          {
            target: 'complete'
          }
        ]
      }
    },
    complete: {
      type: 'final',
      entry: ({ context }, params: any) => {
        if (params && params.input && params.input.onComplete) {
          params.input.onComplete(context.results)
        }
      }
    }
  }
}).provide({
  actors: {
    checkAnswer: fromPromise(async ({ input }: { input: { context: ExerciseMachineContext; event: ExerciseMachineEvent; onGrade?: (expectedText: string, answer: Blob | string) => Promise<{ isCorrect: boolean; transcript?: string }> } }) => {
      const { context, event, onGrade } = input
      
      if (event.type !== 'SUBMIT_ANSWER' || !context.currentExercise) {
        return { isCorrect: false }
      }
      
      if (onGrade) {
        // For say-it-back exercises, grade against the full context (line)
        const expectedText = context.currentExercise.type === 'say-it-back' 
          ? context.currentExercise.context 
          : context.currentExercise.word
        return await onGrade(expectedText, event.answer)
      }
      
      // Default mock grading
      return { isCorrect: Math.random() > 0.5, transcript: 'Mock transcript' }
    })
  }
})

export const getExerciseProgress = (context: ExerciseMachineContext) => {
  const total = context.exercises.length
  const completed = context.results.filter(r => r.isCorrect).length
  const current = context.currentIndex + 1
  
  return {
    current,
    total,
    completed,
    percentage: total > 0 ? (completed / total) * 100 : 0
  }
}

export const shouldShowRetry = (context: ExerciseMachineContext): boolean => {
  if (context.results.length === 0) return false
  
  const lastResult = context.results[context.results.length - 1]
  return !lastResult.isCorrect && context.attemptCount < context.maxAttempts
}

export const getButtonText = (context: ExerciseMachineContext): string => {
  if (shouldShowRetry(context)) return 'Try Again'
  return context.currentIndex < context.exercises.length - 1 ? 'Next' : 'Complete'
}