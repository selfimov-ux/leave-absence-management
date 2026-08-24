import { Link } from 'react-router-dom'
import { useLanguage } from '../i18n/LanguageContext'
import LanguageSwitcher from './LanguageSwitcher'

function PublicHeader({ homeLink = false, actions = null }) {
  const { t } = useLanguage()
  const brand = (
    <>
      <span className="brand-mark" aria-hidden="true">
        UA
      </span>
      <span className="brand-name">{t('brand')}</span>
    </>
  )

  return (
    <header className="header">
      <div className="header-inner">
        {homeLink ? (
          <Link to="/" className="brand brand-link">
            {brand}
          </Link>
        ) : (
          <div className="brand">{brand}</div>
        )}
        <div className="header-actions">
          <LanguageSwitcher />
          {actions}
        </div>
      </div>
    </header>
  )
}

export default PublicHeader
