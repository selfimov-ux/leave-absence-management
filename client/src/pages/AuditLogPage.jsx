import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiRequest } from '../api'
import AdminPage from '../components/AdminPage'
import { useLanguage } from '../i18n/LanguageContext'
import { formatDateTime, getAuditActionLabel } from '../leaveLabels'

const PAGE_SIZE = 20

const FILTER_ACTIONS = [
  'PASSWORD_CHANGED',
  'CREATE_LEAVE_REQUEST',
  'APPROVE_LEAVE_REQUEST',
  'REJECT_LEAVE_REQUEST',
  'CANCEL_LEAVE_REQUEST',
  'REPORT_SICKNESS_ABSENCE',
  'VALIDATE_SICKNESS_ABSENCE',
  'UPLOAD_SICKNESS_CERTIFICATE',
  'CREATE_EMPLOYEE',
  'UPDATE_EMPLOYEE',
]

function AuditLogPage() {
  const navigate = useNavigate()
  const { t, language } = useLanguage()
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
      eyebrow={t('audit.eyebrow')}
      title={t('audit.title')}
      lead={t('audit.lead')}
    >
      <div className="toolbar toolbar-admin-sick">
        <select
          value={userId}
          onChange={changeFilter(setUserId)}
          aria-label={t('audit.user')}
        >
          <option value="">{t('audit.allUsers')}</option>
          {users.map((user) => (
            <option key={user.userId} value={user.userId}>
              {user.label}
            </option>
          ))}
        </select>
        <select
          value={action}
          onChange={changeFilter(setAction)}
          aria-label={t('audit.action')}
        >
          <option value="">{t('audit.allActions')}</option>
          {FILTER_ACTIONS.map((code) => (
            <option key={code} value={code}>
              {getAuditActionLabel(code, t)}
            </option>
          ))}
        </select>
        <select
          value={entityType}
          onChange={changeFilter(setEntityType)}
          aria-label={t('audit.entity')}
        >
          <option value="">{t('audit.allEntities')}</option>
          <option value="leave_requests">leave_requests</option>
          <option value="sickness_absences">sickness_absences</option>
          <option value="employees">employees</option>
          <option value="departments">departments</option>
          <option value="leave_types">leave_types</option>
          <option value="users">users</option>
        </select>
        <input
          type="date"
          value={fromDate}
          onChange={changeFilter(setFromDate)}
          aria-label={t('audit.from')}
        />
        <input
          type="date"
          value={toDate}
          onChange={changeFilter(setToDate)}
          aria-label={t('audit.to')}
        />
      </div>

      {error ? <p className="form-error">{error}</p> : null}
      {isLoading ? <p>{t('common.loading')}</p> : null}
      {!isLoading && !error && records.length === 0 ? (
        <p>{t('audit.empty')}</p>
      ) : null}

      {!isLoading && records.length > 0 ? (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('audit.timestamp')}</th>
                <th>{t('audit.user')}</th>
                <th>{t('audit.action')}</th>
                <th>{t('audit.entity')}</th>
                <th>{t('audit.id')}</th>
                <th>{t('audit.description')}</th>
              </tr>
            </thead>
            <tbody>
              {records.map((row) => (
                <tr key={row.id}>
                  <td>{formatDateTime(row.timestamp, language)}</td>
                  <td>{row.actorName}</td>
                  <td>{getAuditActionLabel(row.action, t)}</td>
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
            {t('audit.previous')}
          </button>
          <span>{t('audit.pageOf', { page, totalPages })}</span>
          <button
            type="button"
            className="btn-secondary"
            disabled={page >= totalPages}
            onClick={() => setPage((current) => current + 1)}
          >
            {t('audit.next')}
          </button>
        </div>
      ) : null}
    </AdminPage>
  )
}

export default AuditLogPage
