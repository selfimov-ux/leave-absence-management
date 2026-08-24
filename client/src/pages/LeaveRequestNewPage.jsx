import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { apiRequest } from '../api'
import AdminPage from '../components/AdminPage'
import { useLanguage } from '../i18n/LanguageContext'
import { countWorkingDays, getLeaveTypeLabel } from '../leaveLabels'

function LeaveRequestNewPage() {
  const navigate = useNavigate()
  const { t } = useLanguage()
  const [leaveTypes, setLeaveTypes] = useState([])
  const [leaveTypeId, setLeaveTypeId] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const workingDays = useMemo(
    () => countWorkingDays(startDate, endDate),
    [startDate, endDate]
  )

  useEffect(() => {
    async function loadTypes() {
      try {
        const rows = await apiRequest('/api/leave-types')
        setLeaveTypes(rows.filter((item) => item.isActive))
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

    loadTypes()
  }, [navigate])

  async function handleSubmit(event) {
    event.preventDefault()
    if (!leaveTypeId) {
      setError(t('leaveNew.needType'))
      return
    }
    if (!startDate || !endDate) {
      setError(t('leaveNew.needDates'))
      return
    }
    if (startDate > endDate) {
      setError(t('leaveNew.endBeforeStart'))
      return
    }
    if (workingDays <= 0) {
      setError(t('leaveNew.noWorkingDays'))
      return
    }

    setIsSaving(true)
    setError('')
    try {
      await apiRequest('/api/leave-requests', {
        method: 'POST',
        body: {
          leaveTypeId: Number(leaveTypeId),
          startDate,
          endDate,
          reason: reason.trim() || undefined,
        },
      })
      navigate('/leave-requests', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <AdminPage
      eyebrow={t('leaveNew.eyebrow')}
      title={t('leaveNew.title')}
      lead={t('leaveNew.lead')}
    >
      {isLoading ? <p>{t('common.loading')}</p> : null}
      {error ? <p className="form-error">{error}</p> : null}

      {!isLoading ? (
        <form className="admin-form" onSubmit={handleSubmit} noValidate>
          <label htmlFor="leaveTypeId">{t('leaveList.leaveType')}</label>
          <select
            id="leaveTypeId"
            value={leaveTypeId}
            onChange={(event) => setLeaveTypeId(event.target.value)}
          >
            <option value="">{t('leaveNew.choose')}</option>
            {leaveTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {getLeaveTypeLabel(type.name, t)}
              </option>
            ))}
          </select>

          <label htmlFor="startDate">{t('leaveNew.start')}</label>
          <input
            id="startDate"
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
          />

          <label htmlFor="endDate">{t('leaveNew.end')}</label>
          <input
            id="endDate"
            type="date"
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
          />

          <p className="field-hint">{t('leaveNew.daysHint', { count: workingDays })}</p>

          <label htmlFor="reason">{t('leaveNew.reason')}</label>
          <textarea
            id="reason"
            rows="3"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />

          <div className="form-actions">
            <button type="submit" className="btn-primary" disabled={isSaving}>
              {isSaving ? t('leaveNew.sending') : t('leaveNew.submit')}
            </button>
            <Link to="/leave-requests" className="btn-secondary">
              {t('common.cancel')}
            </Link>
          </div>
        </form>
      ) : null}
    </AdminPage>
  )
}

export default LeaveRequestNewPage
