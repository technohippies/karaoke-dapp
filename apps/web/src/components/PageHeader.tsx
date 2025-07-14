import React from 'react'
import { CaretLeft, X } from '@phosphor-icons/react'

interface PageHeaderProps {
  title?: string
  onBack?: () => void
  onClose?: () => void
  rightIcon?: React.ReactNode
  onRightAction?: () => void
}

export function PageHeader({ 
  title,
  onBack,
  onClose,
  rightIcon,
  onRightAction
}: PageHeaderProps) {
  return (
    <header className="w-full bg-neutral-900 border-b border-neutral-700 px-6 py-4 h-16">
      <div className="flex items-center justify-between h-full">
        {/* Left section - Back or Close button */}
        <div className="flex items-center w-8">
          {onBack && (
            <button
              onClick={onBack}
              className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              <CaretLeft size={20} color="#d4d4d8" />
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              <X size={20} color="#d4d4d8" />
            </button>
          )}
        </div>

        {/* Center section - Title */}
        <div className="flex-1 flex justify-center">
          {title && (
            <h1 className="text-white font-semibold text-base truncate whitespace-nowrap max-w-xs">
              {title}
            </h1>
          )}
        </div>

        {/* Right section - Optional action */}
        <div className="flex items-center w-8">
          {rightIcon && (
            <button
              onClick={onRightAction}
              className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              {rightIcon}
            </button>
          )}
        </div>
      </div>
    </header>
  )
}