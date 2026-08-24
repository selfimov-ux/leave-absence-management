import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiRequest } from '../api'
import AdminPage from '../components/AdminPage'
import { useLanguage } from '../i18n/LanguageContext'
import { getLeaveTypeLabel } from '../leaveLabels'

const EMPTY_FORM = {
  name: '',
  description: '',
  isActive: true,
}

function LeaveTypePage() {
  const navigate = useNavigate()
  const { t } = useLanguage()
  const [leaveTypes, setLeaveTypes] = useState([])
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
      const rows = await apiRequest('/api/leave-types')
      setLeaveTypes(rows)
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

  function openEdit(leaveType) {
    setEditingId(leaveType.id)
    setForm({
      name: leaveType.name,
      description: leaveType.description || '',
      isActive: leaveType.isActive,
    })
    setShowForm(true)
    setError('')
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (!form.name.trim()) {
      setError(t('leaveTypes.needName'))
      return
    }

    setIsSaving(true)
    setError('')
    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      isActive: form.isActive,
    }

    try {
      if (editingId) {
        await apiRequest(`/api/leave-types/${editingId}`, {
          method: 'PUT',
          body: payload,
        })
      } else {
        await apiRequest('/api/leave-types', {
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

  async function handleStatusChange(leaveType) {
    const nextActive = !leaveType.isActive
    const confirmed = window.confirm(
      nextActive
        ? t('leaveTypes.activateConfirm', { name: leaveType.name })
        : t('leaveTypes.deactivateConfirm', { name: leaveType.name })
    )
    if (!confirmed) {
      return
    }

    try {
      const updated = await apiRequest(`/api/leave-types/${leaveType.id}/status`, {
        method: 'PATCH',
        body: { isActive: nextActive },
      })
      setLeaveTypes((current) =>
        current.map((item) => (item.id === updated.id ? updated : item))
      )
    } catch (err) {
      window.alert(err.message)
    }
  }

  return (
    <AdminPage
      eyebrow={t('leaveTypes.eyebrow')}
      title={t('leaveTypes.title')}
      lead={t('leaveTypes.lead')}
      actions={
        <button type="button" className="btn-primary" onClick={openCreate}>
          {t('leaveTypes.create')}
        </button>
      }
    >
      {error ? <p className="form-error">{error}</p> : null}
      {isLoading ? <p>{t('common.loading')}</p> : null}

      {showForm ? (
        <form className="admin-form" onSubmit={handleSubmit} noValidate>
          <h2>
            {editingId ? t('leaveTypes.editTitle') : t('leaveTypes.newTitle')}
          </h2>
          <label htmlFor="leaveTypeName">{t('leaveTypes.name')}</label>
          <input
            id="leaveTypeName"
            value={form.name}
            onChange={(event) =>
              setForm((current) => ({ ...current, name: event.target.value }))
            }
          />
          <label htmlFor="leaveTypeDescription">{t('leaveTypes.description')}</label>
          <textarea
            id="leaveTypeDescription"
            rows="3"
            value={form.description}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                description: event.target.value,
              }))
            }
          />
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  isActive: event.target.checked,
                }))
              }
            />
            {t('employees.active')}
          </label>
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

      {!isLoading && leaveTypes.length === 0 ? (
        <p>{t('leaveTypes.empty')}</p>
      ) : null}

      {!isLoading && leaveTypes.length > 0 ? (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('leaveTypes.name')}</th>
                <th>{t('leaveTypes.description')}</th>
                <th>{t('leaveTypes.annualLimit')}</th>
                <th>{t('common.status')}</th>
                <th>{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {leaveTypes.map((leaveType) => (
                <tr
                  key={leaveType.id}
                  className={leaveType.isActive ? '' : 'row-inactive'}
                >
                  <td>{getLeaveTypeLabel(leaveType.name, t)}</td>
                  <td>{leaveType.description || t('common.dash')}</td>
                  <td>{t('leaveTypes.perBalance')}</td>
                  <td>
                    <span
                      className={
                        leaveType.isActive ? 'badge badge-active' : 'badge badge-inactive'
                      }
                    >
                      {leaveType.isActive
                        ? t('employees.active')
                        : t('employees.inactive')}
                    </span>
                  </td>
                  <td className="actions">
                    <button
                      type="button"
                      className="link-button"
                      onClick={() => openEdit(leaveType)}
                    >
                      {t('common.edit')}
                    </button>
                    <button
                      type="button"
                      className="link-button"
                      onClick={() => handleStatusChange(leaveType)}
                    >
                      {leaveType.isActive
                        ? t('employees.deactivate')
                        : t('employees.activate')}
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

export default LeaveTypePage
