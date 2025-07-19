
export interface SayItBackProps {
  line: string
  transcript?: string
  isCorrect: boolean | null
}

export function SayItBack({ line, transcript }: SayItBackProps) {
  return (
    <div className="space-y-6">
      {/* Target text to repeat */}
      <div className="text-left">
        <div className="text-2xl font-medium text-white leading-relaxed">
          {line}
        </div>
      </div>
      
      {/* Show transcript and feedback if available */}
      {transcript && (
        <div className="text-left">
          <div className="text-neutral-400 mb-2">You said:</div>
          <div className="text-lg text-white">{transcript}</div>
        </div>
      )}
    </div>
  )
}