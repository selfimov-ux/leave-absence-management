const bcrypt = require('bcrypt')
const express = require('express')
const pool = require('../config/database')
const { authenticateToken, authorizeRoles } = require('../middleware/auth')
const { writeAuditLog } = require('../utils/audit')
const HttpError = require('../utils/httpError')
const {
  parseId,
  asTrimmedString,
  asNullableId,
  asBoolean,
  isValidEmail,
  ROLES,
} = require('../utils/request')

const router = express.Router()
const adminOnly = [authenticateToken, authorizeRoles('ADMINISTRATOR')]

const EMPLOYEE_SELECT = `
  SELECT e.id,
         e.employee_number,
         e.first_name,
         e.last_name,
         e.hire_date::text AS hire_date,
         e.department_id,
         e.manager_id,
         e.user_id,
         u.email,
         u.username,
         u.role,
         u.is_active,
         d.name AS department_name,
         m.first_name AS manager_first_name,
         m.last_name AS manager_last_name
    FROM employees e
    INNER JOIN users u ON u.id = e.user_id
    INNER JOIN departments d ON d.id = e.department_id
    LEFT JOIN employees m ON m.id = e.manager_id
`

function mapEmployee(row) {
  return {
    id: row.id,
    employeeNumber: row.employee_number,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    username: row.username,
    jobTitle: null,
    hireDate: row.hire_date,
    departmentId: row.department_id,
    departmentName: row.department_name,
    managerId: row.manager_id,
    managerName: row.manager_first_name
      ? `${row.manager_first_name} ${row.manager_last_name}`
      : null,
    role: row.role,
    isActive: row.is_active,
    userId: row.user_id,
  }
}

async function getEmployeeById(id, queryable = pool) {
  const result = await queryable.query(`${EMPLOYEE_SELECT} WHERE e.id = $1`, [id])
  return result.rows[0] || null
}

async function assertDepartmentExists(departmentId, queryable = pool) {
  const result = await queryable.query(
    'SELECT id FROM departments WHERE id = $1',
    [departmentId]
  )
  if (!result.rowCount) {
    throw new HttpError(400, 'Die ausgewählte Abteilung existiert nicht.')
  }
}

async function assertManagerExists(managerId, employeeId, queryable = pool) {
  if (managerId === null) {
    return
  }
  if (managerId === employeeId) {
    throw new HttpError(400, 'Ein Mitarbeiter kann nicht der eigene Vorgesetzte sein.')
  }

  const result = await queryable.query(
    'SELECT id FROM employees WHERE id = $1',
    [managerId]
  )
  if (!result.rowCount) {
    throw new HttpError(400, 'Der angegebene Vorgesetzte existiert nicht.')
  }
}

function readEmployeePayload(body, { isCreate }) {
  const employeeNumber = asTrimmedString(body?.employeeNumber)
  const firstName = asTrimmedString(body?.firstName)
  const lastName = asTrimmedString(body?.lastName)
  const email = asTrimmedString(body?.email).toLowerCase()
  const username = asTrimmedString(body?.username)
  const hireDate = asTrimmedString(body?.hireDate)
  const role = asTrimmedString(body?.role).toUpperCase()
  const departmentId = asNullableId(body?.departmentId)
  const managerId = asNullableId(body?.managerId)
  const password = typeof body?.password === 'string' ? body.password : ''

  if (!employeeNumber) {
    throw new HttpError(400, 'Die Personalnummer ist erforderlich.')
  }
  if (!firstName) {
    throw new HttpError(400, 'Der Vorname ist erforderlich.')
  }
  if (!lastName) {
    throw new HttpError(400, 'Der Nachname ist erforderlich.')
  }
  if (!email || !isValidEmail(email)) {
    throw new HttpError(400, 'Bitte eine gültige E-Mail-Adresse eingeben.')
  }
  if (!username) {
    throw new HttpError(400, 'Der Benutzername ist erforderlich.')
  }
  if (!hireDate) {
    throw new HttpError(400, 'Das Eintrittsdatum ist erforderlich.')
  }
  if (!ROLES.includes(role)) {
    throw new HttpError(400, 'Die ausgewählte Rolle ist ungültig.')
  }
  if (!departmentId) {
    throw new HttpError(400, 'Bitte eine Abteilung auswählen.')
  }
  if (managerId === undefined) {
    throw new HttpError(400, 'Die Angabe zum Vorgesetzten ist ungültig.')
  }
  if (isCreate && password.length < 8) {
    throw new HttpError(400, 'Das Anfangspasswort muss mindestens 8 Zeichen haben.')
  }

  return {
    employeeNumber,
    firstName,
    lastName,
    email,
    username,
    hireDate,
    role,
    departmentId,
    managerId,
    password,
  }
}

router.get('/', ...adminOnly, async (req, res, next) => {
  try {
    const result = await pool.query(
      `${EMPLOYEE_SELECT} ORDER BY e.last_name ASC, e.first_name ASC`
    )
    res.json(result.rows.map(mapEmployee))
  } catch (err) {
    next(err)
  }
})

