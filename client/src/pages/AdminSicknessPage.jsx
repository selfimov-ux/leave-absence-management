import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiRequest } from '../api'
import AdminPage from '../components/AdminPage'
import CertificateCell from '../components/CertificateCell'
import { useLanguage } from '../i18n/LanguageContext'
import {
  formatDate,
  getAbsenceTypeLabel,
  getSicknessStatusLabel,
} from '../leaveLabels'

const ACTION_TITLES = {
  document: 'adminSickness.documentTitle',
  validate: 'adminSickness.validateTitle',
  reject: 'adminSickness.rejectTitle',
  close: 'adminSickness.closeTitle',
}

const ACTION_CONFIRMS = {
  document: 'adminSickness.confirmDocument',
  validate: 'adminSickness.confirmValidate',
  reject: 'adminSickness.confirmReject',
  close: 'adminSickness.confirmClose',
}

function AdminSicknessPage() {
  const navigate = useNavigate()
  const { t, language } = useLanguage()
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

    if (!window.confirm(t(ACTION_CONFIRMS[action.type]))) {
      return
    }

    if (action.type === 'reject' && !note.trim()) {
      setError(t('adminSickness.needRejectReason'))
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
      setSuccess(t('adminSickness.saved'))
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <AdminPage
      eyebrow={t('adminSickness.eyebrow')}
      title={t('adminSickness.title')}
      lead={t('adminSickness.lead')}
    >
      <div className="toolbar toolbar-admin-sick">
        <select
          value={employeeId}
          onChange={(event) => setEmployeeId(event.target.value)}
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
        >
          <option value="">{t('common.allDepartments')}</option>
          {departments.map((department) => (
            <option key={department.id} value={department.id}>
              {department.name}
            </option>
          ))}
        </select>
        <select value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">{t('common.allStatuses')}</option>
          <option value="REPORTED">{t('status.REPORTED')}</option>
          <option value="DOCUMENT_PENDING">{t('status.DOCUMENT_PENDING')}</option>
          <option value="VALIDATED">{t('status.VALIDATED')}</option>
          <option value="REJECTED">{t('status.REJECTED')}</option>
          <option value="CLOSED">{t('status.CLOSED')}</option>
        </select>
        <select
          value={absenceType}
          onChange={(event) => setAbsenceType(event.target.value)}
        >
          <option value="">{t('common.allTypes')}</option>
          <option value="SICK_LEAVE">{t('absenceType.SICK_LEAVE')}</option>
          <option value="CARE_LEAVE">{t('absenceType.CARE_LEAVE')}</option>
        </select>
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

      {success ? <p className="form-success">{success}</p> : null}
      {error ? <p className="form-error">{error}</p> : null}
      {isLoading ? <p>{t('common.loading')}</p> : null}

      {action ? (
        <form className="admin-form" onSubmit={submitAction}>
          <h2>{t(ACTION_TITLES[action.type])}</h2>
          <p>
            {t('adminSickness.period', {
              name: action.record.employeeName,
              from: formatDate(action.record.startDate, language),
              to: formatDate(action.record.endDate, language),
            })}
          </p>
          <p>
            {t('adminSickness.certificate')}{' '}
            <CertificateCell record={action.record} />
          </p>
          {action.type !== 'close' ? (
            <>
              <label htmlFor="adminNote">
                {action.type === 'reject'
                  ? t('adminSickness.rejectNote')
                  : t('adminSickness.adminNote')}
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
              {t('common.confirm')}
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setAction(null)}
            >
              {t('common.cancel')}
            </button>
          </div>
        </form>
      ) : null}

      {!isLoading && records.length === 0 ? (
        <p>{t('adminSickness.empty')}</p>
      ) : null}

      {!isLoading && records.length > 0 ? (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('common.employee')}</th>
                <th>{t('managerLeave.employeeNumber')}</th>
                <th>{t('common.department')}</th>
                <th>{t('sicknessList.type')}</th>
                <th>{t('leaveList.start')}</th>
                <th>{t('leaveList.end')}</th>
                <th>{t('common.status')}</th>
                <th>{t('sicknessList.certificate')}</th>
                <th>{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr key={record.id}>
                  <td>{record.employeeName}</td>
                  <td>{record.employeeNumber}</td>
                  <td>{record.departmentName}</td>
                  <td>{getAbsenceTypeLabel(record.absenceType, t)}</td>
                  <td>{formatDate(record.startDate, language)}</td>
                  <td>{formatDate(record.endDate, language)}</td>
                  <td>{getSicknessStatusLabel(record.status, t)}</td>
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
                          {t('adminSickness.requestDocument')}
                        </button>
                        <button
                          type="button"
                          className="link-button"
                          onClick={() => startAction('validate', record)}
                        >
                          {t('adminSickness.validate')}
                        </button>
                        <button
                          type="button"
                          className="link-button"
                          onClick={() => startAction('reject', record)}
                        >
                          {t('adminSickness.reject')}
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
                          {t('adminSickness.validate')}
                        </button>
                        <button
                          type="button"
                          className="link-button"
                          onClick={() => startAction('reject', record)}
                        >
                          {t('adminSickness.reject')}
                        </button>
                      </>
                    ) : null}
                    {record.status === 'VALIDATED' ? (
                      <button
                        type="button"
                        className="link-button"
                        onClick={() => startAction('close', record)}
                      >
                        {t('adminSickness.close')}
                      </button>
                    ) : null}
                    {record.status === 'REJECTED' || record.status === 'CLOSED'
                      ? t('common.dash')
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
