import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { translations } from './translations'
import { getStoredLanguage, storeLanguage } from './languageStorage'

const LanguageContext = createContext(null)

function lookup(dictionary, key) {
  return key.split('.').reduce((value, part) => {
    if (value && typeof value === 'object') {
      return value[part]
    }
    return undefined
  }, dictionary)
}

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(getStoredLanguage)

  useEffect(() => {
    document.documentElement.lang = language
    document.title = translations[language].meta.documentTitle
  }, [language])

  const value = useMemo(() => {
    function t(key, vars) {
      const template = lookup(translations[language], key)
      const fallback = lookup(translations.de, key)
      const text = typeof template === 'string' ? template : fallback
      if (typeof text !== 'string') {
        return key
      }
      if (!vars) {
        return text
      }
      return text.replace(/\{(\w+)\}/g, (_, name) =>
        vars[name] === undefined || vars[name] === null ? '' : String(vars[name])
      )
    }

    function setLanguage(next) {
      const resolved = next === 'en' ? 'en' : 'de'
      storeLanguage(resolved)
      setLanguageState(resolved)
    }

    return { language, setLanguage, t }
  }, [language])

  return (
    <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider')
  }
  return context
}
