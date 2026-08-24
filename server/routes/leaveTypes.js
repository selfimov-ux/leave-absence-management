const express = require('express')
const pool = require('../config/database')
const { authenticateToken, authorizeRoles } = require('../middleware/auth')
const { writeAuditLog } = require('../utils/audit')
const HttpError = require('../utils/httpError')
const { parseId, asTrimmedString, asBoolean } = require('../utils/request')

const router = express.Router()
const adminOnly = [authenticateToken, authorizeRoles('ADMINISTRATOR')]

function mapLeaveType(row) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    isActive: row.is_active,
    isPaid: row.is_paid,
    annualLimit: null,
  }
}

function readLeaveTypeBody(body) {
  const name = asTrimmedString(body?.name)
  const description =
    typeof body?.description === 'string' ? body.description.trim() : ''
  const isActive = asBoolean(body?.isActive)

  if (!name) {
    throw new HttpError(400, 'Der Name der Urlaubsart ist erforderlich.')
  }

  return {
    name: name || null,
    description: description || null,
    isActive: isActive === undefined ? true : isActive,
  }
}

async function getLeaveTypeById(id) {
  const result = await pool.query(
    `SELECT id, name, description, is_paid, is_active
       FROM leave_types
      WHERE id = $1`,
    [id]
  )
  return result.rows[0] || null
}

router.get('/', authenticateToken, async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT id, name, description, is_paid, is_active
         FROM leave_types
        ORDER BY name ASC`
    )
    res.json(result.rows.map(mapLeaveType))
  } catch (err) {
    next(err)
  }
})

router.post('/', ...adminOnly, async (req, res, next) => {
  try {
    const data = readLeaveTypeBody(req.body)

    const inserted = await pool.query(
      `INSERT INTO leave_types (name, description, is_active)
       VALUES ($1, $2, $3)
       RETURNING id, name, description, is_paid, is_active`,
      [data.name, data.description, data.isActive]
    )
    const row = inserted.rows[0]

    await writeAuditLog(pool, {
      userId: req.auth.userId,
      action: 'CREATE_LEAVE_TYPE',
      entityType: 'leave_types',
      entityId: row.id,
      description: `Leave type created: ${row.name}`,
    })

    res.status(201).json(mapLeaveType(row))
  } catch (err) {
    next(err)
  }
})

router.put('/:id', ...adminOnly, async (req, res, next) => {
  try {
    const id = parseId(req.params.id)
    if (!id) {
      throw new HttpError(400, 'Die ID der Urlaubsart ist ungültig.')
    }

    const existing = await getLeaveTypeById(id)
    if (!existing) {
      throw new HttpError(404, 'Die Urlaubsart wurde nicht gefunden.')
    }

    const data = readLeaveTypeBody(req.body)
    const updated = await pool.query(
      `UPDATE leave_types
          SET name = $1,
              description = $2,
              is_active = $3,
              updated_at = CURRENT_TIMESTAMP
        WHERE id = $4
    RETURNING id, name, description, is_paid, is_active`,
      [data.name, data.description, data.isActive, id]
    )

    await writeAuditLog(pool, {
      userId: req.auth.userId,
      action: 'UPDATE_LEAVE_TYPE',
      entityType: 'leave_types',
      entityId: id,
      description: `Leave type updated: ${data.name}`,
    })

    res.json(mapLeaveType(updated.rows[0]))
  } catch (err) {
    next(err)
  }
})

router.patch('/:id/status', ...adminOnly, async (req, res, next) => {
  try {
    const id = parseId(req.params.id)
    if (!id) {
      throw new HttpError(400, 'Die ID der Urlaubsart ist ungültig.')
    }

    const isActive = asBoolean(req.body?.isActive)
    if (isActive === undefined) {
      throw new HttpError(400, 'Der Status der Urlaubsart ist ungültig.')
    }

    const existing = await getLeaveTypeById(id)
    if (!existing) {
      throw new HttpError(404, 'Die Urlaubsart wurde nicht gefunden.')
    }

    const updated = await pool.query(
      `UPDATE leave_types
          SET is_active = $1,
              updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
    RETURNING id, name, description, is_paid, is_active`,
      [isActive, id]
    )

    await writeAuditLog(pool, {
      userId: req.auth.userId,
      action: isActive ? 'ACTIVATE_LEAVE_TYPE' : 'DEACTIVATE_LEAVE_TYPE',
      entityType: 'leave_types',
      entityId: id,
      description: `Leave type status changed: ${existing.name} -> ${isActive}`,
    })

    res.json(mapLeaveType(updated.rows[0]))
  } catch (err) {
    next(err)
  }
})

module.exports = router
