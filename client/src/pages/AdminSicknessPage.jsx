import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiRequest } from '../api'
import AdminPage from '../components/AdminPage'
import CertificateCell from '../components/CertificateCell'
import {
  formatDate,
  getAbsenceTypeLabel,
  getSicknessStatusLabel,
} from '../leaveLabels'

function AdminSicknessPage() {
  const navigate = useNavigate()
  const [records, setRecords] = useState([])
  const [employees, setEmployees] = useState([])
  const [departments, setDepartments] = useState([])
  const [employeeId, setEmployeeId] = useState('')
  const [departmentId, setDepartmentId] = useState('')
  const [status, setStatus] = useState('')
  const [absenceType, setAbsenceType] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [action, setAction] = useState(null)
  const [note, setNote] = useState('')

  async function load() {
    setIsLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      if (employeeId) params.set('employeeId', employeeId)
      if (departmentId) params.set('departmentId', departmentId)
      if (status) params.set('status', status)
      if (absenceType) params.set('absenceType', absenceType)
      if (fromDate) params.set('from', fromDate)
      if (toDate) params.set('to', toDate)
      const query = params.toString() ? `?${params.toString()}` : ''
      const [rows, employeeRows, departmentRows] = await Promise.all([
        apiRequest(`/api/admin/sickness-absences${query}`),
        apiRequest('/api/employees'),
        apiRequest('/api/departments'),
      ])
      setRecords(rows)
      setEmployees(employeeRows)
      setDepartments(departmentRows)
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
  }, [employeeId, departmentId, status, absenceType, fromDate, toDate])

  function startAction(type, record) {
    setAction({ type, record })
    setNote('')
    setError('')
    setSuccess('')
  }

  async function submitAction(event) {
    event.preventDefault()
    if (!action) {
      return
    }

    const labels = {
      document: 'Dokument anfordern',
      validate: 'Validieren',
      reject: 'Ablehnen',
      close: 'Abschließen',
    }
    if (!window.confirm(`Möchten Sie diese Krankmeldung wirklich ${labels[action.type].toLowerCase()}?`)) {
      return
    }

    if (action.type === 'reject' && !note.trim()) {
      setError('Bitte eine Begründung der Ablehnung angeben.')
      return
    }

    const paths = {
      document: `/api/admin/sickness-absences/${action.record.id}/document-pending`,
      validate: `/api/admin/sickness-absences/${action.record.id}/validate`,
      reject: `/api/admin/sickness-absences/${action.record.id}/reject`,
      close: `/api/admin/sickness-absences/${action.record.id}/close`,
    }
    const bodies = {
      document: { administratorNote: note.trim() || undefined },
      validate: { administratorNote: note.trim() || undefined },
      reject: { administratorNote: note.trim() },
    }

    try {
      await apiRequest(paths[action.type], {
        method: 'PATCH',
        body: bodies[action.type],
      })
      setAction(null)
      setNote('')
      setSuccess('Die Statusänderung wurde gespeichert.')
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <AdminPage
      eyebrow="Administration"
      title="Verwaltung von Krankmeldungen"
      lead="Prüfung, Validierung und Abschluss. Es erfolgt keine Änderung des Urlaubskontingents."
    >
      <div className="toolbar toolbar-admin-sick">
        <select
          value={employeeId}
          onChange={(event) => setEmployeeId(event.target.value)}
        >
          <option value="">Alle Mitarbeiter</option>
          {employees.map((employee) => (
            <option key={employee.id} value={employee.id}>
              {employee.firstName} {employee.lastName}
            </option>
          ))}
        </select>
        <select
          value={departmentId}
          onChange={(event) => setDepartmentId(event.target.value)}
        >
          <option value="">Alle Abteilungen</option>
          {departments.map((department) => (
            <option key={department.id} value={department.id}>
              {department.name}
            </option>
          ))}
        </select>
        <select value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">Alle Status</option>
          <option value="REPORTED">Gemeldet</option>
          <option value="DOCUMENT_PENDING">Dokument ausstehend</option>
          <option value="VALIDATED">Validiert</option>
          <option value="REJECTED">Abgelehnt</option>
          <option value="CLOSED">Abgeschlossen</option>
        </select>
        <select
          value={absenceType}
          onChange={(event) => setAbsenceType(event.target.value)}
        >
          <option value="">Alle Arten</option>
          <option value="SICK_LEAVE">Krankmeldung</option>
          <option value="CARE_LEAVE">Pflegefreistellung</option>
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

      {action ? (
        <form className="admin-form" onSubmit={submitAction}>
          <h2>
            {action.type === 'document' && 'Dokument anfordern'}
            {action.type === 'validate' && 'Krankmeldung validieren'}
            {action.type === 'reject' && 'Krankmeldung ablehnen'}
            {action.type === 'close' && 'Krankmeldung abschließen'}
          </h2>
          <p>
            {action.record.employeeName}: {formatDate(action.record.startDate)}{' '}
            bis {formatDate(action.record.endDate)}
          </p>
          <p>
            Bescheinigung: <CertificateCell record={action.record} />
          </p>
          {action.type !== 'close' ? (
            <>
              <label htmlFor="adminNote">
                {action.type === 'reject'
                  ? 'Begründung der Ablehnung'
                  : 'Administratorvermerk (optional)'}
              </label>
              <textarea
                id="adminNote"
                rows="3"
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
            </>
          ) : null}
          <div className="form-actions">
            <button type="submit" className="btn-primary">
              Bestätigen
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setAction(null)}
            >
              Abbrechen
            </button>
          </div>
        </form>
      ) : null}

      {!isLoading && records.length === 0 ? (
        <p>Keine Krankmeldungen für die gewählten Filter.</p>
      ) : null}

      {!isLoading && records.length > 0 ? (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Mitarbeiter</th>
                <th>Personalnummer</th>
                <th>Abteilung</th>
                <th>Abwesenheitsart</th>
                <th>Beginn</th>
                <th>Ende</th>
                <th>Status</th>
                <th>Bescheinigungsreferenz</th>
                <th>Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr key={record.id}>
                  <td>{record.employeeName}</td>
                  <td>{record.employeeNumber}</td>
                  <td>{record.departmentName}</td>
                  <td>{getAbsenceTypeLabel(record.absenceType)}</td>
                  <td>{formatDate(record.startDate)}</td>
                  <td>{formatDate(record.endDate)}</td>
                  <td>{getSicknessStatusLabel(record.status)}</td>
                  <td>
                    <CertificateCell record={record} />
                  </td>
                  <td className="actions">
                    {record.status === 'REPORTED' ? (
                      <>
                        <button
                          type="button"
                          className="link-button"
                          onClick={() => startAction('document', record)}
                        >
                          Dokument anfordern
                        </button>
                        <button
                          type="button"
                          className="link-button"
                          onClick={() => startAction('validate', record)}
                        >
                          Validieren
                        </button>
                        <button
                          type="button"
                          className="link-button"
                          onClick={() => startAction('reject', record)}
                        >
                          Ablehnen
                        </button>
                      </>
                    ) : null}
                    {record.status === 'DOCUMENT_PENDING' ? (
                      <>
                        <button
                          type="button"
                          className="link-button"
                          onClick={() => startAction('validate', record)}
                        >
                          Validieren
                        </button>
                        <button
                          type="button"
                          className="link-button"
                          onClick={() => startAction('reject', record)}
                        >
                          Ablehnen
                        </button>
                      </>
                    ) : null}
                    {record.status === 'VALIDATED' ? (
                      <button
                        type="button"
                        className="link-button"
                        onClick={() => startAction('close', record)}
                      >
                        Abschließen
                      </button>
                    ) : null}
                    {record.status === 'REJECTED' || record.status === 'CLOSED'
                      ? '—'
                      : null}
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

export default AdminSicknessPage
