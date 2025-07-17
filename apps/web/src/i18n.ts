import i18n from './i18n/config'

export function getDetectedLanguage(): string {
  return i18n.language || 'en'
}

export default i18n