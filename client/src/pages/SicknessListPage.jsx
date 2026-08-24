import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { apiRequest } from '../api'
import AdminPage from '../components/AdminPage'
import CertificateCell from '../components/CertificateCell'
import {
  formatDate,
  getAbsenceTypeLabel,
  getSicknessStatusLabel,
} from '../leaveLabels'

function SicknessListPage() {
  const navigate = useNavigate()
  const [records, setRecords] = useState([])
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  async function load() {
    setIsLoading(true)
    setError('')
    try {
      const query = status ? `?status=${encodeURIComponent(status)}` : ''
      const rows = await apiRequest(`/api/sickness-absences/me${query}`)
      setRecords(rows)
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

  return (
    <AdminPage
      eyebrow="Abwesenheit"
      title="Meine Krankmeldungen"
      lead="Krankmeldungen und Pflegezeiten erfassen. Diese Einträge verringern den Jahresurlaub nicht."
      actions={
        <Link to="/sickness-absences/new" className="btn-primary">
          Krankmeldung erfassen
        </Link>
      }
    >
      <div className="toolbar">
        <select value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">Alle Status</option>
          <option value="REPORTED">Gemeldet</option>
          <option value="DOCUMENT_PENDING">Dokument ausstehend</option>
          <option value="VALIDATED">Validiert</option>
          <option value="REJECTED">Abgelehnt</option>
          <option value="CLOSED">Abgeschlossen</option>
        </select>
      </div>

      {error ? <p className="form-error">{error}</p> : null}
      {isLoading ? <p>Daten werden geladen…</p> : null}
      {!isLoading && records.length === 0 ? (
        <p>Es sind keine Krankmeldungen vorhanden.</p>
      ) : null}

      {!isLoading && records.length > 0 ? (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Abwesenheitsart</th>
                <th>Beginn</th>
                <th>Ende</th>
                <th>Status</th>
                <th>Bescheinigungsreferenz</th>
                <th>Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => {
                const canEdit =
                  record.status === 'REPORTED' ||
                  record.status === 'DOCUMENT_PENDING'
                return (
                  <tr key={record.id}>
                    <td>{getAbsenceTypeLabel(record.absenceType)}</td>
                    <td>{formatDate(record.startDate)}</td>
                    <td>{formatDate(record.endDate)}</td>
                    <td>{getSicknessStatusLabel(record.status)}</td>
                    <td>
                      <CertificateCell record={record} />
                    </td>
                    <td className="actions">
                      {canEdit ? (
                        <Link to={`/sickness-absences/${record.id}/edit`}>
                          Bearbeiten
                        </Link>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </AdminPage>
  )
}

export default SicknessListPage
