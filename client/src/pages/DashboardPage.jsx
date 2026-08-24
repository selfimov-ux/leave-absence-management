import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AppHeader from '../components/AppHeader'
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
        text: 'Mitarbeiterkonten und Stammdaten anlegen und bearbeiten.',
        to: '/admin/employees',
      },
      {
        title: 'Abteilungsverwaltung',
        text: 'Abteilungen und Zuständigkeiten pflegen.',
        to: '/admin/departments',
      },
      {
        title: 'Urlaubsartenverwaltung',
        text: 'Urlaubsarten anlegen, bearbeiten und aktiv oder inaktiv setzen.',
        to: '/admin/leave-types',
      },
      {
        title: 'Berichte',
        text: 'Übersichten zu Urlaub und Abwesenheiten. Die Auswertung folgt in einer späteren Phase.',
        to: '/admin/reports',
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

  if (!user) {
    return null
  }

  const fullName = `${user.firstName} ${user.lastName}`
  const roleLabel = getRoleLabel(user.role)

  return (
    <div className="page">
      <AppHeader />
      <main>
        <section className="hero dashboard-hero">
          <p className="eyebrow">Übersicht</p>
          <h1>Willkommen, {fullName}</h1>
          <p className="lead">
            Angemeldet als {roleLabel}.
            {user.role === 'ADMINISTRATOR'
              ? ' Wählen Sie einen Verwaltungsbereich.'
              : ' Die folgenden Bereiche sind Platzhalter für spätere Funktionen.'}
          </p>
          {statusMessage ? <p className="status-note">{statusMessage}</p> : null}
        </section>

        <section className="roles" aria-label="Dashboardbereiche">
          <div className="cards">
            {cards.map((card) => {
              const content = (
                <>
                  <span className="card-label">Bereich</span>
                  <h3>{card.title}</h3>
                  <p>{card.text}</p>
                </>
              )

              if (card.to) {
                return (
                  <Link key={card.title} to={card.to} className="card card-link">
                    {content}
                  </Link>
                )
              }

              return (
                <article className="card" key={card.title}>
                  {content}
                </article>
              )
            })}
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
