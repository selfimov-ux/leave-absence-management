import { useLanguage } from '../i18n/LanguageContext'

function LanguageSwitcher() {
  const { language, setLanguage, t } = useLanguage()

  return (
    <div className="lang-switcher" role="group" aria-label={t('language.label')}>
      <button
        type="button"
        className={language === 'de' ? 'lang-btn is-active' : 'lang-btn'}
        onClick={() => setLanguage('de')}
      >
        DE
      </button>
      <button
        type="button"
        className={language === 'en' ? 'lang-btn is-active' : 'lang-btn'}
        onClick={() => setLanguage('en')}
      >
        EN
      </button>
    </div>
  )
}

export default LanguageSwitcher
