import { motion } from 'framer-motion'

export interface SayItBackProps {
  line: string  // The full line to say back
  transcript?: string  // The transcript from recording
  isCorrect: boolean | null
}

export function SayItBack({
  line,
  transcript,
  isCorrect: _isCorrect
}: SayItBackProps) {
  // Only log when transcript changes from undefined to a value
  const shouldShowTranscript = transcript && transcript.trim() && transcript.trim().length > 0
  
  return (
    <div className="space-y-8">
      {/* Just show the line */}
      <p className="text-2xl leading-relaxed text-white">
        {line}
      </p>

      {/* Show transcript after recording only if it's not empty */}
      {shouldShowTranscript && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2"
        >
          <p className="text-sm text-neutral-400">You said:</p>
          <p className="text-lg text-white">{transcript}</p>
        </motion.div>
      )}
    </div>
  )
}