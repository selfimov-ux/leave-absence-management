import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiRequest } from '../api'
import AdminPage from '../components/AdminPage'
import { useLanguage } from '../i18n/LanguageContext'
import {
  formatDate,
  getAbsenceTypeLabel,
  getSicknessStatusLabel,
} from '../leaveLabels'

function ManagerSicknessPage() {
  const navigate = useNavigate()
  const { t, language } = useLanguage()
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
      eyebrow={t('managerSickness.eyebrow')}
      title={t('managerSickness.title')}
      lead={t('managerSickness.lead')}
    >
      <p className="field-hint">{t('managerSickness.hint')}</p>
      <div className="toolbar toolbar-4">
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

      {error ? <p className="form-error">{error}</p> : null}
      {isLoading ? <p>{t('common.loading')}</p> : null}
      {!isLoading && records.length === 0 ? (
        <p>{t('managerSickness.empty')}</p>
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
                  <td>{t('common.dash')}</td>
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
