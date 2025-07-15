import { SayItBack } from '../types/SayItBack'

export interface ExerciseContainerProps {
  line: string
  transcript?: string
  isCorrect?: boolean | null
}

export function ExerciseContainer({
  line,
  transcript,
  isCorrect = null
}: ExerciseContainerProps) {
  return (
    <div className="flex-1 bg-neutral-950 text-white flex flex-col">
      <div className="flex-1 flex items-start justify-center p-8 pt-16">
        <div className="max-w-2xl w-full">
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-white">Say it back:</h2>
            <SayItBack
              line={line}
              transcript={transcript}
              isCorrect={isCorrect}
            />
          </div>
        </div>
      </div>
    </div>
  )
}