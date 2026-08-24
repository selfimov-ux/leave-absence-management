import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiRequest } from '../api'
import AdminPage from '../components/AdminPage'
import { useLanguage } from '../i18n/LanguageContext'
import { formatDate, getLeaveTypeLabel, getStatusLabel } from '../leaveLabels'

function ManagerLeaveRequestPage() {
  const navigate = useNavigate()
  const { t, language } = useLanguage()
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
      t('managerLeave.approveConfirm', { name: request.employeeName })
    )
    if (!confirmed) {
      return
    }

    try {
      await apiRequest(`/api/manager/leave-requests/${request.id}/approve`, {
        method: 'PATCH',
      })
      setSuccess(t('managerLeave.approved'))
      await load()
    } catch (err) {
      setSuccess('')
      window.alert(err.message)
    }
  }

  async function handleReject(event) {
    event.preventDefault()
    if (!rejectionReason.trim()) {
      setError(t('managerLeave.needReason'))
      return
    }

    try {
      await apiRequest(`/api/manager/leave-requests/${rejecting.id}/reject`, {
        method: 'PATCH',
        body: { rejectionReason: rejectionReason.trim() },
      })
      setRejecting(null)
      setRejectionReason('')
      setSuccess(t('managerLeave.rejected'))
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <AdminPage
      eyebrow={t('managerLeave.eyebrow')}
      title={t('managerLeave.title')}
      lead={t('managerLeave.lead')}
    >
      <div className="toolbar toolbar-4">
        <select value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">{t('common.allStatuses')}</option>
          <option value="PENDING">{t('status.PENDING')}</option>
          <option value="APPROVED">{t('status.APPROVED')}</option>
          <option value="REJECTED">{t('status.REJECTED')}</option>
          <option value="CANCELLED">{t('status.CANCELLED')}</option>
        </select>
        <select
          value={leaveTypeId}
          onChange={(event) => setLeaveTypeId(event.target.value)}
        >
          <option value="">{t('common.allLeaveTypes')}</option>
          {leaveTypes.map((type) => (
            <option key={type.id} value={type.id}>
              {getLeaveTypeLabel(type.name, t)}
            </option>
          ))}
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
      {!isLoading && requests.length === 0 ? (
        <p>{t('managerLeave.empty')}</p>
      ) : null}

      {rejecting ? (
        <form className="admin-form" onSubmit={handleReject}>
          <h2>{t('managerLeave.rejectTitle')}</h2>
          <p>
            {t('managerLeave.period', {
              name: rejecting.employeeName,
              from: formatDate(rejecting.startDate, language),
              to: formatDate(rejecting.endDate, language),
            })}
          </p>
          <label htmlFor="rejectionReason">{t('managerLeave.rejectReason')}</label>
          <textarea
            id="rejectionReason"
            rows="3"
            value={rejectionReason}
            onChange={(event) => setRejectionReason(event.target.value)}
          />
          <div className="form-actions">
            <button type="submit" className="btn-primary">
              {t('managerLeave.saveReject')}
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setRejecting(null)
                setRejectionReason('')
              }}
            >
              {t('common.cancel')}
            </button>
          </div>
        </form>
      ) : null}

      {!isLoading && requests.length > 0 ? (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('managerLeave.name')}</th>
                <th>{t('managerLeave.employeeNumber')}</th>
                <th>{t('leaveList.leaveType')}</th>
                <th>{t('leaveList.start')}</th>
                <th>{t('leaveList.end')}</th>
                <th>{t('common.workingDays')}</th>
                <th>{t('common.note')}</th>
                <th>{t('common.status')}</th>
                <th>{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((request) => (
                <tr key={request.id}>
                  <td>{request.employeeName}</td>
                  <td>{request.employeeNumber}</td>
                  <td>{getLeaveTypeLabel(request.leaveTypeName, t)}</td>
                  <td>{formatDate(request.startDate, language)}</td>
                  <td>{formatDate(request.endDate, language)}</td>
                  <td>{request.requestedDays}</td>
                  <td>{request.reason || t('common.dash')}</td>
                  <td>{getStatusLabel(request.status, t)}</td>
                  <td className="actions">
                    {request.status === 'PENDING' ? (
                      <>
                        <button
                          type="button"
                          className="link-button"
                          onClick={() => handleApprove(request)}
                        >
                          {t('managerLeave.approve')}
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
                          {t('managerLeave.reject')}
                        </button>
                      </>
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

export default ManagerLeaveRequestPage
