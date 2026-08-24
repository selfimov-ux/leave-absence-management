import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiRequest } from '../api'
import AdminPage from '../components/AdminPage'
import { formatDate, getLeaveTypeLabel, getStatusLabel } from '../leaveLabels'

function ManagerLeaveRequestPage() {
  const navigate = useNavigate()
  const [requests, setRequests] = useState([])
  const [leaveTypes, setLeaveTypes] = useState([])
  const [status, setStatus] = useState('')
  const [leaveTypeId, setLeaveTypeId] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [rejecting, setRejecting] = useState(null)
  const [rejectionReason, setRejectionReason] = useState('')

  async function load() {
    setIsLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      if (status) {
        params.set('status', status)
      }
      if (leaveTypeId) {
        params.set('leaveTypeId', leaveTypeId)
      }
      if (fromDate) {
        params.set('from', fromDate)
      }
      if (toDate) {
        params.set('to', toDate)
      }
      const query = params.toString() ? `?${params.toString()}` : ''
      const [rows, types] = await Promise.all([
        apiRequest(`/api/manager/leave-requests${query}`),
        apiRequest('/api/leave-types'),
      ])
      setRequests(rows)
      setLeaveTypes(types)
    } catch (err) {
      if (err.status === 401) {
        navigate('/login', { replace: true })
        return
      }
      if (err.status === 403) {
        navigate('/dashboard', { replace: true })
        return
      }
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [status, leaveTypeId, fromDate, toDate])

  async function handleApprove(request) {
    const confirmed = window.confirm(
      `Möchten Sie den Antrag von ${request.employeeName} wirklich genehmigen?`
    )
    if (!confirmed) {
      return
    }

    try {
      await apiRequest(`/api/manager/leave-requests/${request.id}/approve`, {
        method: 'PATCH',
      })
      setSuccess('Der Antrag wurde genehmigt.')
      await load()
    } catch (err) {
      setSuccess('')
      window.alert(err.message)
    }
  }

  async function handleReject(event) {
    event.preventDefault()
    if (!rejectionReason.trim()) {
      setError('Bitte einen Ablehnungsgrund angeben.')
      return
    }

    try {
      await apiRequest(`/api/manager/leave-requests/${rejecting.id}/reject`, {
        method: 'PATCH',
        body: { rejectionReason: rejectionReason.trim() },
      })
      setRejecting(null)
      setRejectionReason('')
      setSuccess('Der Antrag wurde abgelehnt.')
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <AdminPage
      eyebrow="Abteilung"
      title="Urlaubsanträge meiner Abteilung"
      lead="Nur Anträge von Mitarbeitenden der eigenen Abteilung. Eigene Anträge erscheinen hier nicht."
    >
      <div className="toolbar toolbar-4">
        <select value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">Alle Status</option>
          <option value="PENDING">Ausstehend</option>
          <option value="APPROVED">Genehmigt</option>
          <option value="REJECTED">Abgelehnt</option>
          <option value="CANCELLED">Storniert</option>
        </select>
        <select
          value={leaveTypeId}
          onChange={(event) => setLeaveTypeId(event.target.value)}
        >
          <option value="">Alle Urlaubsarten</option>
          {leaveTypes.map((type) => (
            <option key={type.id} value={type.id}>
              {getLeaveTypeLabel(type.name)}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={fromDate}
          onChange={(event) => setFromDate(event.target.value)}
          aria-label="Von"
        />
        <input
          type="date"
          value={toDate}
          onChange={(event) => setToDate(event.target.value)}
          aria-label="Bis"
        />
      </div>

      {success ? <p className="form-success">{success}</p> : null}
      {error ? <p className="form-error">{error}</p> : null}
      {isLoading ? <p>Daten werden geladen…</p> : null}
      {!isLoading && requests.length === 0 ? (
        <p>Keine Anträge für die gewählten Filter.</p>
      ) : null}

      {rejecting ? (
        <form className="admin-form" onSubmit={handleReject}>
          <h2>Antrag ablehnen</h2>
          <p>
            {rejecting.employeeName}: {formatDate(rejecting.startDate)} bis{' '}
            {formatDate(rejecting.endDate)}
          </p>
          <label htmlFor="rejectionReason">Ablehnungsgrund</label>
          <textarea
            id="rejectionReason"
            rows="3"
            value={rejectionReason}
            onChange={(event) => setRejectionReason(event.target.value)}
          />
          <div className="form-actions">
            <button type="submit" className="btn-primary">
              Ablehnung speichern
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setRejecting(null)
                setRejectionReason('')
              }}
            >
              Abbrechen
            </button>
          </div>
        </form>
      ) : null}

      {!isLoading && requests.length > 0 ? (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Mitarbeiter</th>
                <th>Personalnummer</th>
                <th>Urlaubsart</th>
                <th>Beginn</th>
                <th>Ende</th>
                <th>Arbeitstage</th>
                <th>Bemerkung</th>
                <th>Status</th>
                <th>Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((request) => (
                <tr key={request.id}>
                  <td>{request.employeeName}</td>
                  <td>{request.employeeNumber}</td>
                  <td>{getLeaveTypeLabel(request.leaveTypeName)}</td>
                  <td>{formatDate(request.startDate)}</td>
                  <td>{formatDate(request.endDate)}</td>
                  <td>{request.requestedDays}</td>
                  <td>{request.reason || '—'}</td>
                  <td>{getStatusLabel(request.status)}</td>
                  <td className="actions">
                    {request.status === 'PENDING' ? (
                      <>
                        <button
                          type="button"
                          className="link-button"
                          onClick={() => handleApprove(request)}
                        >
                          Genehmigen
                        </button>
                        <button
                          type="button"
                          className="link-button"
                          onClick={() => {
                            setRejecting(request)
                            setRejectionReason('')
                            setSuccess('')
                            setError('')
                          }}
                        >
                          Ablehnen
                        </button>
                      </>
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

export default ManagerLeaveRequestPage
