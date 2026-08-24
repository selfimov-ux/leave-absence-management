import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiRequest } from '../api'
import AdminPage from '../components/AdminPage'

const EMPTY_FORM = {
  name: '',
  description: '',
  managerId: '',
}

function DepartmentPage() {
  const navigate = useNavigate()
  const [departments, setDepartments] = useState([])
  const [employees, setEmployees] = useState([])
  const [form, setForm] = useState(EMPTY_FORM)
  const [editingId, setEditingId] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  async function load() {
    setIsLoading(true)
    setError('')
    try {
      const [departmentRows, employeeRows] = await Promise.all([
        apiRequest('/api/departments'),
        apiRequest('/api/employees'),
      ])
      setDepartments(departmentRows)
      setEmployees(employeeRows)
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
  }, [])

  function openCreate() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setShowForm(true)
    setError('')
  }

  function openEdit(department) {
    setEditingId(department.id)
    setForm({
      name: department.name,
      description: department.description || '',
      managerId: department.managerId ? String(department.managerId) : '',
    })
    setShowForm(true)
    setError('')
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (!form.name.trim()) {
      setError('Der Abteilungsname ist erforderlich.')
      return
    }

    setIsSaving(true)
    setError('')
    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      managerId: form.managerId ? Number(form.managerId) : null,
    }

    try {
      if (editingId) {
        await apiRequest(`/api/departments/${editingId}`, {
          method: 'PUT',
          body: payload,
        })
      } else {
        await apiRequest('/api/departments', {
          method: 'POST',
          body: payload,
        })
      }
      setShowForm(false)
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete(department) {
    const confirmed = window.confirm(
      `Möchten Sie die Abteilung „${department.name}“ wirklich löschen?`
    )
    if (!confirmed) {
      return
    }

    try {
      await apiRequest(`/api/departments/${department.id}`, {
        method: 'DELETE',
      })
      await load()
    } catch (err) {
      window.alert(err.message)
    }
  }

  return (
    <AdminPage
      eyebrow="Administration"
      title="Abteilungsverwaltung"
      lead="Abteilungen anlegen, Vorgesetzte zuordnen und Abteilungen ohne zugeordnete Mitarbeiter löschen."
      actions={
        <button type="button" className="btn-primary" onClick={openCreate}>
          Neue Abteilung anlegen
        </button>
      }
    >
      {error ? <p className="form-error">{error}</p> : null}
      {isLoading ? <p>Daten werden geladen…</p> : null}

      {showForm ? (
        <form className="admin-form" onSubmit={handleSubmit} noValidate>
          <h2>{editingId ? 'Abteilung bearbeiten' : 'Neue Abteilung'}</h2>
          <label htmlFor="departmentName">Abteilung</label>
          <input
            id="departmentName"
            value={form.name}
            onChange={(event) =>
              setForm((current) => ({ ...current, name: event.target.value }))
            }
          />
          <label htmlFor="departmentDescription">Beschreibung</label>
          <textarea
            id="departmentDescription"
            rows="3"
            value={form.description}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                description: event.target.value,
              }))
            }
          />
          <label htmlFor="departmentManager">Vorgesetzter</label>
          <select
            id="departmentManager"
            value={form.managerId}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                managerId: event.target.value,
              }))
            }
          >
            <option value="">Kein Vorgesetzter</option>
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.firstName} {employee.lastName}
              </option>
            ))}
          </select>
          <div className="form-actions">
            <button type="submit" className="btn-primary" disabled={isSaving}>
              {isSaving ? 'Wird gespeichert…' : 'Speichern'}
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setShowForm(false)}
            >
              Abbrechen
            </button>
          </div>
        </form>
      ) : null}

      {!isLoading && departments.length === 0 ? (
        <p>Keine Abteilungen vorhanden.</p>
      ) : null}

      {!isLoading && departments.length > 0 ? (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Abteilung</th>
                <th>Beschreibung</th>
                <th>Vorgesetzter</th>
                <th>Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {departments.map((department) => (
                <tr key={department.id}>
                  <td>{department.name}</td>
                  <td>{department.description || '—'}</td>
                  <td>{department.managerName || '—'}</td>
                  <td className="actions">
                    <button
                      type="button"
                      className="link-button"
                      onClick={() => openEdit(department)}
                    >
                      Bearbeiten
                    </button>
                    <button
                      type="button"
                      className="link-button"
                      onClick={() => handleDelete(department)}
                    >
                      Löschen
                    </button>
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

export default DepartmentPage
