import React from 'react'
import { useTranslation } from 'react-i18next'
import { BottomSheet } from './BottomSheet'
import { Translate, Lightbulb, BookOpen } from '@phosphor-icons/react'

interface LyricsSheetProps {
  trigger: React.ReactNode
  englishLyric: string
  translation: string
  meaning: string
  grammar: string
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function LyricsSheet({
  trigger,
  englishLyric,
  translation,
  meaning,
  grammar,
  open,
  onOpenChange,
}: LyricsSheetProps) {
  const { t } = useTranslation()
  
  return (
    <BottomSheet
      trigger={trigger}
      title={englishLyric}
      open={open}
      onOpenChange={onOpenChange}
    >
      <div className="space-y-12 pt-6">
        {/* Meaning Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <Lightbulb weight="duotone" size={28} color="#9CA3AF" />
            <h3 className="text-lg font-semibold text-white">{t('song.lyricsMeaning.meaning')}</h3>
          </div>
          <p className="text-neutral-300 leading-relaxed">
            {meaning || <span className="text-neutral-400 italic">即将推出</span>}
          </p>
        </div>

        {/* Grammar Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <BookOpen weight="duotone" size={28} color="#9CA3AF" />
            <h3 className="text-lg font-semibold text-white">{t('song.lyricsMeaning.grammar')}</h3>
          </div>
          <p className="text-neutral-300 leading-relaxed">
            {grammar || <span className="text-neutral-400 italic">即将推出</span>}
          </p>
        </div>
      </div>
    </BottomSheet>
  )
}