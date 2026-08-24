import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { apiFormRequest } from '../api'
import AdminPage from '../components/AdminPage'

function SicknessNewPage() {
  const navigate = useNavigate()
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
      setError('Bitte ein Beginndatum angeben.')
      return
    }
    if (endDate && endDate < startDate) {
      setError('Das Endedatum darf nicht vor dem Beginndatum liegen.')
      return
    }
    if (certificate && certificate.type !== 'application/pdf') {
      setError('Nur PDF-Dateien sind erlaubt.')
      return
    }
    if (certificate && certificate.size > 5 * 1024 * 1024) {
      setError('Die Datei darf höchstens 5 MB groß sein.')
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
      eyebrow="Abwesenheit"
      title="Krankmeldung erfassen"
      lead="Die Meldung gilt nur für Sie selbst und wird zunächst mit dem Status „Gemeldet“ gespeichert."
    >
      {error ? <p className="form-error">{error}</p> : null}
      <form className="admin-form" onSubmit={handleSubmit} noValidate>
        <label htmlFor="absenceType">Abwesenheitsart</label>
        <select
          id="absenceType"
          value={absenceType}
          onChange={(event) => setAbsenceType(event.target.value)}
        >
          <option value="SICK_LEAVE">Krankmeldung</option>
          <option value="CARE_LEAVE">Pflegefreistellung</option>
        </select>

        <label htmlFor="startDate">Beginn</label>
        <input
          id="startDate"
          type="date"
          value={startDate}
          onChange={(event) => setStartDate(event.target.value)}
        />

        <label htmlFor="endDate">Ende</label>
        <input
          id="endDate"
          type="date"
          value={endDate}
          onChange={(event) => setEndDate(event.target.value)}
        />
        <p className="field-hint">
          Das Endedatum kann später ergänzt werden, solange die Meldung noch
          nicht validiert ist. Krankmeldungen reduzieren den Jahresurlaub nicht.
          Optional können Sie genau eine PDF-Datei als Bescheinigung anhängen.
        </p>

        <label htmlFor="certificate">Bescheinigungsreferenz</label>
        <input
          id="certificate"
          type="file"
          accept="application/pdf,.pdf"
          onChange={(event) => setCertificate(event.target.files[0] || null)}
        />
        <p className="field-hint">
          Erlaubt ist genau eine PDF-Datei bis 5 MB. Die Datei ist nur für Sie
          und die Administration sichtbar, nicht für Führungskräfte.
        </p>

        <label htmlFor="employeeNote">Bemerkung</label>
        <textarea
          id="employeeNote"
          rows="3"
          value={employeeNote}
          onChange={(event) => setEmployeeNote(event.target.value)}
        />

        <div className="form-actions">
          <button type="submit" className="btn-primary" disabled={isSaving}>
            {isSaving ? 'Wird gespeichert…' : 'Meldung senden'}
          </button>
          <Link to="/sickness-absences" className="btn-secondary">
            Abbrechen
          </Link>
        </div>
      </form>
    </AdminPage>
  )
}

export default SicknessNewPage
