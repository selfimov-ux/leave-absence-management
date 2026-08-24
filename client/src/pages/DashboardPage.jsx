import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AppHeader from '../components/AppHeader'
import { useLanguage } from '../i18n/LanguageContext'
import { getRoleLabel } from '../leaveLabels'
import {
  clearSession,
  getToken,
  getUser,
  saveSession,
} from '../authStorage'

function getDashboardCards(role, t) {
  if (role === 'MANAGER') {
    return [
      {
        title: t('dashboard.cards.managerLeaveTitle'),
        text: t('dashboard.cards.managerLeaveText'),
        to: '/manager/leave-requests',
      },
      {
        title: t('dashboard.cards.myLeaveTitle'),
        text: t('dashboard.cards.myLeaveText'),
        to: '/leave-requests',
      },
      {
        title: t('dashboard.cards.deptAbsenceTitle'),
        text: t('dashboard.cards.deptAbsenceText'),
        to: '/manager/sickness-absences',
      },
      {
        title: t('dashboard.cards.mySicknessTitle'),
        text: t('dashboard.cards.mySicknessManagerText'),
        to: '/sickness-absences',
      },
    ]
  }

  if (role === 'ADMINISTRATOR') {
    return [
      {
        title: t('dashboard.cards.employeesTitle'),
        text: t('dashboard.cards.employeesText'),
        to: '/admin/employees',
      },
      {
        title: t('dashboard.cards.departmentsTitle'),
        text: t('dashboard.cards.departmentsText'),
        to: '/admin/departments',
      },
      {
        title: t('dashboard.cards.leaveTypesTitle'),
        text: t('dashboard.cards.leaveTypesText'),
        to: '/admin/leave-types',
      },
      {
        title: t('dashboard.cards.adminSicknessTitle'),
        text: t('dashboard.cards.adminSicknessText'),
        to: '/admin/sickness-absences',
      },
      {
        title: t('dashboard.cards.reportsTitle'),
        text: t('dashboard.cards.reportsText'),
        to: '/admin/reports',
      },
      {
        title: t('dashboard.cards.auditTitle'),
        text: t('dashboard.cards.auditText'),
        to: '/admin/audit-logs',
      },
    ]
  }

  return [
    {
      title: t('dashboard.cards.myLeaveTitle'),
      text: t('dashboard.cards.myLeaveEmployeeText'),
      to: '/leave-requests',
    },
    {
      title: t('dashboard.cards.mySicknessTitle'),
      text: t('dashboard.cards.mySicknessEmployeeText'),
      to: '/sickness-absences',
    },
    {
      title: t('dashboard.cards.balancesTitle'),
      text: t('dashboard.cards.balancesText'),
      to: '/leave-balances',
    },
  ]
}

function DashboardPage() {
  const navigate = useNavigate()
  const { t } = useLanguage()
  const [user, setUser] = useState(getUser())
  const [statusMessage, setStatusMessage] = useState(t('dashboard.checkingSession'))

  const cards = useMemo(
    () => getDashboardCards(user?.role, t),
    [user?.role, t]
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
          setStatusMessage(t('dashboard.sessionFailed'))
        }
      }
    }

    loadCurrentUser()

    return () => {
      cancelled = true
    }
  }, [navigate, t])

  if (!user) {
    return null
  }

  const fullName = `${user.firstName} ${user.lastName}`
  const roleLabel = getRoleLabel(user.role, t)

  return (
    <div className="page">
      <AppHeader />
      <main>
        <section className="hero dashboard-hero">
          <p className="eyebrow">{t('dashboard.eyebrow')}</p>
          <h1>{t('dashboard.welcome', { name: fullName })}</h1>
          <p className="lead">
            {t('dashboard.signedInAs', { role: roleLabel })}
            {user.role === 'ADMINISTRATOR'
              ? t('dashboard.adminHint')
              : t('dashboard.otherHint')}
          </p>
          {statusMessage ? <p className="status-note">{statusMessage}</p> : null}
        </section>

        <section className="roles" aria-label={t('dashboard.sectionsLabel')}>
          <div className="cards">
            {cards.map((card) => {
              const content = (
                <>
                  <span className="card-label">{t('common.area')}</span>
                  <h3>{card.title}</h3>
                  <p>{card.text}</p>
                </>
              )

              if (card.to) {
                return (
                  <Link key={card.to} to={card.to} className="card card-link">
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
        <p>{t('common.footer')}</p>
      </footer>
    </div>
  )
}

export default DashboardPage
