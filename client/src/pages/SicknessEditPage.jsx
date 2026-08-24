import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { apiFormRequest, apiRequest } from '../api'
import AdminPage from '../components/AdminPage'
import CertificateCell from '../components/CertificateCell'
import { useLanguage } from '../i18n/LanguageContext'
import { formatDate } from '../leaveLabels'

function SicknessEditPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t, language } = useLanguage()
  const [endDate, setEndDate] = useState('')
  const [certificate, setCertificate] = useState(null)
  const [record, setRecord] = useState(null)
  const [employeeNote, setEmployeeNote] = useState('')
  const [startDate, setStartDate] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [canEdit, setCanEdit] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const rows = await apiRequest('/api/sickness-absences/me')
        const found = rows.find((item) => String(item.id) === String(id))
        if (!found) {
          setError(t('sicknessEdit.notFound'))
          return
        }
        if (
          found.status !== 'REPORTED' &&
          found.status !== 'DOCUMENT_PENDING'
        ) {
          setError(t('sicknessEdit.notEditable'))
          return
        }
        setRecord(found)
        setStartDate(found.startDate)
        setEndDate(found.endDate || '')
        setEmployeeNote(found.employeeNote || '')
        setCanEdit(true)
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

    load()
  }, [id, navigate, t])

  async function handleSubmit(event) {
    event.preventDefault()
    if (endDate && startDate && endDate < startDate) {
      setError(t('sicknessNew.endBeforeStart'))
      return
    }

    if (certificate && certificate.type !== 'application/pdf') {
      setError(t('sicknessNew.pdfOnly'))
      return
    }
    if (certificate && certificate.size > 5 * 1024 * 1024) {
      setError(t('sicknessNew.tooLarge'))
      return
    }

    setIsSaving(true)
    setError('')
    try {
      const formData = new FormData()
      if (endDate) {
        formData.append('endDate', endDate)
      }
      formData.append('employeeNote', employeeNote.trim())
      if (certificate) {
        formData.append('certificate', certificate)
      }
      await apiFormRequest(`/api/sickness-absences/${id}`, {
        method: 'PATCH',
        formData,
      })
      navigate('/sickness-absences', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <AdminPage
      eyebrow={t('sicknessNew.eyebrow')}
      title={t('sicknessEdit.title')}
      lead={t('sicknessEdit.lead')}
    >
      {isLoading ? <p>{t('common.loading')}</p> : null}
      {error ? <p className="form-error">{error}</p> : null}

      {!isLoading && canEdit ? (
        <form className="admin-form" onSubmit={handleSubmit} noValidate>
          <p className="field-hint">
            {t('sicknessEdit.startLabel', {
              date: formatDate(startDate, language),
            })}
          </p>

          <label htmlFor="endDate">{t('sicknessNew.end')}</label>
          <input
            id="endDate"
            type="date"
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
          />

          <label htmlFor="certificate">{t('sicknessList.certificate')}</label>
          {record ? (
            <p className="field-hint">
              {t('sicknessEdit.current')} <CertificateCell record={record} />
            </p>
          ) : null}
          <input
            id="certificate"
            type="file"
            accept="application/pdf,.pdf"
            onChange={(event) => setCertificate(event.target.files[0] || null)}
          />
          <p className="field-hint">{t('sicknessEdit.replaceHint')}</p>

          <label htmlFor="employeeNote">{t('sicknessNew.note')}</label>
          <textarea
            id="employeeNote"
            rows="3"
            value={employeeNote}
            onChange={(event) => setEmployeeNote(event.target.value)}
          />

          <div className="form-actions">
            <button type="submit" className="btn-primary" disabled={isSaving}>
              {isSaving ? t('common.saving') : t('common.save')}
            </button>
            <Link to="/sickness-absences" className="btn-secondary">
              {t('common.cancel')}
            </Link>
          </div>
        </form>
      ) : null}
    </AdminPage>
  )
}

export default SicknessEditPage