router.get('/:id', ...adminOnly, async (req, res, next) => {
  try {
    const id = parseId(req.params.id)
    if (!id) {
      throw new HttpError(400, 'Die Mitarbeiter-ID ist ungültig.')
    }

    const employee = await getEmployeeById(id)
    if (!employee) {
      throw new HttpError(404, 'Der Mitarbeiter wurde nicht gefunden.')
    }

    res.json(mapEmployee(employee))
  } catch (err) {
    next(err)
  }
})

router.post('/', ...adminOnly, async (req, res, next) => {
  const client = await pool.connect()

  try {
    const data = readEmployeePayload(req.body, { isCreate: true })
    await assertDepartmentExists(data.departmentId, client)
    await assertManagerExists(data.managerId, null, client)

    const passwordHash = await bcrypt.hash(data.password, 10)

    await client.query('BEGIN')

    const userResult = await client.query(
      `INSERT INTO users (username, email, password_hash, role, is_active)
       VALUES ($1, $2, $3, $4, TRUE)
       RETURNING id`,
      [data.username, data.email, passwordHash, data.role]
    )
    const userId = userResult.rows[0].id

    const employeeResult = await client.query(
      `INSERT INTO employees (
          user_id, department_id, manager_id, employee_number,
          first_name, last_name, hire_date
        )
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [
        userId,
        data.departmentId,
        data.managerId,
        data.employeeNumber,
        data.firstName,
        data.lastName,
        data.hireDate,
      ]
    )
    const employeeId = employeeResult.rows[0].id

    await client.query('COMMIT')

    await writeAuditLog(pool, {
      userId: req.auth.userId,
      action: 'CREATE_EMPLOYEE',
      entityType: 'employees',
      entityId: employeeId,
      description: `Employee created: ${data.employeeNumber} (${data.username})`,
    })

    const created = await getEmployeeById(employeeId)
    res.status(201).json(mapEmployee(created))
  } catch (err) {
    try {
      await client.query('ROLLBACK')
    } catch {
      // The request already failed; ignore rollback errors.
    }
    next(err)
  } finally {
    client.release()
  }
})

router.put('/:id', ...adminOnly, async (req, res, next) => {
  const client = await pool.connect()

  try {
    const id = parseId(req.params.id)
    if (!id) {
      throw new HttpError(400, 'Die Mitarbeiter-ID ist ungültig.')
    }

    const existing = await getEmployeeById(id, client)
    if (!existing) {
      throw new HttpError(404, 'Der Mitarbeiter wurde nicht gefunden.')
    }

    const data = readEmployeePayload(req.body, { isCreate: false })
    await assertDepartmentExists(data.departmentId, client)
    await assertManagerExists(data.managerId, id, client)

    await client.query('BEGIN')

    await client.query(
      `UPDATE users
          SET username = $1,
              email = $2,
              role = $3,
              updated_at = CURRENT_TIMESTAMP
        WHERE id = $4`,
      [data.username, data.email, data.role, existing.user_id]
    )

    await client.query(
      `UPDATE employees
          SET department_id = $1,
              manager_id = $2,
              employee_number = $3,
              first_name = $4,
              last_name = $5,
              hire_date = $6,
              updated_at = CURRENT_TIMESTAMP
        WHERE id = $7`,
      [
        data.departmentId,
        data.managerId,
        data.employeeNumber,
        data.firstName,
        data.lastName,
        data.hireDate,
        id,
      ]
    )

    await client.query('COMMIT')

    await writeAuditLog(pool, {
      userId: req.auth.userId,
      action: 'UPDATE_EMPLOYEE',
      entityType: 'employees',
      entityId: id,
      description: `Employee updated: ${data.employeeNumber}`,
    })

    res.json(mapEmployee(await getEmployeeById(id)))
  } catch (err) {
    try {
      await client.query('ROLLBACK')
    } catch {
      // The request already failed; ignore rollback errors.
    }
    next(err)
  } finally {
    client.release()
  }
})

router.patch('/:id/status', ...adminOnly, async (req, res, next) => {
  try {
    const id = parseId(req.params.id)
    if (!id) {
      throw new HttpError(400, 'Die Mitarbeiter-ID ist ungültig.')
    }

    const isActive = asBoolean(req.body?.isActive)
    if (isActive === undefined) {
      throw new HttpError(400, 'Der Status ist ungültig.')
    }

    const existing = await getEmployeeById(id)
    if (!existing) {
      throw new HttpError(404, 'Der Mitarbeiter wurde nicht gefunden.')
    }

    if (!isActive && existing.id === req.auth.employeeId) {
      throw new HttpError(
        403,
        'Sie können Ihr eigenes Konto nicht deaktivieren.'
      )
    }

    await pool.query(
      `UPDATE users
          SET is_active = $1,
              updated_at = CURRENT_TIMESTAMP
        WHERE id = $2`,
      [isActive, existing.user_id]
    )

    await writeAuditLog(pool, {
      userId: req.auth.userId,
      action: isActive ? 'ACTIVATE_EMPLOYEE' : 'DEACTIVATE_EMPLOYEE',
      entityType: 'employees',
      entityId: id,
      description: `Employee status changed: ${existing.employee_number} -> ${isActive}`,
    })

    res.json(mapEmployee(await getEmployeeById(id)))
  } catch (err) {
    next(err)
  }
})

module.exports = router
