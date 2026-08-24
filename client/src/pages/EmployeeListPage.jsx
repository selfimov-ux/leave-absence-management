import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { apiRequest } from '../api'
import { getRoleLabel, getUser } from '../authStorage'
import AdminPage from '../components/AdminPage'

function EmployeeListPage() {
  const navigate = useNavigate()
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
    const confirmed = window.confirm(
      nextActive
        ? `Möchten Sie ${employee.firstName} ${employee.lastName} wirklich aktivieren?`
        : `Möchten Sie ${employee.firstName} ${employee.lastName} wirklich deaktivieren?`
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
      eyebrow="Administration"
      title="Mitarbeiterverwaltung"
      lead="Mitarbeiterkonten anlegen, bearbeiten und aktivieren oder deaktivieren."
      actions={
        <Link to="/admin/employees/new" className="btn-primary">
          Neuen Mitarbeiter anlegen
        </Link>
      }
    >
      <div className="toolbar">
        <input
          type="search"
          placeholder="Suche nach Nummer, Name oder E-Mail"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <select
          value={departmentId}
          onChange={(event) => setDepartmentId(event.target.value)}
        >
          <option value="">Alle Abteilungen</option>
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
          <option value="all">Alle Status</option>
          <option value="active">Aktiv</option>
          <option value="inactive">Inaktiv</option>
        </select>
      </div>

      {error ? <p className="form-error">{error}</p> : null}
      {isLoading ? <p>Daten werden geladen…</p> : null}
      {!isLoading && filtered.length === 0 ? (
        <p>Keine Mitarbeiter gefunden.</p>
      ) : null}

      {!isLoading && filtered.length > 0 ? (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Personalnummer</th>
                <th>Name</th>
                <th>E-Mail</th>
                <th>Abteilung</th>
                <th>Vorgesetzter</th>
                <th>Rolle</th>
                <th>Status</th>
                <th>Aktionen</th>
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
                    <td>{employee.managerName || '—'}</td>
                    <td>{getRoleLabel(employee.role)}</td>
                    <td>
                      <span
                        className={
                          employee.isActive ? 'badge badge-active' : 'badge badge-inactive'
                        }
                      >
                        {employee.isActive ? 'Aktiv' : 'Inaktiv'}
                      </span>
                    </td>
                    <td className="actions">
                      <Link to={`/admin/employees/${employee.id}/edit`}>
                        Bearbeiten
                      </Link>
                      <button
                        type="button"
                        className="link-button"
                        disabled={isSelf && employee.isActive}
                        title={
                          isSelf
                            ? 'Sie können Ihr eigenes Konto nicht deaktivieren.'
                            : undefined
                        }
                        onClick={() => handleStatusChange(employee)}
                      >
                        {employee.isActive ? 'Deaktivieren' : 'Aktivieren'}
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
