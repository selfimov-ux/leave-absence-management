import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { apiRequest } from '../api'
import AdminPage from '../components/AdminPage'
import { countWorkingDays, getLeaveTypeLabel } from '../leaveLabels'

function LeaveRequestNewPage() {
  const navigate = useNavigate()
  const [leaveTypes, setLeaveTypes] = useState([])
  const [leaveTypeId, setLeaveTypeId] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const workingDays = useMemo(
    () => countWorkingDays(startDate, endDate),
    [startDate, endDate]
  )

  useEffect(() => {
    async function loadTypes() {
      try {
        const rows = await apiRequest('/api/leave-types')
        setLeaveTypes(rows.filter((item) => item.isActive))
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

    loadTypes()
  }, [navigate])

  async function handleSubmit(event) {
    event.preventDefault()
    if (!leaveTypeId) {
      setError('Bitte eine Urlaubsart auswählen.')
      return
    }
    if (!startDate || !endDate) {
      setError('Bitte Beginn und Ende angeben.')
      return
    }
    if (startDate > endDate) {
      setError('Das Beginndatum darf nicht nach dem Endedatum liegen.')
      return
    }
    if (workingDays <= 0) {
      setError('Der Zeitraum enthält keine Arbeitstage (Montag bis Freitag).')
      return
    }

    setIsSaving(true)
    setError('')
    try {
      await apiRequest('/api/leave-requests', {
        method: 'POST',
        body: {
          leaveTypeId: Number(leaveTypeId),
          startDate,
          endDate,
          reason: reason.trim() || undefined,
        },
      })
      navigate('/leave-requests', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <AdminPage
      eyebrow="Urlaub"
      title="Neuen Urlaubsantrag stellen"
      lead="Der Antrag gilt nur für Sie selbst und bleibt zunächst ausstehend."
    >
      {isLoading ? <p>Daten werden geladen…</p> : null}
      {error ? <p className="form-error">{error}</p> : null}

      {!isLoading ? (
        <form className="admin-form" onSubmit={handleSubmit} noValidate>
          <label htmlFor="leaveTypeId">Urlaubsart</label>
          <select
            id="leaveTypeId"
            value={leaveTypeId}
            onChange={(event) => setLeaveTypeId(event.target.value)}
          >
            <option value="">Bitte auswählen</option>
            {leaveTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {getLeaveTypeLabel(type.name)}
              </option>
            ))}
          </select>

          <label htmlFor="startDate">Beginn</label>
          <input
            id="startDate"
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
          />

          <label htmlFor="endDate">Ende</label>
          <input
            id="endDate"
            type="date"
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
          />

          <p className="field-hint">
            Berechnete Arbeitstage: <strong>{workingDays}</strong>. Gesetzliche
            Feiertage werden in dieser Phase nicht berücksichtigt.
          </p>

          <label htmlFor="reason">Bemerkung</label>
          <textarea
            id="reason"
            rows="3"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />

          <div className="form-actions">
            <button type="submit" className="btn-primary" disabled={isSaving}>
              {isSaving ? 'Wird gesendet…' : 'Antrag senden'}
            </button>
            <Link to="/leave-requests" className="btn-secondary">
              Abbrechen
            </Link>
          </div>
        </form>
      ) : null}
    </AdminPage>
  )
}

export default LeaveRequestNewPage
