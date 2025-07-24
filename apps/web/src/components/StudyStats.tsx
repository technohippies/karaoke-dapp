
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
  // In Anki, you can only study NEW cards or cards that are due
  // Learning cards that aren't due yet cannot be studied
  const canStudy = newCount > 0 || dueCount > 0
  
  return (
    <div className="w-full">
      {/* Title */}
      <h2 className="text-2xl font-bold text-white mb-4">{t('home.yourFlashcards')}</h2>
      
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="bg-neutral-900 rounded-lg p-6 text-center border border-neutral-800">
          <div className="text-2xl font-bold text-white">{newCount}</div>
          <div className="text-neutral-400 text-sm font-medium mt-2">{t('home.study.new')}</div>
        </div>
        
        <div className="bg-neutral-900 rounded-lg p-6 text-center border border-neutral-800">
          <div className="text-2xl font-bold text-white">{learningCount}</div>
          <div className="text-neutral-400 text-sm font-medium mt-2">{t('home.study.learning')}</div>
        </div>
        
        <div className="bg-neutral-900 rounded-lg p-6 text-center border border-neutral-800">
          <div className="text-2xl font-bold text-white">{dueCount}</div>
          <div className="text-neutral-400 text-sm font-medium mt-2">{t('home.study.due')}</div>
        </div>
      </div>
      
      {/* Study button */}
      <button
        onClick={onStudy}
        disabled={hasNoCards || !canStudy}
        className={`w-full px-6 py-3 rounded-lg font-semibold transition-colors ${
          hasNoCards || !canStudy 
            ? 'bg-neutral-700 text-neutral-400 cursor-not-allowed' 
            : 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer'
        }`}
      >
        {hasNoCards ? t('home.study.singKaraokeToAdd') : 
         !canStudy ? t('home.study.allCaughtUp') : 
         t('home.study.studyButton')}
      </button>
    </div>
  )
}