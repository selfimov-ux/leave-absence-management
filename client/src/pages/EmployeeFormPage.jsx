import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { apiRequest } from '../api'
import AdminPage from '../components/AdminPage'
import { getRoleLabel } from '../authStorage'

const EMPTY_FORM = {
  employeeNumber: '',
  firstName: '',
  lastName: '',
  email: '',
  jobTitle: '',
  hireDate: '',
  departmentId: '',
  managerId: '',
  username: '',
  role: 'EMPLOYEE',
  password: '',
}

function EmployeeFormPage() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const [form, setForm] = useState(EMPTY_FORM)
  const [departments, setDepartments] = useState([])
  const [employees, setEmployees] = useState([])
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
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

        if (isEdit) {
          const employee = await apiRequest(`/api/employees/${id}`)
          setForm({
            employeeNumber: employee.employeeNumber,
            firstName: employee.firstName,
            lastName: employee.lastName,
            email: employee.email,
            jobTitle: '',
            hireDate: employee.hireDate || '',
            departmentId: String(employee.departmentId),
            managerId: employee.managerId ? String(employee.managerId) : '',
            username: employee.username,
            role: employee.role,
            password: '',
          })
        }
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
  }, [id, isEdit, navigate])

  function updateField(name, value) {
    setForm((current) => ({ ...current, [name]: value }))
  }

  function validate() {
    if (!form.employeeNumber.trim()) {
      return 'Die Personalnummer ist erforderlich.'
    }
    if (!form.firstName.trim()) {
      return 'Der Vorname ist erforderlich.'
    }
    if (!form.lastName.trim()) {
      return 'Der Nachname ist erforderlich.'
    }
    if (!form.email.trim()) {
      return 'Die E-Mail-Adresse ist erforderlich.'
    }
    if (!form.hireDate) {
      return 'Das Eintrittsdatum ist erforderlich.'
    }
    if (!form.departmentId) {
      return 'Bitte eine Abteilung auswählen.'
    }
    if (!form.username.trim()) {
      return 'Der Benutzername ist erforderlich.'
    }
    if (!isEdit && form.password.length < 8) {
      return 'Das Anfangspasswort muss mindestens 8 Zeichen haben.'
    }
    return ''
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }

    setIsSaving(true)
    setError('')

    const payload = {
      employeeNumber: form.employeeNumber.trim(),
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim(),
      jobTitle: form.jobTitle.trim(),
      hireDate: form.hireDate,
      departmentId: Number(form.departmentId),
      managerId: form.managerId ? Number(form.managerId) : null,
      username: form.username.trim(),
      role: form.role,
    }

    if (!isEdit) {
      payload.password = form.password
    }

    try {
      if (isEdit) {
        await apiRequest(`/api/employees/${id}`, {
          method: 'PUT',
          body: payload,
        })
      } else {
        await apiRequest('/api/employees', {
          method: 'POST',
          body: payload,
        })
      }
      navigate('/admin/employees', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setIsSaving(false)
    }
  }

  const managerOptions = employees.filter(
    (employee) => String(employee.id) !== String(id)
  )

  return (
    <AdminPage
      eyebrow="Administration"
      title={isEdit ? 'Mitarbeiter bearbeiten' : 'Neuen Mitarbeiter anlegen'}
      lead="Benutzerkonto und Mitarbeiterstammdaten werden gemeinsam gespeichert."
    >
      {isLoading ? <p>Daten werden geladen…</p> : null}
      {error ? <p className="form-error">{error}</p> : null}

      {!isLoading ? (
        <form className="admin-form" onSubmit={handleSubmit} noValidate>
          <label htmlFor="employeeNumber">Personalnummer</label>
          <input
            id="employeeNumber"
            value={form.employeeNumber}
            onChange={(event) => updateField('employeeNumber', event.target.value)}
          />

          <div className="form-row">
            <div>
              <label htmlFor="firstName">Vorname</label>
              <input
                id="firstName"
                value={form.firstName}
                onChange={(event) => updateField('firstName', event.target.value)}
              />
            </div>
            <div>
              <label htmlFor="lastName">Nachname</label>
              <input
                id="lastName"
                value={form.lastName}
                onChange={(event) => updateField('lastName', event.target.value)}
              />
            </div>
          </div>

          <label htmlFor="email">E-Mail-Adresse</label>
          <input
            id="email"
            type="email"
            value={form.email}
            onChange={(event) => updateField('email', event.target.value)}
          />

          <label htmlFor="jobTitle">Position</label>
          <input
            id="jobTitle"
            value={form.jobTitle}
            onChange={(event) => updateField('jobTitle', event.target.value)}
          />
          <p className="field-hint">
            Die aktuelle Datenbank speichert keine Position. Das Feld wird
            erfasst, aber nicht persistiert.
          </p>

          <label htmlFor="hireDate">Eintrittsdatum</label>
          <input
            id="hireDate"
            type="date"
            value={form.hireDate}
            onChange={(event) => updateField('hireDate', event.target.value)}
          />

          <label htmlFor="departmentId">Abteilung</label>
          <select
            id="departmentId"
            value={form.departmentId}
            onChange={(event) => updateField('departmentId', event.target.value)}
          >
            <option value="">Bitte auswählen</option>
            {departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </select>

          <label htmlFor="managerId">Vorgesetzter</label>
          <select
            id="managerId"
            value={form.managerId}
            onChange={(event) => updateField('managerId', event.target.value)}
          >
            <option value="">Kein Vorgesetzter</option>
            {managerOptions.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.firstName} {employee.lastName}
              </option>
            ))}
          </select>

          <label htmlFor="username">Benutzername</label>
          <input
            id="username"
            value={form.username}
            onChange={(event) => updateField('username', event.target.value)}
            autoComplete="off"
          />

          <label htmlFor="role">Rolle</label>
          <select
            id="role"
            value={form.role}
            onChange={(event) => updateField('role', event.target.value)}
          >
            <option value="EMPLOYEE">{getRoleLabel('EMPLOYEE')}</option>
            <option value="MANAGER">{getRoleLabel('MANAGER')}</option>
            <option value="ADMINISTRATOR">{getRoleLabel('ADMINISTRATOR')}</option>
          </select>

          {!isEdit ? (
            <>
              <label htmlFor="password">Anfangspasswort</label>
              <input
                id="password"
                type="password"
                value={form.password}
                onChange={(event) => updateField('password', event.target.value)}
                autoComplete="new-password"
              />
            </>
          ) : null}

          <div className="form-actions">
            <button type="submit" className="btn-primary" disabled={isSaving}>
              {isSaving ? 'Wird gespeichert…' : 'Speichern'}
            </button>
            <Link to="/admin/employees" className="btn-secondary">
              Abbrechen
            </Link>
          </div>
        </form>
      ) : null}
    </AdminPage>
  )
}

export default EmployeeFormPage
