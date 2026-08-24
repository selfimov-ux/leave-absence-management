import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { isAuthenticated, saveSession } from '../authStorage'

function LoginPage() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  if (isAuthenticated()) {
    return <Navigate to="/dashboard" replace />
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    if (!username.trim()) {
      setError('Bitte geben Sie Ihren Benutzernamen ein.')
      return
    }

    if (!password) {
      setError('Bitte geben Sie Ihr Passwort ein.')
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
        setError(
          data?.message ||
            'Benutzername oder Passwort ist ungültig.'
        )
        return
      }

      saveSession(data.token, data.user)
      navigate('/dashboard', { replace: true })
    } catch {
      setError(
        'Die Anmeldung ist derzeit nicht möglich. Bitte versuchen Sie es später erneut.'
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="page">
      <header className="header">
        <div className="header-inner">
          <Link to="/" className="brand brand-link">
            <span className="brand-mark" aria-hidden="true">
              UA
            </span>
            <span className="brand-name">Urlaubsverwaltung</span>
          </Link>
        </div>
      </header>

      <main className="auth-main">
        <section className="auth-card">
          <p className="eyebrow">Anmeldung</p>
          <h1>Anmelden</h1>
          <p className="lead">
            Melden Sie sich mit Ihrem Benutzernamen und Passwort an.
          </p>

          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            <label htmlFor="username">Benutzername</label>
            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              disabled={isLoading}
            />

            <label htmlFor="password">Passwort</label>
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
              {isLoading ? 'Anmeldung läuft…' : 'Anmelden'}
            </button>
          </form>
        </section>
      </main>

      <footer className="footer">
        <p>
          System zur Verwaltung von Urlauben und Abwesenheiten · Bachelorarbeit
        </p>
      </footer>
    </div>
  )
}

export default LoginPage
