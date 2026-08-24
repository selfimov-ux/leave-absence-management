import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { apiRequest } from '../api'
import { getUser } from '../authStorage'
import AdminPage from '../components/AdminPage'
import { useLanguage } from '../i18n/LanguageContext'
import { getRoleLabel } from '../leaveLabels'

function EmployeeListPage() {
  const navigate = useNavigate()
  const { t } = useLanguage()
  const currentUser = getUser()
  const [employees, setEmployees] = useState([])
  const [departments, setDepartments] = useState([])
  const [search, setSearch] = useState('')
  const [departmentId, setDepartmentId] = useState('')
  const [status, setStatus] = useState('all')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  async function loadEmployees() {
    setIsLoading(true)
    setError('')
    try {
      const [employeeRows, departmentRows] = await Promise.all([
        apiRequest('/api/employees'),
        apiRequest('/api/departments'),
      ])
      setEmployees(employeeRows)
      setDepartments(departmentRows)
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
    loadEmployees()
  }, [])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return employees.filter((employee) => {
      const matchesSearch =
        !term ||
        employee.employeeNumber.toLowerCase().includes(term) ||
        employee.firstName.toLowerCase().includes(term) ||
        employee.lastName.toLowerCase().includes(term) ||
        employee.email.toLowerCase().includes(term)
      const matchesDepartment =
        !departmentId || String(employee.departmentId) === departmentId
      const matchesStatus =
        status === 'all' ||
        (status === 'active' && employee.isActive) ||
        (status === 'inactive' && !employee.isActive)
      return matchesSearch && matchesDepartment && matchesStatus
    })
  }, [employees, search, departmentId, status])

  async function handleStatusChange(employee) {
    const nextActive = !employee.isActive
    const name = `${employee.firstName} ${employee.lastName}`
    const confirmed = window.confirm(
      nextActive
        ? t('employees.activateConfirm', { name })
        : t('employees.deactivateConfirm', { name })
    )
    if (!confirmed) {
      return
    }

    try {
      const updated = await apiRequest(`/api/employees/${employee.id}/status`, {
        method: 'PATCH',
        body: { isActive: nextActive },
      })
      setEmployees((current) =>
        current.map((item) => (item.id === updated.id ? updated : item))
      )
    } catch (err) {
      window.alert(err.message)
    }
  }

  return (
    <AdminPage
      eyebrow={t('employees.eyebrow')}
      title={t('employees.title')}
      lead={t('employees.lead')}
      actions={
        <Link to="/admin/employees/new" className="btn-primary">
          {t('employees.newEmployee')}
        </Link>
      }
    >
      <div className="toolbar">
        <input
          type="search"
          placeholder={t('employees.searchPlaceholder')}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <select
          value={departmentId}
          onChange={(event) => setDepartmentId(event.target.value)}
        >
          <option value="">{t('common.allDepartments')}</option>
          {departments.map((department) => (
            <option key={department.id} value={department.id}>
              {department.name}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
        >
          <option value="all">{t('employees.allStatus')}</option>
          <option value="active">{t('employees.active')}</option>
          <option value="inactive">{t('employees.inactive')}</option>
        </select>
      </div>

      {error ? <p className="form-error">{error}</p> : null}
      {isLoading ? <p>{t('common.loading')}</p> : null}
      {!isLoading && filtered.length === 0 ? (
        <p>{t('employees.empty')}</p>
      ) : null}

      {!isLoading && filtered.length > 0 ? (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('employees.number')}</th>
                <th>{t('employees.name')}</th>
                <th>{t('employees.email')}</th>
                <th>{t('common.department')}</th>
                <th>{t('employees.manager')}</th>
                <th>{t('employees.role')}</th>
                <th>{t('common.status')}</th>
                <th>{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((employee) => {
                const isSelf = employee.id === currentUser?.employeeId
                return (
                  <tr key={employee.id}>
                    <td>{employee.employeeNumber}</td>
                    <td>
                      {employee.firstName} {employee.lastName}
                    </td>
                    <td>{employee.email}</td>
                    <td>{employee.departmentName}</td>
                    <td>{employee.managerName || t('common.dash')}</td>
                    <td>{getRoleLabel(employee.role, t)}</td>
                    <td>
                      <span
                        className={
                          employee.isActive ? 'badge badge-active' : 'badge badge-inactive'
                        }
                      >
                        {employee.isActive
                          ? t('employees.active')
                          : t('employees.inactive')}
                      </span>
                    </td>
                    <td className="actions">
                      <Link to={`/admin/employees/${employee.id}/edit`}>
                        {t('common.edit')}
                      </Link>
                      <button
                        type="button"
                        className="link-button"
                        disabled={isSelf && employee.isActive}
                        title={
                          isSelf ? t('employees.cannotDeactivateSelf') : undefined
                        }
                        onClick={() => handleStatusChange(employee)}
                      >
                        {employee.isActive
                          ? t('employees.deactivate')
                          : t('employees.activate')}
                      </button>
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

export default EmployeeListPage
