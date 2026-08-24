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

function ManagerSicknessPage() {
  const navigate = useNavigate()
  const [records, setRecords] = useState([])
  const [status, setStatus] = useState('')
  const [absenceType, setAbsenceType] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  async function load() {
    setIsLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      if (status) params.set('status', status)
      if (absenceType) params.set('absenceType', absenceType)
      if (fromDate) params.set('from', fromDate)
      if (toDate) params.set('to', toDate)
      const query = params.toString() ? `?${params.toString()}` : ''
      const rows = await apiRequest(`/api/manager/sickness-absences${query}`)
      setRecords(rows)
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
  }, [status, absenceType, fromDate, toDate])

  return (
    <AdminPage
      eyebrow="Abteilung"
      title="Abwesenheiten meiner Abteilung"
      lead="Krankmeldungen werden durch die Administration geprüft und validiert."
    >
      <p className="field-hint">
        Diese Übersicht ist nur lesend. Es gibt keine Aktionen zum Validieren,
        Ablehnen oder Abschließen.
      </p>
      <div className="toolbar toolbar-4">
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

      {error ? <p className="form-error">{error}</p> : null}
      {isLoading ? <p>Daten werden geladen…</p> : null}
      {!isLoading && records.length === 0 ? (
        <p>Keine Abwesenheiten für die gewählten Filter.</p>
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </AdminPage>
  )
}

export default ManagerSicknessPage
