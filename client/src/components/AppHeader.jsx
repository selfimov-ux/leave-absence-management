import { Link, useNavigate } from 'react-router-dom'
import { clearSession, getRoleLabel, getUser } from '../authStorage'

function AppHeader() {
  const navigate = useNavigate()
  const user = getUser()
  const fullName = user ? `${user.firstName} ${user.lastName}` : ''
  const roleLabel = user ? getRoleLabel(user.role) : ''

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
          <span className="brand-name">Urlaubsverwaltung</span>
        </Link>
        <div className="header-user">
          <div className="header-user-text">
            <strong>{fullName}</strong>
            <span>{roleLabel}</span>
          </div>
          <button type="button" className="btn-login" onClick={handleLogout}>
            Abmelden
          </button>
        </div>
      </div>
    </header>
  )
}

export default AppHeader
