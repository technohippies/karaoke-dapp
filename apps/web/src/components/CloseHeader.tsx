import { X } from '@phosphor-icons/react'
import { IconButton } from './IconButton'

export interface CloseHeaderProps {
  onClose: () => void
}

export function CloseHeader({ onClose }: CloseHeaderProps) {
  return (
    <header className="w-full bg-neutral-900 border-b border-neutral-700 h-16">
      <div className="w-full max-w-2xl mx-auto px-6 py-4 flex items-center justify-between h-full">
        {/* Left side - Close button */}
        <div className="flex items-center gap-4">
          <IconButton variant="ghost" onClick={onClose}>
            <X size={20} weight="regular" />
          </IconButton>
        </div>

        {/* Right side - empty to match header structure */}
        <div></div>
      </div>
    </header>
  )
}