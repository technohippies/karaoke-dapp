import { useState } from 'react'
import { CloseHeader } from './CloseHeader'
import { Spinner } from './ui/spinner'
import coachImage from '../assets/scarlett-right-128x128.png'

interface LineScore {
  line: number
  expected: string
  heard: string
  score: number
  issues: string[]
}

interface ScoringDetails {
  lines: LineScore[]
  overall_score: number
  pronunciation_patterns: string[]
  encouragement: string
}

export interface KaraokeCompletionProps {
  initialProgressState?: 'idle' | 'saving' | 'saved'
  hasTable?: boolean
  score?: number
  scoringDetails?: ScoringDetails
  transcript?: string
  songId?: string
  onClose: () => void
}

export function KaraokeCompletion({ 
  initialProgressState = 'idle', 
  hasTable = false, 
  score = 85,
  scoringDetails,
  transcript,
  songId,
  onClose
}: KaraokeCompletionProps) {
  const [progressState, setProgressState] = useState<'idle' | 'saving' | 'saved'>(initialProgressState)

  const getScoreMessage = () => {
    if (score >= 90) return "Excellent work!"
    if (score >= 80) return "Good job!"
    if (score >= 70) return "Keep practicing!"
    if (score >= 60) return "You're getting there!"
    return "Don't give up!"
  }

  const getActionMessage = () => {
    if (progressState === 'saved') return "Now you can study with exercises!"
    
    if (hasTable) {
      return "Save your progress!"
    } else {
      return "You can save your data to your own database that you own and control. This means you can import this data into other educational dapps!"
    }
  }

  const handleSaveProgress = () => {
    setProgressState('saving')
    // TODO: Create Tableland table + sync to blockchain (2 signatures)
  }

  const handlePractice = () => {
    // TODO: Navigate to exercises or call parent handler
    console.log('Navigate to exercises')
  }

  const getProgressContent = () => {
    switch (progressState) {
      case 'idle':
        return (
          <button
            onClick={handleSaveProgress}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors cursor-pointer"
          >
            Save Progress
          </button>
        )
      case 'saving':
        return (
          <button
            disabled
            className="w-full bg-neutral-600 text-white px-6 py-3 rounded-lg font-semibold cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Spinner size="sm" />
            Saving...
          </button>
        )
      case 'saved':
        return (
          <button
            onClick={handlePractice}
            className="w-full bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors cursor-pointer"
          >
            Study
          </button>
        )
    }
  }

  return (
    <div className="min-h-screen bg-neutral-900 relative overflow-hidden">
      <div className="relative z-10 h-screen flex flex-col">
        <CloseHeader onClose={onClose} />
        
        <div className="flex-1 overflow-y-auto">
          <div className="w-full max-w-2xl mx-auto px-6 pt-8 pb-24 flex items-center justify-center min-h-full">
            <div className="text-center">
              <h1 className="text-4xl font-bold text-white mb-8">Score</h1>
              
              <div className="text-6xl font-bold text-white mb-8">
                {score}
              </div>

              {/* Coach feedback */}
              <div className="flex gap-4 w-full max-w-lg mb-8">
                <div className="w-16 h-16 bg-neutral-700 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
                  <img src={coachImage} alt="Coach" className="w-full h-full object-cover" />
                </div>
                <div className="bg-neutral-800 px-4 py-3 rounded-lg w-96">
                  <p className="text-lg text-neutral-300 text-left">
                    {scoringDetails?.encouragement || getScoreMessage()}
                  </p>
                  {getActionMessage() && (
                    <p className="text-lg text-neutral-400 text-left mt-2">
                      {getActionMessage()}
                    </p>
                  )}
                </div>
              </div>

              {/* Line-by-line scores */}
              {scoringDetails?.lines && scoringDetails.lines.length > 0 && (
                <div className="w-full max-w-2xl mx-auto mt-8">
                  <h2 className="text-xl font-semibold text-white mb-4">Line by Line Score</h2>
                  <div className="space-y-3">
                    {scoringDetails.lines.map((line) => (
                      <div key={line.line} className="bg-neutral-800 rounded-lg p-4 text-left">
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-sm text-neutral-400">Line {line.line}</span>
                          <span className={`text-lg font-semibold ${
                            line.score >= 90 ? 'text-green-400' :
                            line.score >= 70 ? 'text-yellow-400' :
                            'text-red-400'
                          }`}>
                            {line.score}
                          </span>
                        </div>
                        <div className="text-sm text-neutral-300 mb-1">
                          <span className="text-neutral-500">Expected: </span>
                          {line.expected}
                        </div>
                        <div className="text-sm text-neutral-300 mb-2">
                          <span className="text-neutral-500">Heard: </span>
                          {line.heard || '(no words detected)'}
                        </div>
                        {line.issues.length > 0 && (
                          <div className="text-xs text-neutral-500">
                            Issues: {line.issues.join(', ')}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Pronunciation patterns */}
                  {scoringDetails.pronunciation_patterns && scoringDetails.pronunciation_patterns.length > 0 && (
                    <div className="mt-6 bg-neutral-800 rounded-lg p-4">
                      <h3 className="text-sm font-semibold text-white mb-2">Areas to Practice</h3>
                      <div className="flex flex-wrap gap-2">
                        {scoringDetails.pronunciation_patterns.map((pattern, idx) => (
                          <span key={idx} className="text-xs bg-neutral-700 px-2 py-1 rounded">
                            {pattern}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sticky footer with action button */}
        <div className="fixed bottom-0 left-0 right-0 bg-neutral-900/95 backdrop-blur-sm border-t border-neutral-700 z-20">
          <div className="w-full max-w-2xl mx-auto px-6 py-4">
            {getProgressContent()}
          </div>
        </div>
      </div>
    </div>
  )
}