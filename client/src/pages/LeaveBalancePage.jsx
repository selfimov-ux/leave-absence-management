import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiRequest } from '../api'
import AdminPage from '../components/AdminPage'
import { getLeaveTypeLabel } from '../leaveLabels'

function LeaveBalancePage() {
  const navigate = useNavigate()
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
      eyebrow="Urlaub"
      title="Urlaubsübersicht"
      lead="Jährlicher Anspruch, genommene Tage und verbleibendes Kontingent."
    >
      {error ? <p className="form-error">{error}</p> : null}
      {isLoading ? <p>Daten werden geladen…</p> : null}
      {!isLoading && balances.length === 0 ? (
        <p>Es sind keine Urlaubskontingente hinterlegt.</p>
      ) : null}

      <div className="cards">
        {balances.map((balance) => (
          <article className="card balance-card" key={balance.id}>
            <span className="card-label">{balance.calendarYear}</span>
            <h3>{getLeaveTypeLabel(balance.leaveTypeName)}</h3>
            <p>Jährlicher Anspruch: {balance.annualAllowance} Tage</p>
            <p>Genommene Tage: {balance.usedDays}</p>
            <p>Anpassungen: {balance.adjustedDays}</p>
            <p>
              <strong>Verbleibende Tage: {balance.remainingDays}</strong>
            </p>
          </article>
        ))}
      </div>
    </AdminPage>
  )
}

export default LeaveBalancePage
