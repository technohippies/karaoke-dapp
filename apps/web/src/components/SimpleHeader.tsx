import { X } from '@phosphor-icons/react'
import { IconButton } from './IconButton'
import { useNavigate } from 'react-router-dom'
import { LanguageSelector } from './LanguageSelector'

interface SimpleHeaderProps {
  onBack?: () => void
  hideLanguageSelector?: boolean
}

export function SimpleHeader({ onBack, hideLanguageSelector = false }: SimpleHeaderProps) {
  const navigate = useNavigate()
  
  const handleBack = () => {
    if (onBack) {
      onBack()
    } else {
      // Simple approach: if we can go back and document referrer is from same origin, go back
      // Otherwise go home (direct visit or external referrer)
      const canGoBack = window.history.length > 1
      const isInternalReferrer = document.referrer && new URL(document.referrer).origin === window.location.origin
      
      if (canGoBack && isInternalReferrer) {
        navigate(-1)
      } else {
        navigate('/')
      }
    }
  }
  
  return (
    <div className="fixed top-0 left-0 right-0 z-10 bg-neutral-900/95 backdrop-blur-sm border-b border-neutral-700 h-16">
      <div className="w-full max-w-2xl mx-auto px-6 py-4 flex items-center justify-between h-full">
        <div className="flex items-center gap-4">
          <IconButton variant="ghost" onClick={handleBack}>
            <X size={24} weight="bold" />
          </IconButton>
        </div>
        {!hideLanguageSelector && <LanguageSelector />}
      </div>
    </div>
  )
}