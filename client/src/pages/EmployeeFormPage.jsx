import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { apiRequest } from '../api'
import AdminPage from '../components/AdminPage'
import { useLanguage } from '../i18n/LanguageContext'
import { getRoleLabel } from '../leaveLabels'

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
  const { t } = useLanguage()
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
      return t('employeeForm.requiredNumber')
    }
    if (!form.firstName.trim()) {
      return t('employeeForm.requiredFirstName')
    }
    if (!form.lastName.trim()) {
      return t('employeeForm.requiredLastName')
    }
    if (!form.email.trim()) {
      return t('employeeForm.requiredEmail')
    }
    if (!form.hireDate) {
      return t('employeeForm.requiredHireDate')
    }
    if (!form.departmentId) {
      return t('employeeForm.needDepartment')
    }
    if (!form.username.trim()) {
      return t('employeeForm.requiredUsername')
    }
    if (!isEdit && form.password.length < 8) {
      return t('employeeForm.passwordMin')
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
      eyebrow={t('employees.eyebrow')}
      title={isEdit ? t('employeeForm.editTitle') : t('employeeForm.newTitle')}
      lead={isEdit ? t('employeeForm.leadEdit') : t('employeeForm.leadNew')}
    >
      {isLoading ? <p>{t('common.loading')}</p> : null}
      {error ? <p className="form-error">{error}</p> : null}

      {!isLoading ? (
        <form className="admin-form" onSubmit={handleSubmit} noValidate>
          <label htmlFor="employeeNumber">{t('employeeForm.number')}</label>
          <input
            id="employeeNumber"
            value={form.employeeNumber}
            onChange={(event) => updateField('employeeNumber', event.target.value)}
          />

          <div className="form-row">
            <div>
              <label htmlFor="firstName">{t('employeeForm.firstName')}</label>
              <input
                id="firstName"
                value={form.firstName}
                onChange={(event) => updateField('firstName', event.target.value)}
              />
            </div>
            <div>
              <label htmlFor="lastName">{t('employeeForm.lastName')}</label>
              <input
                id="lastName"
                value={form.lastName}
                onChange={(event) => updateField('lastName', event.target.value)}
              />
            </div>
          </div>

          <label htmlFor="email">{t('employeeForm.email')}</label>
          <input
            id="email"
            type="email"
            value={form.email}
            onChange={(event) => updateField('email', event.target.value)}
          />

          <label htmlFor="jobTitle">{t('employeeForm.jobTitle')}</label>
          <input
            id="jobTitle"
            value={form.jobTitle}
            onChange={(event) => updateField('jobTitle', event.target.value)}
          />
          <p className="field-hint">{t('employeeForm.jobHint')}</p>

          <label htmlFor="hireDate">{t('employeeForm.hireDate')}</label>
          <input
            id="hireDate"
            type="date"
            value={form.hireDate}
            onChange={(event) => updateField('hireDate', event.target.value)}
          />

          <label htmlFor="departmentId">{t('employeeForm.department')}</label>
          <select
            id="departmentId"
            value={form.departmentId}
            onChange={(event) => updateField('departmentId', event.target.value)}
          >
            <option value="">{t('employeeForm.choose')}</option>
            {departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </select>

          <label htmlFor="managerId">{t('employeeForm.manager')}</label>
          <select
            id="managerId"
            value={form.managerId}
            onChange={(event) => updateField('managerId', event.target.value)}
          >
            <option value="">{t('common.noManager')}</option>
            {managerOptions.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.firstName} {employee.lastName}
              </option>
            ))}
          </select>

          <label htmlFor="username">{t('employeeForm.username')}</label>
          <input
            id="username"
            value={form.username}
            onChange={(event) => updateField('username', event.target.value)}
            autoComplete="off"
          />

          <label htmlFor="role">{t('employeeForm.role')}</label>
          <select
            id="role"
            value={form.role}
            onChange={(event) => updateField('role', event.target.value)}
          >
            <option value="EMPLOYEE">{getRoleLabel('EMPLOYEE', t)}</option>
            <option value="MANAGER">{getRoleLabel('MANAGER', t)}</option>
            <option value="ADMINISTRATOR">{getRoleLabel('ADMINISTRATOR', t)}</option>
          </select>

          {!isEdit ? (
            <>
              <label htmlFor="password">{t('employeeForm.passwordLabel')}</label>
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
              {isSaving ? t('common.saving') : t('common.save')}
            </button>
            <Link to="/admin/employees" className="btn-secondary">
              {t('common.cancel')}
            </Link>
          </div>
        </form>
      ) : null}
    </AdminPage>
  )
}

export default EmployeeFormPage
