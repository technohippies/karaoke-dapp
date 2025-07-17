import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

// Import translation files
import en from './locales/en/translation.json'
import zh from './locales/zh/translation.json'
import ug from './locales/ug/translation.json'
import bo from './locales/bo/translation.json'

const resources = {
  en: { translation: en },
  zh: { translation: zh },
  'zh-CN': { translation: zh }, // Support both zh and zh-CN
  'zh-TW': { translation: zh }, // Support zh-TW as well
  ug: { translation: ug },
  bo: { translation: bo }
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    // Remove hardcoded lng to allow auto-detection
    
    interpolation: {
      escapeValue: false // React already escapes values
    },
    
    detection: {
      order: ['navigator', 'localStorage', 'htmlTag'],
      caches: ['localStorage'],
      lookupFromNavigator: true,
      // Convert zh-CN to zh
      convertDetectedLanguage: (lng) => {
        const primaryLang = lng.split('-')[0]
        console.log('🌐 Converting detected language:', lng, '->', primaryLang)
        return primaryLang
      }
    },
    
    // Ensure all languages are loaded
    supportedLngs: ['en', 'zh', 'ug', 'bo'],
    load: 'languageOnly', // This will treat zh-CN as zh
    
    debug: true // Enable debug mode to see language detection logs
  })

export default i18n