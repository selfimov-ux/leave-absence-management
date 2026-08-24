import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiRequest } from '../api'
import AdminPage from '../components/AdminPage'
import { formatDateTime, getAuditActionLabel } from '../leaveLabels'

const PAGE_SIZE = 20

function AuditLogPage() {
  const navigate = useNavigate()
  const [users, setUsers] = useState([])
  const [userId, setUserId] = useState('')
  const [action, setAction] = useState('')
  const [entityType, setEntityType] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [records, setRecords] = useState([])
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadUsers() {
      try {
        const employees = await apiRequest('/api/employees')
        setUsers(
          employees.map((employee) => ({
            userId: employee.userId,
            label: `${employee.firstName} ${employee.lastName} (${employee.username})`,
          }))
        )
      } catch (err) {
        if (err.status === 401) {
          navigate('/login', { replace: true })
        }
      }
    }

    loadUsers()
  }, [navigate])

  useEffect(() => {
    async function load() {
      setIsLoading(true)
      setError('')
      try {
        const params = new URLSearchParams()
        params.set('page', String(page))
        params.set('pageSize', String(PAGE_SIZE))
        if (userId) params.set('userId', userId)
        if (action) params.set('action', action)
        if (entityType) params.set('entityType', entityType)
        if (fromDate) params.set('fromDate', fromDate)
        if (toDate) params.set('toDate', toDate)

        const data = await apiRequest(`/api/audit-logs?${params.toString()}`)
        setRecords(data.records)
        setTotalCount(data.totalCount)
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
        setRecords([])
        setTotalCount(0)
      } finally {
        setIsLoading(false)
      }
    }

    load()
  }, [userId, action, entityType, fromDate, toDate, page, navigate])

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))

  function changeFilter(setter) {
    return (event) => {
      setter(event.target.value)
      setPage(1)
    }
  }

  return (
    <AdminPage
      eyebrow="Administration"
      title="Aktivitätsprotokoll"
      lead="Protokoll der administrativen und fachlichen Aktionen. Es werden keine Kennwörter, Token oder Bescheinigungsdateien angezeigt."
    >
      <div className="toolbar toolbar-admin-sick">
        <select
          value={userId}
          onChange={changeFilter(setUserId)}
          aria-label="Benutzer"
        >
          <option value="">Alle Benutzer</option>
          {users.map((user) => (
            <option key={user.userId} value={user.userId}>
              {user.label}
            </option>
          ))}
        </select>
        <select
          value={action}
          onChange={changeFilter(setAction)}
          aria-label="Aktion"
        >
          <option value="">Alle Aktionen</option>
          <option value="CREATE_LEAVE_REQUEST">Urlaubsantrag erstellt</option>
          <option value="APPROVE_LEAVE_REQUEST">Urlaubsantrag genehmigt</option>
          <option value="REJECT_LEAVE_REQUEST">Urlaubsantrag abgelehnt</option>
          <option value="CANCEL_LEAVE_REQUEST">Urlaubsantrag storniert</option>
          <option value="REPORT_SICKNESS_ABSENCE">Krankmeldung erfasst</option>
          <option value="VALIDATE_SICKNESS_ABSENCE">Krankmeldung validiert</option>
          <option value="UPLOAD_SICKNESS_CERTIFICATE">Bescheinigung hochgeladen</option>
          <option value="CREATE_EMPLOYEE">Mitarbeiter angelegt</option>
          <option value="UPDATE_EMPLOYEE">Mitarbeiter aktualisiert</option>
        </select>
        <select
          value={entityType}
          onChange={changeFilter(setEntityType)}
          aria-label="Entität"
        >
          <option value="">Alle Entitäten</option>
          <option value="leave_requests">leave_requests</option>
          <option value="sickness_absences">sickness_absences</option>
          <option value="employees">employees</option>
          <option value="departments">departments</option>
          <option value="leave_types">leave_types</option>
        </select>
        <input
          type="date"
          value={fromDate}
          onChange={changeFilter(setFromDate)}
          aria-label="Zeitraum von"
        />
        <input
          type="date"
          value={toDate}
          onChange={changeFilter(setToDate)}
          aria-label="Zeitraum bis"
        />
      </div>

      {error ? <p className="form-error">{error}</p> : null}
      {isLoading ? <p>Daten werden geladen…</p> : null}
      {!isLoading && !error && records.length === 0 ? (
        <p>Keine Protokolleinträge für die gewählten Filter.</p>
      ) : null}

      {!isLoading && records.length > 0 ? (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Zeitpunkt</th>
                <th>Benutzer</th>
                <th>Aktion</th>
                <th>Entität</th>
                <th>ID</th>
                <th>Beschreibung</th>
              </tr>
            </thead>
            <tbody>
              {records.map((row) => (
                <tr key={row.id}>
                  <td>{formatDateTime(row.timestamp)}</td>
                  <td>{row.actorName}</td>
                  <td>{getAuditActionLabel(row.action)}</td>
                  <td>{row.entityType}</td>
                  <td>{row.entityId}</td>
                  <td>{row.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {!isLoading && !error ? (
        <div className="pagination">
          <button
            type="button"
            className="btn-secondary"
            disabled={page <= 1}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
          >
            Zurück
          </button>
          <span>
            Seite {page} von {totalPages}
          </span>
          <button
            type="button"
            className="btn-secondary"
            disabled={page >= totalPages}
            onClick={() => setPage((current) => current + 1)}
          >
            Weiter
          </button>
        </div>
      ) : null}
    </AdminPage>
  )
}

export default AuditLogPage
