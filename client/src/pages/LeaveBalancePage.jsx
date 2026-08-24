import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiRequest } from '../api'
import AdminPage from '../components/AdminPage'
import { useLanguage } from '../i18n/LanguageContext'
import { getLeaveTypeLabel } from '../leaveLabels'

function LeaveBalancePage() {
  const navigate = useNavigate()
  const { t } = useLanguage()
  const [balances, setBalances] = useState([])
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const rows = await apiRequest('/api/leave-balances/me')
        setBalances(rows)
      } catch (err) {
        if (err.status === 401) {
          navigate('/login', { replace: true })
          return
        }
        setError(err.message)
      } finally {
        setIsLoading(false)
      }
    }

    load()
  }, [navigate])

  return (
    <AdminPage
      eyebrow={t('balances.eyebrow')}
      title={t('balances.title')}
      lead={t('balances.lead')}
    >
      {error ? <p className="form-error">{error}</p> : null}
      {isLoading ? <p>{t('common.loading')}</p> : null}
      {!isLoading && balances.length === 0 ? (
        <p>{t('balances.empty')}</p>
      ) : null}

      <div className="cards">
        {balances.map((balance) => (
          <article className="card balance-card" key={balance.id}>
            <span className="card-label">{balance.calendarYear}</span>
            <h3>{getLeaveTypeLabel(balance.leaveTypeName, t)}</h3>
            <p>{t('balances.allowance', { count: balance.annualAllowance })}</p>
            <p>{t('balances.used', { count: balance.usedDays })}</p>
            <p>{t('balances.adjusted', { count: balance.adjustedDays })}</p>
            <p>
              <strong>
                {t('balances.remaining', { count: balance.remainingDays })}
              </strong>
            </p>
          </article>
        ))}
      </div>
    </AdminPage>
  )
}

export default LeaveBalancePage
