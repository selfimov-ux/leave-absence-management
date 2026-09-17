import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { isAuthenticated, saveSession } from '../authStorage'
import PublicHeader from '../components/PublicHeader'
import { useLanguage } from '../i18n/LanguageContext'

function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useLanguage()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const successMessage = location.state?.passwordChanged
    ? t('password.successRelogin')
    : ''

  if (isAuthenticated()) {
    return <Navigate to="/dashboard" replace />
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    if (!username.trim()) {
      setError(t('login.missingUsername'))
      return
    }

    if (!password) {
      setError(t('login.missingPassword'))
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: username.trim(),
          password,
        }),
      })

      const data = await response.json().catch(() => null)

      if (!response.ok || !data?.token || !data?.user) {
        setError(t('login.invalid'))
        return
      }

      saveSession(data.token, data.user)
      setPassword('')
      navigate('/dashboard', { replace: true })
    } catch {
      setError(t('login.unavailable'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="page">
      <PublicHeader homeLink />

      <main className="auth-main">
        <section className="auth-card">
          <p className="eyebrow">{t('login.eyebrow')}</p>
          <h1>{t('login.title')}</h1>
          <p className="lead">{t('login.lead')}</p>

          {successMessage ? (
            <p className="form-success" role="status">
              {successMessage}
            </p>
          ) : null}

          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            <label htmlFor="username">{t('login.username')}</label>
            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              disabled={isLoading}
            />

            <label htmlFor="password">{t('login.password')}</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={isLoading}
            />

            {error ? (
              <p className="form-error" role="alert">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              className="btn-primary"
              disabled={isLoading}
            >
              {isLoading ? t('login.submitting') : t('common.login')}
            </button>
          </form>
        </section>
      </main>

      <footer className="footer">
        <p>{t('common.footer')}</p>
      </footer>
    </div>
  )
}

export default LoginPage
