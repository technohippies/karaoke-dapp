import React from 'react'
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
  return (
    <BottomSheet
      trigger={trigger}
      title={englishLyric}
      open={open}
      onOpenChange={onOpenChange}
    >
      <div className="space-y-12 pt-6">
        {/* Translation Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <Translate weight="duotone" size={28} color="#9CA3AF" />
            <h3 className="text-lg font-semibold text-white">翻译</h3>
          </div>
          <p className="text-neutral-300 leading-relaxed">
            {translation}
          </p>
        </div>

        {/* Meaning Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <Lightbulb weight="duotone" size={28} color="#9CA3AF" />
            <h3 className="text-lg font-semibold text-white">含义</h3>
          </div>
          <p className="text-neutral-300 leading-relaxed">
            {meaning}
          </p>
        </div>

        {/* Grammar Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <BookOpen weight="duotone" size={28} color="#9CA3AF" />
            <h3 className="text-lg font-semibold text-white">语法</h3>
          </div>
          <p className="text-neutral-300 leading-relaxed">
            {grammar}
          </p>
        </div>
      </div>
    </BottomSheet>
  )
}