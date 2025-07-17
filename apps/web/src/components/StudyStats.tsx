
interface StudyStatsProps {
  newCount: number
  learningCount: number
  dueCount: number
  onStudy: () => void
}

export function StudyStats({ newCount, learningCount, dueCount, onStudy }: StudyStatsProps) {
  return (
    <div className="w-full">
      {/* Stats row */}
      <div className="flex gap-4 mb-6">
        <div className="flex-1 bg-neutral-800 rounded-lg p-6 text-center border border-neutral-700">
          <div className="text-2xl font-bold text-white">{newCount}</div>
          <div className="text-neutral-400 text-sm font-medium mt-2">NEW</div>
        </div>
        
        <div className="flex-1 bg-neutral-800 rounded-lg p-6 text-center border border-neutral-700">
          <div className="text-2xl font-bold text-white">{learningCount}</div>
          <div className="text-neutral-400 text-sm font-medium mt-2">LEARNING</div>
        </div>
        
        <div className="flex-1 bg-neutral-800 rounded-lg p-6 text-center border border-neutral-700">
          <div className="text-2xl font-bold text-white">{dueCount}</div>
          <div className="text-neutral-400 text-sm font-medium mt-2">DUE</div>
        </div>
      </div>
      
      {/* Study button */}
      <button
        onClick={onStudy}
        disabled={dueCount === 0}
        className={`w-full px-6 py-3 rounded-lg font-semibold transition-colors ${
          dueCount === 0 
            ? 'bg-neutral-700 text-neutral-400 cursor-not-allowed' 
            : 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer'
        }`}
      >
        {dueCount === 0 ? 'All Caught Up!' : 'Study'}
      </button>
    </div>
  )
}