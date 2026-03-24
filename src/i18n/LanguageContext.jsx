import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES, messages } from './messages'

const LANGUAGE_STORAGE_KEY = 'site_language_v1'

const LanguageContext = createContext({
  language: DEFAULT_LANGUAGE,
  setLanguage: () => {},
  languages: SUPPORTED_LANGUAGES,
  t: (key, fallback = '', values = {}) => {
    const template = fallback || key
    return template.replace(/\{(\w+)\}/g, (_full, token) => String(values?.[token] ?? ''))
  }
})

const readMessage = (lang, key) => {
  const catalog = messages[lang]
  if (!catalog) return undefined
  return key.split('.').reduce((cursor, part) => {
    if (!cursor || typeof cursor !== 'object') return undefined
    return cursor[part]
  }, catalog)
}

const interpolate = (value, values = {}) => {
  return String(value).replace(/\{(\w+)\}/g, (_full, token) => String(values?.[token] ?? ''))
}

export const LanguageProvider = ({ children }) => {
  const [language, setLanguageState] = useState(() => {
    const stored = String(localStorage.getItem(LANGUAGE_STORAGE_KEY) || '').trim().toLowerCase()
    return messages[stored] ? stored : DEFAULT_LANGUAGE
  })

  const setLanguage = useCallback((nextLanguage) => {
    const normalized = String(nextLanguage || '').trim().toLowerCase()
    if (!messages[normalized]) return
    setLanguageState(normalized)
  }, [])

  useEffect(() => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language)
    document.documentElement.setAttribute('lang', language)
  }, [language])

  const t = useCallback((key, fallback = '', values = {}) => {
    const localized = readMessage(language, key)
    const english = readMessage(DEFAULT_LANGUAGE, key)
    const template = localized ?? english ?? fallback ?? key
    return interpolate(template, values)
  }, [language])

  const value = useMemo(() => ({
    language,
    setLanguage,
    languages: SUPPORTED_LANGUAGES,
    t
  }), [language, setLanguage, t])

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  )
}

export const useI18n = () => useContext(LanguageContext)
