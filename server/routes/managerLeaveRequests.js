const express = require('express')
const pool = require('../config/database')
const { authenticateToken, authorizeRoles } = require('../middleware/auth')
const HttpError = require('../utils/httpError')
const { parseId, asTrimmedString } = require('../utils/request')
const { isIsoDate, calendarYear } = require('../utils/workingDays')
const {
  SELECT_LEAVE_REQUEST,
  mapLeaveRequest,
  getLeaveRequestById,
  findOverlappingRequest,
  isAnnualLeave,
  getAnnualRemaining,
} = require('../utils/leaveRequests')

const router = express.Router()
const managerOnly = [authenticateToken, authorizeRoles('MANAGER')]
const STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED']

async function getManagedDepartmentIds(queryable, employeeId) {
  const result = await queryable.query(
    'SELECT id FROM departments WHERE manager_id = $1',
    [employeeId]
  )
  return result.rows.map((row) => row.id)
}

router.get('/', ...managerOnly, async (req, res, next) => {
  try {
    const managerEmployeeId = req.auth.employeeId
    const departmentIds = await getManagedDepartmentIds(pool, managerEmployeeId)
    if (departmentIds.length === 0) {
      res.json([])
      return
    }

    const status = asTrimmedString(req.query.status).toUpperCase()
    const leaveTypeId = req.query.leaveTypeId ? parseId(req.query.leaveTypeId) : null
    const fromDate = asTrimmedString(req.query.from)
    const toDate = asTrimmedString(req.query.to)

    if (status && !STATUSES.includes(status)) {
      throw new HttpError(400, 'Der angegebene Status ist ungültig.')
    }
    if (req.query.leaveTypeId && !leaveTypeId) {
      throw new HttpError(400, 'Die Urlaubsart-ID ist ungültig.')
    }
    if (fromDate && !isIsoDate(fromDate)) {
      throw new HttpError(400, 'Das Von-Datum ist ungültig.')
    }
    if (toDate && !isIsoDate(toDate)) {
      throw new HttpError(400, 'Das Bis-Datum ist ungültig.')
    }

    const result = await pool.query(
      `${SELECT_LEAVE_REQUEST}
        WHERE e.department_id = ANY($1::int[])
          AND e.id <> $2
          AND ($3::text IS NULL OR lr.status = $3::leave_request_status)
          AND ($4::int IS NULL OR lr.leave_type_id = $4)
          AND ($5::date IS NULL OR lr.end_date >= $5::date)
          AND ($6::date IS NULL OR lr.start_date <= $6::date)
        ORDER BY CASE WHEN lr.status = 'PENDING' THEN 0 ELSE 1 END,
                 lr.created_at DESC`,
      [
        departmentIds,
        managerEmployeeId,
        status || null,
        leaveTypeId,
        fromDate || null,
        toDate || null,
      ]
    )

    res.json(result.rows.map(mapLeaveRequest))
  } catch (err) {
    next(err)
  }
})

