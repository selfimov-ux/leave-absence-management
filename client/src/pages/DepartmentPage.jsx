import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiRequest } from '../api'
import AdminPage from '../components/AdminPage'
import { useLanguage } from '../i18n/LanguageContext'

const EMPTY_FORM = {
  name: '',
  description: '',
  managerId: '',
}

function DepartmentPage() {
  const navigate = useNavigate()
  const { t } = useLanguage()
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
      setError(t('departments.needName'))
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
      t('departments.deleteConfirm', { name: department.name })
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
      eyebrow={t('departments.eyebrow')}
      title={t('departments.title')}
      lead={t('departments.lead')}
      actions={
        <button type="button" className="btn-primary" onClick={openCreate}>
          {t('departments.create')}
        </button>
      }
    >
      {error ? <p className="form-error">{error}</p> : null}
      {isLoading ? <p>{t('common.loading')}</p> : null}

      {showForm ? (
        <form className="admin-form" onSubmit={handleSubmit} noValidate>
          <h2>
            {editingId ? t('departments.editTitle') : t('departments.newTitle')}
          </h2>
          <label htmlFor="departmentName">{t('common.department')}</label>
          <input
            id="departmentName"
            value={form.name}
            onChange={(event) =>
              setForm((current) => ({ ...current, name: event.target.value }))
            }
          />
          <label htmlFor="departmentDescription">{t('departments.description')}</label>
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
          <label htmlFor="departmentManager">{t('departments.manager')}</label>
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
            <option value="">{t('common.noManager')}</option>
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.firstName} {employee.lastName}
              </option>
            ))}
          </select>
          <div className="form-actions">
            <button type="submit" className="btn-primary" disabled={isSaving}>
              {isSaving ? t('common.saving') : t('common.save')}
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setShowForm(false)}
            >
              {t('common.cancel')}
            </button>
          </div>
        </form>
      ) : null}

      {!isLoading && departments.length === 0 ? (
        <p>{t('departments.empty')}</p>
      ) : null}

      {!isLoading && departments.length > 0 ? (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('common.department')}</th>
                <th>{t('departments.description')}</th>
                <th>{t('departments.manager')}</th>
                <th>{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {departments.map((department) => (
                <tr key={department.id}>
                  <td>{department.name}</td>
                  <td>{department.description || t('common.dash')}</td>
                  <td>{department.managerName || t('common.dash')}</td>
                  <td className="actions">
                    <button
                      type="button"
                      className="link-button"
                      onClick={() => openEdit(department)}
                    >
                      {t('common.edit')}
                    </button>
                    <button
                      type="button"
                      className="link-button"
                      onClick={() => handleDelete(department)}
                    >
                      {t('common.delete')}
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
