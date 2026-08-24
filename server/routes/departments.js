const express = require('express')
const pool = require('../config/database')
const { authenticateToken, authorizeRoles } = require('../middleware/auth')
const { writeAuditLog } = require('../utils/audit')
const HttpError = require('../utils/httpError')
const {
  parseId,
  asTrimmedString,
  asNullableId,
} = require('../utils/request')

const router = express.Router()
const adminOnly = [authenticateToken, authorizeRoles('ADMINISTRATOR')]

function mapDepartment(row) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    managerId: row.manager_id,
    managerName: row.manager_first_name
      ? `${row.manager_first_name} ${row.manager_last_name}`
      : null,
  }
}

const DEPARTMENT_SELECT = `
  SELECT d.id,
         d.name,
         d.description,
         d.manager_id,
         m.first_name AS manager_first_name,
         m.last_name AS manager_last_name
    FROM departments d
    LEFT JOIN employees m ON m.id = d.manager_id
`

async function getDepartmentById(id) {
  const result = await pool.query(
    `${DEPARTMENT_SELECT} WHERE d.id = $1`,
    [id]
  )
  return result.rows[0] || null
}

async function assertManagerExists(managerId) {
  if (managerId === null) {
    return
  }

  const result = await pool.query(
    'SELECT id FROM employees WHERE id = $1',
    [managerId]
  )
  if (!result.rowCount) {
    throw new HttpError(400, 'Der angegebene Vorgesetzte existiert nicht.')
  }
}

function readDepartmentBody(body) {
  const name = asTrimmedString(body?.name)
  const description =
    typeof body?.description === 'string' ? body.description.trim() : ''
  const managerId = asNullableId(body?.managerId)

  if (!name) {
    throw new HttpError(400, 'Der Abteilungsname ist erforderlich.')
  }
  if (managerId === undefined) {
    throw new HttpError(400, 'Die Angabe zum Vorgesetzten ist ungültig.')
  }

  return { name, description: description || null, managerId }
}

router.get('/', authenticateToken, async (req, res, next) => {
  try {
    const result = await pool.query(`${DEPARTMENT_SELECT} ORDER BY d.name ASC`)
    res.json(result.rows.map(mapDepartment))
  } catch (err) {
    next(err)
  }
})

router.get('/:id', ...adminOnly, async (req, res, next) => {
  try {
    const id = parseId(req.params.id)
    if (!id) {
      throw new HttpError(400, 'Die Abteilungs-ID ist ungültig.')
    }

    const department = await getDepartmentById(id)
    if (!department) {
      throw new HttpError(404, 'Die Abteilung wurde nicht gefunden.')
    }

    res.json(mapDepartment(department))
  } catch (err) {
    next(err)
  }
})

router.post('/', ...adminOnly, async (req, res, next) => {
  try {
    const data = readDepartmentBody(req.body)
    await assertManagerExists(data.managerId)

    const inserted = await pool.query(
      `INSERT INTO departments (name, description, manager_id)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [data.name, data.description, data.managerId]
    )
    const id = inserted.rows[0].id

    await writeAuditLog(pool, {
      userId: req.auth.userId,
      action: 'CREATE_DEPARTMENT',
      entityType: 'departments',
      entityId: id,
      description: `Department created: ${data.name}`,
    })

    res.status(201).json(mapDepartment(await getDepartmentById(id)))
  } catch (err) {
    next(err)
  }
})

router.put('/:id', ...adminOnly, async (req, res, next) => {
  try {
    const id = parseId(req.params.id)
    if (!id) {
      throw new HttpError(400, 'Die Abteilungs-ID ist ungültig.')
    }

    const existing = await getDepartmentById(id)
    if (!existing) {
      throw new HttpError(404, 'Die Abteilung wurde nicht gefunden.')
    }

    const data = readDepartmentBody(req.body)
    await assertManagerExists(data.managerId)

    await pool.query(
      `UPDATE departments
          SET name = $1,
              description = $2,
              manager_id = $3,
              updated_at = CURRENT_TIMESTAMP
        WHERE id = $4`,
      [data.name, data.description, data.managerId, id]
    )

    await writeAuditLog(pool, {
      userId: req.auth.userId,
      action: 'UPDATE_DEPARTMENT',
      entityType: 'departments',
      entityId: id,
      description: `Department updated: ${data.name}`,
    })

    res.json(mapDepartment(await getDepartmentById(id)))
  } catch (err) {
    next(err)
  }
})

router.delete('/:id', ...adminOnly, async (req, res, next) => {
  try {
    const id = parseId(req.params.id)
    if (!id) {
      throw new HttpError(400, 'Die Abteilungs-ID ist ungültig.')
    }

    const existing = await getDepartmentById(id)
    if (!existing) {
      throw new HttpError(404, 'Die Abteilung wurde nicht gefunden.')
    }

    const assigned = await pool.query(
      'SELECT COUNT(*)::int AS count FROM employees WHERE department_id = $1',
      [id]
    )
    if (assigned.rows[0].count > 0) {
      throw new HttpError(
        409,
        'Die Abteilung kann nicht gelöscht werden, weil noch Mitarbeiter zugeordnet sind.'
      )
    }

    await pool.query('DELETE FROM departments WHERE id = $1', [id])

    await writeAuditLog(pool, {
      userId: req.auth.userId,
      action: 'DELETE_DEPARTMENT',
      entityType: 'departments',
      entityId: id,
      description: `Department deleted: ${existing.name}`,
    })

    res.json({
      status: 'ok',
      message: 'Die Abteilung wurde gelöscht.',
    })
  } catch (err) {
    next(err)
  }
})

module.exports = router
