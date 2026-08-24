import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiRequest } from '../api'
import AdminPage from '../components/AdminPage'
import { downloadCsv } from '../csvExport'
import { useLanguage } from '../i18n/LanguageContext'
import {
  formatDate,
  getAbsenceTypeLabel,
  getLeaveTypeLabel,
  getRecordTypeLabel,
  getSicknessStatusLabel,
  getStatusLabel,
} from '../leaveLabels'

function ReportsPage() {
  const navigate = useNavigate()
  const { t, language } = useLanguage()
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

  const tabs = [
    { id: 'leave', label: t('reports.leaveTab') },
    { id: 'sickness', label: t('reports.sicknessTab') },
    { id: 'overview', label: t('reports.overviewTab') },
  ]

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
        t('reports.csvLeave'),
        [
          t('audit.id'),
          t('table.number'),
          t('common.firstName'),
          t('common.lastName'),
          t('common.department'),
          t('table.leaveType'),
          t('table.start'),
          t('table.end'),
          t('common.workingDays'),
          t('common.status'),
          t('common.reason'),
          t('table.reviewer'),
          t('common.reviewDate'),
          t('common.rejectionReason'),
        ],
        records.map((row) => [
          row.id,
          row.employeeNumber,
          row.firstName,
          row.lastName,
          row.departmentName,
          getLeaveTypeLabel(row.leaveTypeName, t),
          row.startDate,
          row.endDate,
          row.requestedDays,
          getStatusLabel(row.status, t),
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
        t('reports.csvSickness'),
        [
          t('audit.id'),
          t('table.number'),
          t('common.firstName'),
          t('common.lastName'),
          t('common.department'),
          t('sicknessList.type'),
          t('table.start'),
          t('table.end'),
          t('common.status'),
          t('common.certificateAvailable'),
          t('common.employeeNote'),
          t('common.administratorNote'),
          t('common.validatedAt'),
          t('table.validatedBy'),
        ],
        records.map((row) => [
          row.id,
          row.employeeNumber,
          row.firstName,
          row.lastName,
          row.departmentName,
          getAbsenceTypeLabel(row.absenceType, t),
          row.startDate,
          row.endDate,
          getSicknessStatusLabel(row.status, t),
          row.certificateAvailable ? t('common.yes') : t('common.no'),
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
        t('reports.csvOverview'),
        [
          t('common.recordType'),
          t('table.number'),
          t('table.name'),
          t('common.department'),
          t('table.kind'),
          t('table.start'),
          t('table.end'),
          t('common.status'),
        ],
        records.map((row) => [
          getRecordTypeLabel(row.recordType, t),
          row.employeeNumber,
          row.employeeName,
          row.departmentName,
          row.recordType === 'LEAVE'
            ? getLeaveTypeLabel(row.typeName, t)
            : getAbsenceTypeLabel(row.typeName, t),
          row.startDate,
          row.endDate,
          row.recordType === 'LEAVE'
            ? getStatusLabel(row.status, t)
            : getSicknessStatusLabel(row.status, t),
        ])
      )
    }
  }

  return (
    <AdminPage
      eyebrow={t('reports.eyebrow')}
      title={t('reports.title')}
      lead={t('reports.lead')}
      actions={
        <button
          type="button"
          className="btn-primary"
          onClick={exportCsv}
          disabled={isLoading || records.length === 0}
        >
          {t('reports.export')}
        </button>
      }
    >
      <div className="report-tabs" role="tablist">
        {tabs.map((item) => (
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
            aria-label={t('common.employee')}
          >
            <option value="">{t('common.allEmployees')}</option>
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.firstName} {employee.lastName}
              </option>
            ))}
          </select>
          <select
            value={departmentId}
            onChange={(event) => setDepartmentId(event.target.value)}
            aria-label={t('common.department')}
          >
            <option value="">{t('common.allDepartments')}</option>
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
              aria-label={t('table.leaveType')}
            >
              <option value="">{t('common.allLeaveTypes')}</option>
              {leaveTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {getLeaveTypeLabel(type.name, t)}
                </option>
              ))}
            </select>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              aria-label={t('common.status')}
            >
              <option value="">{t('common.allStatuses')}</option>
              <option value="PENDING">{t('status.PENDING')}</option>
              <option value="APPROVED">{t('status.APPROVED')}</option>
              <option value="REJECTED">{t('status.REJECTED')}</option>
              <option value="CANCELLED">{t('status.CANCELLED')}</option>
            </select>
          </>
        ) : null}

        {tab === 'sickness' ? (
          <>
            <select
              value={absenceType}
              onChange={(event) => setAbsenceType(event.target.value)}
              aria-label={t('sicknessList.type')}
            >
              <option value="">{t('common.allTypes')}</option>
              <option value="SICK_LEAVE">{t('absenceType.SICK_LEAVE')}</option>
              <option value="CARE_LEAVE">{t('absenceType.CARE_LEAVE')}</option>
            </select>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              aria-label={t('common.status')}
            >
              <option value="">{t('common.allStatuses')}</option>
              <option value="REPORTED">{t('status.REPORTED')}</option>
              <option value="DOCUMENT_PENDING">{t('status.DOCUMENT_PENDING')}</option>
              <option value="VALIDATED">{t('status.VALIDATED')}</option>
              <option value="REJECTED">{t('status.REJECTED')}</option>
              <option value="CLOSED">{t('status.CLOSED')}</option>
            </select>
          </>
        ) : null}

        {tab === 'overview' ? (
          <select
            value={recordType}
            onChange={(event) => setRecordType(event.target.value)}
            aria-label={t('common.recordType')}
          >
            <option value="">{t('reports.overviewBoth')}</option>
            <option value="LEAVE">{t('reports.overviewLeave')}</option>
            <option value="SICKNESS_ABSENCE">{t('reports.overviewSickness')}</option>
          </select>
        ) : null}

        <input
          type="date"
          value={fromDate}
          onChange={(event) => setFromDate(event.target.value)}
          aria-label={t('common.from')}
        />
        <input
          type="date"
          value={toDate}
          onChange={(event) => setToDate(event.target.value)}
          aria-label={t('common.to')}
        />
      </div>

      <p className="field-hint">{t('common.recordsCount', { count: total })}</p>
      {error ? <p className="form-error">{error}</p> : null}
      {isLoading ? <p>{t('common.loading')}</p> : null}
      {!isLoading && records.length === 0 ? (
        <p>{t('reports.empty')}</p>
      ) : null}

      {!isLoading && tab === 'leave' && records.length > 0 ? (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('table.number')}</th>
                <th>{t('table.name')}</th>
                <th>{t('common.department')}</th>
                <th>{t('table.leaveType')}</th>
                <th>{t('table.start')}</th>
                <th>{t('table.end')}</th>
                <th>{t('table.days')}</th>
                <th>{t('common.status')}</th>
                <th>{t('table.reviewer')}</th>
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
                  <td>{getLeaveTypeLabel(row.leaveTypeName, t)}</td>
                  <td>{formatDate(row.startDate, language)}</td>
                  <td>{formatDate(row.endDate, language)}</td>
                  <td>{row.requestedDays}</td>
                  <td>{getStatusLabel(row.status, t)}</td>
                  <td>{row.reviewerName || t('common.dash')}</td>
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
                <th>{t('table.number')}</th>
                <th>{t('table.name')}</th>
                <th>{t('common.department')}</th>
                <th>{t('table.kind')}</th>
                <th>{t('table.start')}</th>
                <th>{t('table.end')}</th>
                <th>{t('common.status')}</th>
                <th>{t('table.certificate')}</th>
                <th>{t('table.validatedBy')}</th>
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
                  <td>{getAbsenceTypeLabel(row.absenceType, t)}</td>
                  <td>{formatDate(row.startDate, language)}</td>
                  <td>{formatDate(row.endDate, language)}</td>
                  <td>{getSicknessStatusLabel(row.status, t)}</td>
                  <td>{row.certificateAvailable ? t('common.yes') : t('common.no')}</td>
                  <td>{row.validatorName || t('common.dash')}</td>
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
                <th>{t('table.type')}</th>
                <th>{t('table.number')}</th>
                <th>{t('table.name')}</th>
                <th>{t('common.department')}</th>
                <th>{t('table.kind')}</th>
                <th>{t('table.start')}</th>
                <th>{t('table.end')}</th>
                <th>{t('common.status')}</th>
              </tr>
            </thead>
            <tbody>
              {records.map((row, index) => (
                <tr key={`${row.recordType}-${row.employeeNumber}-${row.startDate}-${index}`}>
                  <td>{getRecordTypeLabel(row.recordType, t)}</td>
                  <td>{row.employeeNumber}</td>
                  <td>{row.employeeName}</td>
                  <td>{row.departmentName}</td>
                  <td>
                    {row.recordType === 'LEAVE'
                      ? getLeaveTypeLabel(row.typeName, t)
                      : getAbsenceTypeLabel(row.typeName, t)}
                  </td>
                  <td>{formatDate(row.startDate, language)}</td>
                  <td>{formatDate(row.endDate, language)}</td>
                  <td>
                    {row.recordType === 'LEAVE'
                      ? getStatusLabel(row.status, t)
                      : getSicknessStatusLabel(row.status, t)}
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
