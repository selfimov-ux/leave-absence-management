import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { apiFormRequest, apiRequest } from '../api'
import AdminPage from '../components/AdminPage'
import CertificateCell from '../components/CertificateCell'

function SicknessEditPage() {
  const { id } = useParams()
  const navigate = useNavigate()
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
          setError('Die Krankmeldung wurde nicht gefunden.')
          return
        }
        if (
          found.status !== 'REPORTED' &&
          found.status !== 'DOCUMENT_PENDING'
        ) {
          setError('Diese Krankmeldung kann nicht mehr bearbeitet werden.')
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
  }, [id, navigate])

  async function handleSubmit(event) {
    event.preventDefault()
    if (endDate && startDate && endDate < startDate) {
      setError('Das Endedatum darf nicht vor dem Beginndatum liegen.')
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
      eyebrow="Abwesenheit"
      title="Krankmeldung bearbeiten"
      lead="Nur Endedatum, Bescheinigung und Bemerkung können geändert werden."
    >
      {isLoading ? <p>Daten werden geladen…</p> : null}
      {error ? <p className="form-error">{error}</p> : null}

      {!isLoading && canEdit ? (
        <form className="admin-form" onSubmit={handleSubmit} noValidate>
          <p className="field-hint">Beginn: {startDate || '—'}</p>

          <label htmlFor="endDate">Ende</label>
          <input
            id="endDate"
            type="date"
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
          />

          <label htmlFor="certificate">Bescheinigungsreferenz</label>
          {record ? (
            <p className="field-hint">
              Aktuell: <CertificateCell record={record} />
            </p>
          ) : null}
          <input
            id="certificate"
            type="file"
            accept="application/pdf,image/jpeg,image/png,image/webp,image/gif,.pdf,.jpg,.jpeg,.png,.webp,.gif"
            onChange={(event) => setCertificate(event.target.files[0] || null)}
          />
          <p className="field-hint">
            Eine neue Datei ersetzt die bisherige Bescheinigung. Ohne Auswahl
            bleibt die vorhandene Datei erhalten.
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
              {isSaving ? 'Wird gespeichert…' : 'Speichern'}
            </button>
            <Link to="/sickness-absences" className="btn-secondary">
              Abbrechen
            </Link>
          </div>
        </form>
      ) : null}
    </AdminPage>
  )
}

export default SicknessEditPage
