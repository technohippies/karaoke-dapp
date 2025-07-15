import { CheckCircle, XCircle } from '@phosphor-icons/react'

export interface ExerciseFooterProps {
  isCorrect: boolean | null
  onNext: () => void
}

export function ExerciseFooter({
  isCorrect,
  onNext
}: ExerciseFooterProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-neutral-700 border-t border-neutral-600 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between">
          {isCorrect !== null && (
            <div>
              {isCorrect ? (
                <CheckCircle
                  size={48}
                  weight="fill"
                  className="text-green-500"
                />
              ) : (
                <XCircle
                  size={48}
                  weight="fill"
                  className="text-red-500"
                />
              )}
            </div>
          )}
          
          <button
            onClick={onNext}
            className="px-6 py-3 rounded-lg font-semibold text-white transition-colors bg-blue-600 hover:bg-blue-700"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  )
}