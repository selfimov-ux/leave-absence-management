import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { apiRequest } from '../api'
import AdminPage from '../components/AdminPage'
import { formatDate, getLeaveTypeLabel, getStatusLabel } from '../leaveLabels'

function LeaveRequestListPage() {
  const navigate = useNavigate()
  const [requests, setRequests] = useState([])
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  async function load() {
    setIsLoading(true)
    setError('')
    try {
      const query = status ? `?status=${encodeURIComponent(status)}` : ''
      const rows = await apiRequest(`/api/leave-requests/me${query}`)
      setRequests(rows)
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

  useEffect(() => {
    load()
  }, [status])

  async function handleCancel(request) {
    const confirmed = window.confirm(
      `Möchten Sie den Antrag vom ${formatDate(request.startDate)} bis ${formatDate(request.endDate)} wirklich stornieren?`
    )
    if (!confirmed) {
      return
    }

    try {
      await apiRequest(`/api/leave-requests/${request.id}/cancel`, {
        method: 'PATCH',
      })
      await load()
    } catch (err) {
      window.alert(err.message)
    }
  }

  return (
    <AdminPage
      eyebrow="Urlaub"
      title="Meine Urlaubsanträge"
      lead="Eigene Anträge einsehen, neue Anträge stellen und ausstehende Anträge stornieren."
      actions={
        <Link to="/leave-requests/new" className="btn-primary">
          Neuen Urlaubsantrag stellen
        </Link>
      }
    >
      <div className="toolbar">
        <select value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">Alle Status</option>
          <option value="PENDING">Ausstehend</option>
          <option value="APPROVED">Genehmigt</option>
          <option value="REJECTED">Abgelehnt</option>
          <option value="CANCELLED">Storniert</option>
        </select>
      </div>

      {error ? <p className="form-error">{error}</p> : null}
      {isLoading ? <p>Daten werden geladen…</p> : null}
      {!isLoading && requests.length === 0 ? (
        <p>Es sind keine Urlaubsanträge vorhanden.</p>
      ) : null}

      {!isLoading && requests.length > 0 ? (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Urlaubsart</th>
                <th>Beginn</th>
                <th>Ende</th>
                <th>Arbeitstage</th>
                <th>Status</th>
                <th>Bemerkung</th>
                <th>Bearbeitet von</th>
                <th>Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((request) => (
                <tr key={request.id}>
                  <td>{getLeaveTypeLabel(request.leaveTypeName)}</td>
                  <td>{formatDate(request.startDate)}</td>
                  <td>{formatDate(request.endDate)}</td>
                  <td>{request.requestedDays}</td>
                  <td>{getStatusLabel(request.status)}</td>
                  <td>{request.reason || '—'}</td>
                  <td>{request.reviewerName || '—'}</td>
                  <td className="actions">
                    {request.status === 'PENDING' ? (
                      <button
                        type="button"
                        className="link-button"
                        onClick={() => handleCancel(request)}
                      >
                        Stornieren
                      </button>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </AdminPage>
  )
}

export default LeaveRequestListPage
