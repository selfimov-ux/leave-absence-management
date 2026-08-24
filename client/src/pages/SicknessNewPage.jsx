import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { apiFormRequest } from '../api'
import AdminPage from '../components/AdminPage'
import { useLanguage } from '../i18n/LanguageContext'

function SicknessNewPage() {
  const navigate = useNavigate()
  const { t } = useLanguage()
  const [absenceType, setAbsenceType] = useState('SICK_LEAVE')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [certificate, setCertificate] = useState(null)
  const [employeeNote, setEmployeeNote] = useState('')
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    if (!startDate) {
      setError(t('sicknessNew.needStart'))
      return
    }
    if (endDate && endDate < startDate) {
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
      formData.append('absenceType', absenceType)
      formData.append('startDate', startDate)
      if (endDate) {
        formData.append('endDate', endDate)
      }
      if (employeeNote.trim()) {
        formData.append('employeeNote', employeeNote.trim())
      }
      if (certificate) {
        formData.append('certificate', certificate)
      }
      await apiFormRequest('/api/sickness-absences', {
        method: 'POST',
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
      title={t('sicknessNew.title')}
      lead={t('sicknessNew.lead')}
    >
      {error ? <p className="form-error">{error}</p> : null}
      <form className="admin-form" onSubmit={handleSubmit} noValidate>
        <label htmlFor="absenceType">{t('sicknessList.type')}</label>
        <select
          id="absenceType"
          value={absenceType}
          onChange={(event) => setAbsenceType(event.target.value)}
        >
          <option value="SICK_LEAVE">{t('absenceType.SICK_LEAVE')}</option>
          <option value="CARE_LEAVE">{t('absenceType.CARE_LEAVE')}</option>
        </select>

        <label htmlFor="startDate">{t('sicknessNew.start')}</label>
        <input
          id="startDate"
          type="date"
          value={startDate}
          onChange={(event) => setStartDate(event.target.value)}
        />

        <label htmlFor="endDate">{t('sicknessNew.end')}</label>
        <input
          id="endDate"
          type="date"
          value={endDate}
          onChange={(event) => setEndDate(event.target.value)}
        />
        <p className="field-hint">{t('sicknessNew.dateHint')}</p>

        <label htmlFor="certificate">{t('sicknessList.certificate')}</label>
        <input
          id="certificate"
          type="file"
          accept="application/pdf,.pdf"
          onChange={(event) => setCertificate(event.target.files[0] || null)}
        />
        <p className="field-hint">{t('sicknessNew.fileHint')}</p>

        <label htmlFor="employeeNote">{t('sicknessNew.note')}</label>
        <textarea
          id="employeeNote"
          rows="3"
          value={employeeNote}
          onChange={(event) => setEmployeeNote(event.target.value)}
        />

        <div className="form-actions">
          <button type="submit" className="btn-primary" disabled={isSaving}>
            {isSaving ? t('sicknessNew.sending') : t('sicknessNew.submit')}
          </button>
          <Link to="/sickness-absences" className="btn-secondary">
            {t('common.cancel')}
          </Link>
        </div>
      </form>
    </AdminPage>
  )
}

export default SicknessNewPage
