
import { useTranslation } from 'react-i18next'

interface StudyStatsProps {
  newCount: number
  learningCount: number
  dueCount: number
  onStudy: () => void
}

export function StudyStats({ newCount, learningCount, dueCount, onStudy }: StudyStatsProps) {
  const { t } = useTranslation()
  const hasNoCards = newCount === 0 && learningCount === 0 && dueCount === 0
  
  // Don't render anything if there are no cards
  if (hasNoCards) {
    return null
  }
  
  return (
    <div className="w-full">
      {/* Title */}
      <h2 className="text-2xl font-bold text-white mb-6">{t('home.yourFlashcards')}</h2>
      
      {/* Stats row */}
      <div className="flex gap-4 mb-6">
        <div className="flex-1 bg-neutral-800 rounded-lg p-6 text-center border border-neutral-700">
          <div className="text-2xl font-bold text-white">{newCount}</div>
          <div className="text-neutral-400 text-sm font-medium mt-2">{t('home.study.new')}</div>
        </div>
        
        <div className="flex-1 bg-neutral-800 rounded-lg p-6 text-center border border-neutral-700">
          <div className="text-2xl font-bold text-white">{learningCount}</div>
          <div className="text-neutral-400 text-sm font-medium mt-2">{t('home.study.learning')}</div>
        </div>
        
        <div className="flex-1 bg-neutral-800 rounded-lg p-6 text-center border border-neutral-700">
          <div className="text-2xl font-bold text-white">{dueCount}</div>
          <div className="text-neutral-400 text-sm font-medium mt-2">{t('home.study.due')}</div>
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
        {dueCount === 0 ? t('home.study.allCaughtUp') : t('home.study.studyButton')}
      </button>
    </div>
  )
}