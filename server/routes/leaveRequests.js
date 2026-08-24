const express = require('express')
const pool = require('../config/database')
const { authenticateToken } = require('../middleware/auth')
const HttpError = require('../utils/httpError')
const { parseId, asTrimmedString } = require('../utils/request')
const { isIsoDate, countWorkingDays, calendarYear } = require('../utils/workingDays')
const {
  SELECT_LEAVE_REQUEST,
  mapLeaveRequest,
  getLeaveRequestById,
  findOverlappingRequest,
  isAnnualLeave,
  getAnnualRemaining,
} = require('../utils/leaveRequests')

const router = express.Router()
const STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED']

router.get('/me', authenticateToken, async (req, res, next) => {
  try {
    const employeeId = req.auth.employeeId
    if (!employeeId) {
      throw new HttpError(400, 'Dem Konto ist kein Mitarbeiter zugeordnet.')
    }

    const status = asTrimmedString(req.query.status).toUpperCase()
    const fromDate = asTrimmedString(req.query.from)
    const toDate = asTrimmedString(req.query.to)

    if (status && !STATUSES.includes(status)) {
      throw new HttpError(400, 'Der angegebene Status ist ungültig.')
    }
    if (fromDate && !isIsoDate(fromDate)) {
      throw new HttpError(400, 'Das Von-Datum ist ungültig.')
    }
    if (toDate && !isIsoDate(toDate)) {
      throw new HttpError(400, 'Das Bis-Datum ist ungültig.')
    }

    const result = await pool.query(
      `${SELECT_LEAVE_REQUEST}
        WHERE lr.employee_id = $1
          AND ($2::text IS NULL OR lr.status = $2::leave_request_status)
          AND ($3::date IS NULL OR lr.end_date >= $3::date)
          AND ($4::date IS NULL OR lr.start_date <= $4::date)
        ORDER BY lr.created_at DESC`,
      [employeeId, status || null, fromDate || null, toDate || null]
    )

    res.json(result.rows.map(mapLeaveRequest))
  } catch (err) {
    next(err)
  }
})

router.post('/', authenticateToken, async (req, res, next) => {
  const client = await pool.connect()

  try {
    const employeeId = req.auth.employeeId
    if (!employeeId) {
      throw new HttpError(400, 'Dem Konto ist kein Mitarbeiter zugeordnet.')
    }

    const leaveTypeId = parseId(req.body?.leaveTypeId)
    const startDate = asTrimmedString(req.body?.startDate)
    const endDate = asTrimmedString(req.body?.endDate)
    const reason = asTrimmedString(req.body?.reason) || null

    if (!leaveTypeId) {
      throw new HttpError(400, 'Bitte eine Urlaubsart auswählen.')
    }
    if (!isIsoDate(startDate) || !isIsoDate(endDate)) {
      throw new HttpError(400, 'Bitte gültige Beginn- und Endedaten angeben.')
    }
    if (startDate > endDate) {
      throw new HttpError(400, 'Das Beginndatum darf nicht nach dem Endedatum liegen.')
    }
    if (calendarYear(startDate) !== calendarYear(endDate)) {
      throw new HttpError(
        400,
        'Urlaubsanträge über Jahresgrenzen hinweg sind in dieser Phase nicht möglich.'
      )
    }

    const requestedDays = countWorkingDays(startDate, endDate)
    if (requestedDays <= 0) {
      throw new HttpError(
        400,
        'Der Zeitraum enthält keine Arbeitstage (Montag bis Freitag).'
      )
    }

    await client.query('BEGIN')

    const leaveType = await client.query(
      `SELECT id, name, is_active
         FROM leave_types
        WHERE id = $1
        FOR UPDATE`,
      [leaveTypeId]
    )
    if (!leaveType.rowCount) {
      throw new HttpError(400, 'Die ausgewählte Urlaubsart existiert nicht.')
    }
    if (!leaveType.rows[0].is_active) {
      throw new HttpError(400, 'Die ausgewählte Urlaubsart ist nicht aktiv.')
    }

    const overlap = await findOverlappingRequest(
      client,
      employeeId,
      startDate,
      endDate,
      null
    )
    if (overlap) {
      throw new HttpError(
        409,
        'Der Zeitraum überschneidet sich mit einem bestehenden ausstehenden oder genehmigten Antrag.'
      )
    }

    if (isAnnualLeave(leaveType.rows[0].name)) {
      const balance = await getAnnualRemaining(
        client,
        employeeId,
        leaveTypeId,
        calendarYear(startDate),
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
          'Das verbleibende Urlaubskontingent reicht für diesen Antrag nicht aus.'
        )
      }
    }

    const inserted = await client.query(
      `INSERT INTO leave_requests (
          employee_id, leave_type_id, start_date, end_date,
          requested_days, status, reason
        )
       VALUES ($1, $2, $3, $4, $5, 'PENDING', $6)
       RETURNING id`,
      [employeeId, leaveTypeId, startDate, endDate, requestedDays, reason]
    )
    const requestId = inserted.rows[0].id

    await client.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, description)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        req.auth.userId,
        'CREATE_LEAVE_REQUEST',
        'leave_requests',
        requestId,
        `Leave request created for ${startDate} to ${endDate} (${requestedDays} working days)`,
      ]
    )

    await client.query('COMMIT')
    res.status(201).json(mapLeaveRequest(await getLeaveRequestById(pool, requestId)))
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

router.patch('/:id/cancel', authenticateToken, async (req, res, next) => {
  const client = await pool.connect()

  try {
    const employeeId = req.auth.employeeId
    const id = parseId(req.params.id)
    if (!id) {
      throw new HttpError(400, 'Die Antrags-ID ist ungültig.')
    }

    await client.query('BEGIN')
    const locked = await client.query(
      `SELECT id, employee_id, status
         FROM leave_requests
        WHERE id = $1
        FOR UPDATE`,
      [id]
    )
    if (!locked.rowCount) {
      throw new HttpError(404, 'Der Urlaubsantrag wurde nicht gefunden.')
    }
    if (locked.rows[0].employee_id !== employeeId) {
      throw new HttpError(403, 'Sie können nur eigene Urlaubsanträge stornieren.')
    }
    if (locked.rows[0].status !== 'PENDING') {
      throw new HttpError(409, 'Nur ausstehende Anträge können storniert werden.')
    }

    await client.query(
      `UPDATE leave_requests
          SET status = 'CANCELLED',
              updated_at = CURRENT_TIMESTAMP
        WHERE id = $1`,
      [id]
    )
    await client.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, description)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        req.auth.userId,
        'CANCEL_LEAVE_REQUEST',
        'leave_requests',
        id,
        'Leave request cancelled by the employee',
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
