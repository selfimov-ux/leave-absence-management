import { Link, useNavigate } from 'react-router-dom'
import { clearSession, getUser } from '../authStorage'
import { useLanguage } from '../i18n/LanguageContext'
import { getRoleLabel } from '../leaveLabels'
import LanguageSwitcher from './LanguageSwitcher'

function AppHeader() {
  const navigate = useNavigate()
  const user = getUser()
  const { t } = useLanguage()
  const fullName = user ? `${user.firstName} ${user.lastName}` : ''
  const roleLabel = user ? getRoleLabel(user.role, t) : ''

  function handleLogout() {
    clearSession()
    navigate('/', { replace: true })
  }

  return (
    <header className="header">
      <div className="header-inner">
        <Link to="/dashboard" className="brand brand-link">
          <span className="brand-mark" aria-hidden="true">
            UA
          </span>
          <span className="brand-name">{t('brand')}</span>
        </Link>
        <div className="header-user">
          <LanguageSwitcher />
          <div className="header-user-text">
            <strong>{fullName}</strong>
            <span>{roleLabel}</span>
          </div>
          <Link to="/change-password" className="btn-login">
            {t('password.change')}
          </Link>
          <button type="button" className="btn-login" onClick={handleLogout}>
            {t('common.logout')}
          </button>
        </div>
      </div>
    </header>
  )
}

export default AppHeader
