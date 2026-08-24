const LANGUAGE_KEY = 'appLanguage'

export function getStoredLanguage() {
  return localStorage.getItem(LANGUAGE_KEY) === 'en' ? 'en' : 'de'
}

export function storeLanguage(language) {
  localStorage.setItem(LANGUAGE_KEY, language === 'en' ? 'en' : 'de')
}
