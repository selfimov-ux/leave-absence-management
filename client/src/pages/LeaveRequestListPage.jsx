import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { apiRequest } from '../api'
import AdminPage from '../components/AdminPage'
import { useLanguage } from '../i18n/LanguageContext'
import { formatDate, getLeaveTypeLabel, getStatusLabel } from '../leaveLabels'

function LeaveRequestListPage() {
  const navigate = useNavigate()
  const { t, language } = useLanguage()
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
      t('leaveList.cancelConfirm', {
        from: formatDate(request.startDate, language),
        to: formatDate(request.endDate, language),
      })
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
      eyebrow={t('leaveList.eyebrow')}
      title={t('leaveList.title')}
      lead={t('leaveList.lead')}
      actions={
        <Link to="/leave-requests/new" className="btn-primary">
          {t('leaveList.newRequest')}
        </Link>
      }
    >
      <div className="toolbar">
        <select value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">{t('common.allStatuses')}</option>
          <option value="PENDING">{t('status.PENDING')}</option>
          <option value="APPROVED">{t('status.APPROVED')}</option>
          <option value="REJECTED">{t('status.REJECTED')}</option>
          <option value="CANCELLED">{t('status.CANCELLED')}</option>
        </select>
      </div>

      {error ? <p className="form-error">{error}</p> : null}
      {isLoading ? <p>{t('common.loading')}</p> : null}
      {!isLoading && requests.length === 0 ? (
        <p>{t('leaveList.empty')}</p>
      ) : null}

      {!isLoading && requests.length > 0 ? (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('leaveList.leaveType')}</th>
                <th>{t('leaveList.start')}</th>
                <th>{t('leaveList.end')}</th>
                <th>{t('common.workingDays')}</th>
                <th>{t('common.status')}</th>
                <th>{t('common.note')}</th>
                <th>{t('common.reviewedBy')}</th>
                <th>{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((request) => (
                <tr key={request.id}>
                  <td>{getLeaveTypeLabel(request.leaveTypeName, t)}</td>
                  <td>{formatDate(request.startDate, language)}</td>
                  <td>{formatDate(request.endDate, language)}</td>
                  <td>{request.requestedDays}</td>
                  <td>{getStatusLabel(request.status, t)}</td>
                  <td>{request.reason || t('common.dash')}</td>
                  <td>{request.reviewerName || t('common.dash')}</td>
                  <td className="actions">
                    {request.status === 'PENDING' ? (
                      <button
                        type="button"
                        className="link-button"
                        onClick={() => handleCancel(request)}
                      >
                        {t('leaveList.cancel')}
                      </button>
                    ) : (
                      t('common.dash')
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
