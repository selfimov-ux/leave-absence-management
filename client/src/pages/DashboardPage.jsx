import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  clearSession,
  getRoleLabel,
  getToken,
  getUser,
  saveSession,
} from '../authStorage'

function getDashboardCards(role) {
  if (role === 'MANAGER') {
    return [
      {
        title: 'Anträge meiner Abteilung',
        text: 'Urlaubsanträge der eigenen Abteilung prüfen. Die Bearbeitung folgt in einer späteren Phase.',
      },
      {
        title: 'Abwesenheiten der Abteilung',
        text: 'Krankmeldungen und Pflegezeiten der Abteilung einsehen. Die Bearbeitung folgt in einer späteren Phase.',
      },
    ]
  }

  if (role === 'ADMINISTRATOR') {
    return [
      {
        title: 'Mitarbeiterverwaltung',
        text: 'Mitarbeiterkonten und Stammdaten verwalten. Die Bearbeitung folgt in einer späteren Phase.',
      },
      {
        title: 'Abteilungsverwaltung',
        text: 'Abteilungen und Zuständigkeiten pflegen. Die Bearbeitung folgt in einer späteren Phase.',
      },
      {
        title: 'Berichte',
        text: 'Übersichten zu Urlaub und Abwesenheiten erstellen. Die Bearbeitung folgt in einer späteren Phase.',
      },
    ]
  }

  return [
    {
      title: 'Meine Urlaubsanträge',
      text: 'Eigene Urlaubsanträge einreichen und einsehen. Die Bearbeitung folgt in einer späteren Phase.',
    },
    {
      title: 'Meine Krankmeldungen',
      text: 'Krankmeldungen erfassen und nachverfolgen. Die Bearbeitung folgt in einer späteren Phase.',
    },
    {
      title: 'Verbleibender Urlaub',
      text: 'Verbleibendes Urlaubsguthaben anzeigen. Die Bearbeitung folgt in einer späteren Phase.',
    },
  ]
}

function DashboardPage() {
  const navigate = useNavigate()
  const [user, setUser] = useState(getUser())
  const [statusMessage, setStatusMessage] = useState('Sitzung wird geprüft…')

  const cards = useMemo(
    () => getDashboardCards(user?.role),
    [user?.role]
  )

  useEffect(() => {
    const token = getToken()

    if (!token) {
      clearSession()
      navigate('/login', { replace: true })
      return
    }

    let cancelled = false

    async function loadCurrentUser() {
      try {
        const response = await fetch('/api/auth/me', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (!response.ok) {
          clearSession()
          navigate('/login', { replace: true })
          return
        }

        const data = await response.json()
        if (!cancelled && data.user) {
          saveSession(token, data.user)
          setUser(data.user)
          setStatusMessage('')
        }
      } catch {
        if (!cancelled) {
          setStatusMessage(
            'Die Sitzung konnte nicht geprüft werden. Die gespeicherten Daten werden angezeigt.'
          )
        }
      }
    }

    loadCurrentUser()

    return () => {
      cancelled = true
    }
  }, [navigate])

  function handleLogout() {
    clearSession()
    navigate('/', { replace: true })
  }

  if (!user) {
    return null
  }

  const fullName = `${user.firstName} ${user.lastName}`
  const roleLabel = getRoleLabel(user.role)

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

      <main>
        <section className="hero dashboard-hero">
          <p className="eyebrow">Übersicht</p>
          <h1>Willkommen, {fullName}</h1>
          <p className="lead">
            Angemeldet als {roleLabel}. Die folgenden Bereiche sind Platzhalter
            für spätere Funktionen.
          </p>
          {statusMessage ? <p className="status-note">{statusMessage}</p> : null}
        </section>

        <section className="roles" aria-label="Dashboardbereiche">
          <div className="cards">
            {cards.map((card) => (
              <article className="card" key={card.title}>
                <span className="card-label">Bereich</span>
                <h3>{card.title}</h3>
                <p>{card.text}</p>
              </article>
            ))}
          </div>
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

export default DashboardPage
