import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { apiRequest } from '../api'
import AdminPage from '../components/AdminPage'
import CertificateCell from '../components/CertificateCell'
import { useLanguage } from '../i18n/LanguageContext'
import {
  formatDate,
  getAbsenceTypeLabel,
  getSicknessStatusLabel,
} from '../leaveLabels'

function SicknessListPage() {
  const navigate = useNavigate()
  const { t, language } = useLanguage()
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
      eyebrow={t('sicknessList.eyebrow')}
      title={t('sicknessList.title')}
      lead={t('sicknessList.lead')}
      actions={
        <Link to="/sickness-absences/new" className="btn-primary">
          {t('sicknessList.newReport')}
        </Link>
      }
    >
      <div className="toolbar">
        <select value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">{t('common.allStatuses')}</option>
          <option value="REPORTED">{t('status.REPORTED')}</option>
          <option value="DOCUMENT_PENDING">{t('status.DOCUMENT_PENDING')}</option>
          <option value="VALIDATED">{t('status.VALIDATED')}</option>
          <option value="REJECTED">{t('status.REJECTED')}</option>
          <option value="CLOSED">{t('status.CLOSED')}</option>
        </select>
      </div>

      {error ? <p className="form-error">{error}</p> : null}
      {isLoading ? <p>{t('common.loading')}</p> : null}
      {!isLoading && records.length === 0 ? (
        <p>{t('sicknessList.empty')}</p>
      ) : null}

      {!isLoading && records.length > 0 ? (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('sicknessList.type')}</th>
                <th>{t('leaveList.start')}</th>
                <th>{t('leaveList.end')}</th>
                <th>{t('common.status')}</th>
                <th>{t('sicknessList.certificate')}</th>
                <th>{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => {
                const canEdit =
                  record.status === 'REPORTED' ||
                  record.status === 'DOCUMENT_PENDING'
                return (
                  <tr key={record.id}>
                    <td>{getAbsenceTypeLabel(record.absenceType, t)}</td>
                    <td>{formatDate(record.startDate, language)}</td>
                    <td>{formatDate(record.endDate, language)}</td>
                    <td>{getSicknessStatusLabel(record.status, t)}</td>
                    <td>
                      <CertificateCell record={record} />
                    </td>
                    <td className="actions">
                      {canEdit ? (
                        <Link to={`/sickness-absences/${record.id}/edit`}>
                          {t('common.edit')}
                        </Link>
                      ) : (
                        t('common.dash')
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
