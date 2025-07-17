import { useState, useRef, useEffect } from 'react'
import { Globe } from '@phosphor-icons/react'
import { useTranslation } from 'react-i18next'
import { IconButton } from './IconButton'

const languages = [
  { code: 'en', name: 'English' },
  { code: 'zh', name: '中文' },
  { code: 'ug', name: 'ئۇيغۇرچە' },
  { code: 'bo', name: 'བོད་སྐད' }
]

export function LanguageSelector() {
  const { i18n } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLanguageChange = (langCode: string) => {
    i18n.changeLanguage(langCode)
    setIsOpen(false)
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <IconButton 
        variant="ghost" 
        onClick={() => setIsOpen(!isOpen)}
      >
        <Globe size={20} />
      </IconButton>
      
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-neutral-800 border border-neutral-700 rounded-lg shadow-lg z-50">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleLanguageChange(lang.code)}
              className={`w-full text-left px-4 py-2 hover:bg-neutral-700 transition-colors first:rounded-t-lg last:rounded-b-lg ${
                i18n.language === lang.code ? 'bg-neutral-700' : ''
              }`}
            >
              <span className="text-white">{lang.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}