import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiRequest } from '../api'
import AdminPage from '../components/AdminPage'
import { downloadCsv } from '../csvExport'
import {
  formatDate,
  getAbsenceTypeLabel,
  getLeaveTypeLabel,
  getRecordTypeLabel,
  getSicknessStatusLabel,
  getStatusLabel,
} from '../leaveLabels'

const TABS = [
  { id: 'leave', label: 'Urlaubsbericht' },
  { id: 'sickness', label: 'Krankmeldungsbericht' },
  { id: 'overview', label: 'Abwesenheitsübersicht' },
]

function ReportsPage() {
  const navigate = useNavigate()
  const [tab, setTab] = useState('leave')
  const [employees, setEmployees] = useState([])
  const [departments, setDepartments] = useState([])
  const [leaveTypes, setLeaveTypes] = useState([])
  const [employeeId, setEmployeeId] = useState('')
  const [departmentId, setDepartmentId] = useState('')
  const [leaveTypeId, setLeaveTypeId] = useState('')
  const [absenceType, setAbsenceType] = useState('')
  const [status, setStatus] = useState('')
  const [recordType, setRecordType] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [total, setTotal] = useState(0)
  const [records, setRecords] = useState([])
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadLookups() {
      try {
        const [employeeRows, departmentRows, leaveTypeRows] = await Promise.all([
          apiRequest('/api/employees'),
          apiRequest('/api/departments'),
          apiRequest('/api/leave-types'),
        ])
        setEmployees(employeeRows)
        setDepartments(departmentRows)
        setLeaveTypes(leaveTypeRows)
      } catch (err) {
        if (err.status === 401) {
          navigate('/login', { replace: true })
        }
      }
    }

    loadLookups()
  }, [navigate])

  useEffect(() => {
    async function load() {
      setIsLoading(true)
      setError('')
      try {
        const params = new URLSearchParams()
        if (fromDate) params.set('fromDate', fromDate)
        if (toDate) params.set('toDate', toDate)

        let path = '/api/reports/leave'
        if (tab === 'leave') {
          if (employeeId) params.set('employeeId', employeeId)
          if (departmentId) params.set('departmentId', departmentId)
          if (leaveTypeId) params.set('leaveTypeId', leaveTypeId)
          if (status) params.set('status', status)
        } else if (tab === 'sickness') {
          path = '/api/reports/sickness-absences'
          if (employeeId) params.set('employeeId', employeeId)
          if (departmentId) params.set('departmentId', departmentId)
          if (absenceType) params.set('absenceType', absenceType)
          if (status) params.set('status', status)
        } else if (tab === 'overview') {
          path = '/api/reports/absence-overview'
          if (employeeId) params.set('employeeId', employeeId)
          if (departmentId) params.set('departmentId', departmentId)
          if (recordType) params.set('recordType', recordType)
        }

        const query = params.toString() ? `?${params.toString()}` : ''
        const data = await apiRequest(`${path}${query}`)
        setRecords(data.records)
        setTotal(data.total)
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
        setTotal(0)
      } finally {
        setIsLoading(false)
      }
    }

    load()
  }, [
    tab,
    employeeId,
    departmentId,
    leaveTypeId,
    absenceType,
    status,
    recordType,
    fromDate,
    toDate,
    navigate,
  ])

  function exportCsv() {
    if (tab === 'leave') {
      downloadCsv(
        'urlaubsbericht.csv',
        [
          'ID',
          'Personalnummer',
          'Vorname',
          'Nachname',
          'Abteilung',
          'Urlaubsart',
          'Beginn',
          'Ende',
          'Arbeitstage',
          'Status',
          'Begründung',
          'Prüfer',
          'Prüfdatum',
          'Ablehnungsgrund',
        ],
        records.map((row) => [
          row.id,
          row.employeeNumber,
          row.firstName,
          row.lastName,
          row.departmentName,
          getLeaveTypeLabel(row.leaveTypeName),
          row.startDate,
          row.endDate,
          row.requestedDays,
          getStatusLabel(row.status),
          row.reason,
          row.reviewerName,
          row.reviewedAt,
          row.rejectionReason,
        ])
      )
      return
    }

    if (tab === 'sickness') {
      downloadCsv(
        'krankmeldungsbericht.csv',
        [
          'ID',
          'Personalnummer',
          'Vorname',
          'Nachname',
          'Abteilung',
          'Abwesenheitsart',
          'Beginn',
          'Ende',
          'Status',
          'Bescheinigung vorhanden',
          'Mitarbeiterbemerkung',
          'Administratorvermerk',
          'Validierungsdatum',
          'Validiert von',
        ],
        records.map((row) => [
          row.id,
          row.employeeNumber,
          row.firstName,
          row.lastName,
          row.departmentName,
          getAbsenceTypeLabel(row.absenceType),
          row.startDate,
          row.endDate,
          getSicknessStatusLabel(row.status),
          row.certificateAvailable ? 'Ja' : 'Nein',
          row.employeeNote,
          row.administratorNote,
          row.validatedAt,
          row.validatorName,
        ])
      )
      return
    }

    if (tab === 'overview') {
      downloadCsv(
        'abwesenheitsuebersicht.csv',
        [
          'Datensatztyp',
          'Personalnummer',
          'Name',
          'Abteilung',
          'Art',
          'Beginn',
          'Ende',
          'Status',
        ],
        records.map((row) => [
          getRecordTypeLabel(row.recordType),
          row.employeeNumber,
          row.employeeName,
          row.departmentName,
          row.recordType === 'LEAVE'
            ? getLeaveTypeLabel(row.typeName)
            : getAbsenceTypeLabel(row.typeName),
          row.startDate,
          row.endDate,
          row.recordType === 'LEAVE'
            ? getStatusLabel(row.status)
            : getSicknessStatusLabel(row.status),
        ])
      )
      return
    }
  }

  return (
    <AdminPage
      eyebrow="Administration"
      title="Berichte"
      lead="Auswertungen zu Urlaub, Krankmeldungen und der kombinierten Abwesenheitsübersicht. CSV-Export erfolgt lokal im Browser."
      actions={
        <button
          type="button"
          className="btn-primary"
          onClick={exportCsv}
          disabled={isLoading || records.length === 0}
        >
          CSV exportieren
        </button>
      }
    >
      <div className="report-tabs" role="tablist">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            className={tab === item.id ? 'report-tab is-active' : 'report-tab'}
            onClick={() => {
              setTab(item.id)
              setStatus('')
              setAbsenceType('')
              setLeaveTypeId('')
              setRecordType('')
            }}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="toolbar toolbar-admin-sick">
        <>
          <select
            value={employeeId}
            onChange={(event) => setEmployeeId(event.target.value)}
            aria-label="Mitarbeiter"
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
            aria-label="Abteilung"
          >
            <option value="">Alle Abteilungen</option>
            {departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </select>
        </>

        {tab === 'leave' ? (
          <>
            <select
              value={leaveTypeId}
              onChange={(event) => setLeaveTypeId(event.target.value)}
              aria-label="Urlaubsart"
            >
              <option value="">Alle Urlaubsarten</option>
              {leaveTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {getLeaveTypeLabel(type.name)}
                </option>
              ))}
            </select>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              aria-label="Status"
            >
              <option value="">Alle Status</option>
              <option value="PENDING">Ausstehend</option>
              <option value="APPROVED">Genehmigt</option>
              <option value="REJECTED">Abgelehnt</option>
              <option value="CANCELLED">Storniert</option>
            </select>
          </>
        ) : null}

        {tab === 'sickness' ? (
          <>
            <select
              value={absenceType}
              onChange={(event) => setAbsenceType(event.target.value)}
              aria-label="Abwesenheitsart"
            >
              <option value="">Alle Arten</option>
              <option value="SICK_LEAVE">Krankmeldung</option>
              <option value="CARE_LEAVE">Pflegefreistellung</option>
            </select>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              aria-label="Status"
            >
              <option value="">Alle Status</option>
              <option value="REPORTED">Gemeldet</option>
              <option value="DOCUMENT_PENDING">Dokument ausstehend</option>
              <option value="VALIDATED">Validiert</option>
              <option value="REJECTED">Abgelehnt</option>
              <option value="CLOSED">Abgeschlossen</option>
            </select>
          </>
        ) : null}

        {tab === 'overview' ? (
          <select
            value={recordType}
            onChange={(event) => setRecordType(event.target.value)}
            aria-label="Datensatztyp"
          >
            <option value="">Urlaub und Krankmeldung</option>
            <option value="LEAVE">Nur Urlaub</option>
            <option value="SICKNESS_ABSENCE">Nur Krankmeldung</option>
          </select>
        ) : null}

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

      <p className="field-hint">{total} Datensätze</p>
      {error ? <p className="form-error">{error}</p> : null}
      {isLoading ? <p>Daten werden geladen…</p> : null}
      {!isLoading && records.length === 0 ? (
        <p>Keine Datensätze für die gewählten Filter.</p>
      ) : null}

      {!isLoading && tab === 'leave' && records.length > 0 ? (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Personalnummer</th>
                <th>Name</th>
                <th>Abteilung</th>
                <th>Urlaubsart</th>
                <th>Beginn</th>
                <th>Ende</th>
                <th>Tage</th>
                <th>Status</th>
                <th>Prüfer</th>
              </tr>
            </thead>
            <tbody>
              {records.map((row) => (
                <tr key={row.id}>
                  <td>{row.employeeNumber}</td>
                  <td>
                    {row.firstName} {row.lastName}
                  </td>
                  <td>{row.departmentName}</td>
                  <td>{getLeaveTypeLabel(row.leaveTypeName)}</td>
                  <td>{formatDate(row.startDate)}</td>
                  <td>{formatDate(row.endDate)}</td>
                  <td>{row.requestedDays}</td>
                  <td>{getStatusLabel(row.status)}</td>
                  <td>{row.reviewerName || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {!isLoading && tab === 'sickness' && records.length > 0 ? (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Personalnummer</th>
                <th>Name</th>
                <th>Abteilung</th>
                <th>Art</th>
                <th>Beginn</th>
                <th>Ende</th>
                <th>Status</th>
                <th>Bescheinigung</th>
                <th>Validiert von</th>
              </tr>
            </thead>
            <tbody>
              {records.map((row) => (
                <tr key={row.id}>
                  <td>{row.employeeNumber}</td>
                  <td>
                    {row.firstName} {row.lastName}
                  </td>
                  <td>{row.departmentName}</td>
                  <td>{getAbsenceTypeLabel(row.absenceType)}</td>
                  <td>{formatDate(row.startDate)}</td>
                  <td>{formatDate(row.endDate)}</td>
                  <td>{getSicknessStatusLabel(row.status)}</td>
                  <td>{row.certificateAvailable ? 'Ja' : 'Nein'}</td>
                  <td>{row.validatorName || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {!isLoading && tab === 'overview' && records.length > 0 ? (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Typ</th>
                <th>Personalnummer</th>
                <th>Name</th>
                <th>Abteilung</th>
                <th>Art</th>
                <th>Beginn</th>
                <th>Ende</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {records.map((row, index) => (
                <tr key={`${row.recordType}-${row.employeeNumber}-${row.startDate}-${index}`}>
                  <td>{getRecordTypeLabel(row.recordType)}</td>
                  <td>{row.employeeNumber}</td>
                  <td>{row.employeeName}</td>
                  <td>{row.departmentName}</td>
                  <td>
                    {row.recordType === 'LEAVE'
                      ? getLeaveTypeLabel(row.typeName)
                      : getAbsenceTypeLabel(row.typeName)}
                  </td>
                  <td>{formatDate(row.startDate)}</td>
                  <td>{formatDate(row.endDate)}</td>
                  <td>
                    {row.recordType === 'LEAVE'
                      ? getStatusLabel(row.status)
                      : getSicknessStatusLabel(row.status)}
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

export default ReportsPage