router.patch('/:id/approve', ...managerOnly, async (req, res, next) => {
  const client = await pool.connect()

  try {
    const id = parseId(req.params.id)
    const managerEmployeeId = req.auth.employeeId
    if (!id) {
      throw new HttpError(400, 'Die Antrags-ID ist ungültig.')
    }

    await client.query('BEGIN')

    const locked = await client.query(
      `SELECT lr.id,
              lr.employee_id,
              lr.leave_type_id,
              lr.start_date::text AS start_date,
              lr.end_date::text AS end_date,
              lr.requested_days,
              lr.status,
              lt.name AS leave_type_name,
              e.department_id
         FROM leave_requests lr
         INNER JOIN leave_types lt ON lt.id = lr.leave_type_id
         INNER JOIN employees e ON e.id = lr.employee_id
        WHERE lr.id = $1
        FOR UPDATE OF lr`,
      [id]
    )
    if (!locked.rowCount) {
      throw new HttpError(404, 'Der Urlaubsantrag wurde nicht gefunden.')
    }

    const request = locked.rows[0]
    if (request.employee_id === managerEmployeeId) {
      throw new HttpError(403, 'Sie können Ihren eigenen Antrag nicht genehmigen.')
    }
    if (request.status !== 'PENDING') {
      throw new HttpError(409, 'Nur ausstehende Anträge können genehmigt werden.')
    }

    const departmentIds = await getManagedDepartmentIds(client, managerEmployeeId)
    if (!departmentIds.includes(request.department_id)) {
      throw new HttpError(
        403,
        'Sie können nur Anträge aus der eigenen Abteilung genehmigen.'
      )
    }

    const overlap = await findOverlappingRequest(
      client,
      request.employee_id,
      request.start_date,
      request.end_date,
      request.id
    )
    if (overlap) {
      throw new HttpError(
        409,
        'Der Zeitraum überschneidet sich mit einem anderen genehmigten oder ausstehenden Antrag.'
      )
    }

    const requestedDays = Number(request.requested_days)
    if (isAnnualLeave(request.leave_type_name)) {
      const balance = await getAnnualRemaining(
        client,
        request.employee_id,
        request.leave_type_id,
        calendarYear(request.start_date),
        { lock: true }
      )
      if (!balance) {
        throw new HttpError(
          400,
          'Für diese Urlaubsart ist kein Kontingent im Antragsjahr hinterlegt.'
        )
      }
      if (Number(balance.remaining) < requestedDays) {
        throw new HttpError(
          409,
          'Das verbleibende Urlaubskontingent reicht für die Genehmigung nicht aus.'
        )
      }

      await client.query(
        `UPDATE leave_balances
            SET used_days = used_days + $1,
                updated_at = CURRENT_TIMESTAMP
          WHERE id = $2`,
        [requestedDays, balance.id]
      )
    }

    await client.query(
      `UPDATE leave_requests
          SET status = 'APPROVED',
              reviewer_id = $1,
              reviewed_at = CURRENT_TIMESTAMP,
              updated_at = CURRENT_TIMESTAMP
        WHERE id = $2`,
      [managerEmployeeId, id]
    )
    await client.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, description)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        req.auth.userId,
        'APPROVE_LEAVE_REQUEST',
        'leave_requests',
        id,
        `Leave request approved (${requestedDays} working days)`,
      ]
    )

    await client.query('COMMIT')
    res.json(mapLeaveRequest(await getLeaveRequestById(pool, id)))
  } catch (err) {
    try {
      await client.query('ROLLBACK')
    } catch {
      // Ignore rollback errors.
    }
    next(err)
  } finally {
    client.release()
  }
})

router.patch('/:id/reject', ...managerOnly, async (req, res, next) => {
  const client = await pool.connect()

  try {
    const id = parseId(req.params.id)
    const managerEmployeeId = req.auth.employeeId
    const rejectionReason = asTrimmedString(req.body?.rejectionReason)

    if (!id) {
      throw new HttpError(400, 'Die Antrags-ID ist ungültig.')
    }
    if (!rejectionReason) {
      throw new HttpError(400, 'Bitte einen Ablehnungsgrund angeben.')
    }

    await client.query('BEGIN')

    const locked = await client.query(
      `SELECT lr.id, lr.employee_id, lr.status, e.department_id
         FROM leave_requests lr
         INNER JOIN employees e ON e.id = lr.employee_id
        WHERE lr.id = $1
        FOR UPDATE OF lr`,
      [id]
    )
    if (!locked.rowCount) {
      throw new HttpError(404, 'Der Urlaubsantrag wurde nicht gefunden.')
    }

    const request = locked.rows[0]
    if (request.employee_id === managerEmployeeId) {
      throw new HttpError(403, 'Sie können Ihren eigenen Antrag nicht ablehnen.')
    }
    if (request.status !== 'PENDING') {
      throw new HttpError(409, 'Nur ausstehende Anträge können abgelehnt werden.')
    }

    const departmentIds = await getManagedDepartmentIds(client, managerEmployeeId)
    if (!departmentIds.includes(request.department_id)) {
      throw new HttpError(
        403,
        'Sie können nur Anträge aus der eigenen Abteilung ablehnen.'
      )
    }

    await client.query(
      `UPDATE leave_requests
          SET status = 'REJECTED',
              reviewer_id = $1,
              reviewed_at = CURRENT_TIMESTAMP,
              rejection_reason = $2,
              updated_at = CURRENT_TIMESTAMP
        WHERE id = $3`,
      [managerEmployeeId, rejectionReason, id]
    )
    await client.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, description)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        req.auth.userId,
        'REJECT_LEAVE_REQUEST',
        'leave_requests',
        id,
        'Leave request rejected',
      ]
    )

    await client.query('COMMIT')
    res.json(mapLeaveRequest(await getLeaveRequestById(pool, id)))
  } catch (err) {
    try {
      await client.query('ROLLBACK')
    } catch {
      // Ignore rollback errors.
    }
    next(err)
  } finally {
    client.release()
  }
})

module.exports = router
