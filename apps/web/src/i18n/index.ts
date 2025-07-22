import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

// Simple language resources for the app UI (not song lyrics)
const resources = {
  en: {
    translation: {
      loading: 'Loading...',
      lyrics: 'Lyrics',
      translation: 'Translation',
      original: 'Original',
      language: 'Language'
    }
  },
  zh: {
    translation: {
      loading: '加载中...',
      lyrics: '歌词',
      translation: '翻译',
      original: '原文',
      language: '语言'
    }
  },
  bo: {
    translation: {
      loading: 'སྐར་མ་ཅིག...',
      lyrics: 'གླུ་གཞས།',
      translation: 'སྒྱུར་བསྒྱུར།',
      original: 'རང་བཞིན།',
      language: 'སྐད་ཡིག'
    }
  },
  ug: {
    translation: {
      loading: 'يۈكلەۋاتىدۇ...',
      lyrics: 'ناخشا سۆزلىرى',
      translation: 'تەرجىمە',
      original: 'ئەسلى',
      language: 'تىل'
    }
  }
}

// Configure supported languages for your market
const supportedLanguages = ['en', 'zh', 'bo', 'ug']

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'zh', // Default to Chinese for Chinese/Tibetan/Uyghur speakers learning English
    supportedLngs: supportedLanguages,
    
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng'
    },

    interpolation: {
      escapeValue: false
    }
  })

export default i18n

// Helper to get detected language for lyrics
export function getDetectedLanguage(): string {
  const detected = i18n.language || 'zh'
  
  // Map browser languages to your supported translations
  const languageMap: Record<string, string> = {
    'zh': 'zh',
    'zh-CN': 'zh',
    'zh-TW': 'zh',
    'zh-HK': 'zh',
    'bo': 'bo',
    'bo-CN': 'bo',
    'bo-IN': 'bo',
    'ug': 'ug',
    'ug-CN': 'ug'
  }
  
  // Default to Chinese for this market (Chinese/Tibetan/Uyghur speakers learning English)
  return languageMap[detected] || languageMap[detected.split('-')[0]] || 'zh'
}