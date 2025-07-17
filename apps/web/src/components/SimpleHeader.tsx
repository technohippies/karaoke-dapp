import { X } from '@phosphor-icons/react'
import { IconButton } from './IconButton'
import { useNavigate } from 'react-router-dom'
import { LanguageSelector } from './LanguageSelector'

interface SimpleHeaderProps {
  onBack?: () => void
}

export function SimpleHeader({ onBack }: SimpleHeaderProps) {
  const navigate = useNavigate()
  
  const handleBack = () => {
    if (onBack) {
      onBack()
    } else {
      navigate(-1) // Go to previous page in history
    }
  }
  
  return (
    <div className="fixed top-0 left-0 right-0 z-10 bg-neutral-900/95 backdrop-blur-sm border-b border-neutral-700">
      <div className="flex items-center justify-between p-4">
        <IconButton variant="ghost" onClick={handleBack}>
          <X size={24} weight="bold" />
        </IconButton>
        <LanguageSelector />
      </div>
    </div>
  )
}