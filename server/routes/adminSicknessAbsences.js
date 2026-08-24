const express = require('express')
const pool = require('../config/database')
const { authenticateToken, authorizeRoles } = require('../middleware/auth')
const HttpError = require('../utils/httpError')
const { parseId, asTrimmedString } = require('../utils/request')
const { isIsoDate } = require('../utils/workingDays')
const {
  SELECT_SICKNESS,
  ABSENCE_TYPES,
  STATUSES,
  mapSickness,
  getSicknessById,
  findOverlappingValidated,
} = require('../utils/sicknessAbsences')

const router = express.Router()
const adminOnly = [authenticateToken, authorizeRoles('ADMINISTRATOR')]
const OPEN_STATUSES = ['REPORTED', 'DOCUMENT_PENDING']

router.get('/', ...adminOnly, async (req, res, next) => {
  try {
    const status = asTrimmedString(req.query.status).toUpperCase()
    const absenceType = asTrimmedString(req.query.absenceType).toUpperCase()
    const employeeId = req.query.employeeId ? parseId(req.query.employeeId) : null
    const departmentId = req.query.departmentId
      ? parseId(req.query.departmentId)
      : null
    const fromDate = asTrimmedString(req.query.from)
    const toDate = asTrimmedString(req.query.to)

    if (status && !STATUSES.includes(status)) {
      throw new HttpError(400, 'Der angegebene Status ist ungültig.')
    }
    if (absenceType && !ABSENCE_TYPES.includes(absenceType)) {
      throw new HttpError(400, 'Die Abwesenheitsart ist ungültig.')
    }
    if (req.query.employeeId && !employeeId) {
      throw new HttpError(400, 'Die Mitarbeiter-ID ist ungültig.')
    }
    if (req.query.departmentId && !departmentId) {
      throw new HttpError(400, 'Die Abteilungs-ID ist ungültig.')
    }
    if (fromDate && !isIsoDate(fromDate)) {
      throw new HttpError(400, 'Das Von-Datum ist ungültig.')
    }
    if (toDate && !isIsoDate(toDate)) {
      throw new HttpError(400, 'Das Bis-Datum ist ungültig.')
    }

    const result = await pool.query(
      `${SELECT_SICKNESS}
        WHERE ($1::text IS NULL OR sa.status = $1::sickness_absence_status)
          AND ($2::text IS NULL OR sa.absence_type = $2::sickness_absence_type)
          AND ($3::int IS NULL OR sa.employee_id = $3)
          AND ($4::int IS NULL OR e.department_id = $4)
          AND ($5::date IS NULL OR COALESCE(sa.end_date, sa.start_date) >= $5::date)
          AND ($6::date IS NULL OR sa.start_date <= $6::date)
        ORDER BY sa.created_at DESC`,
      [
        status || null,
        absenceType || null,
        employeeId,
        departmentId,
        fromDate || null,
        toDate || null,
      ]
    )

    res.json(result.rows.map(mapSickness))
  } catch (err) {
    next(err)
  }
})

router.patch('/:id/document-pending', ...adminOnly, async (req, res, next) => {
  const client = await pool.connect()

  try {
    const id = parseId(req.params.id)
    if (!id) {
      throw new HttpError(400, 'Die ID der Krankmeldung ist ungültig.')
    }
    const administratorNote =
      asTrimmedString(req.body?.administratorNote) || null

    await client.query('BEGIN')
    const locked = await client.query(
      `SELECT id, status FROM sickness_absences WHERE id = $1 FOR UPDATE`,
      [id]
    )
    if (!locked.rowCount) {
      throw new HttpError(404, 'Die Krankmeldung wurde nicht gefunden.')
    }
    if (locked.rows[0].status !== 'REPORTED') {
      throw new HttpError(
        409,
        'Nur gemeldete Krankmeldungen können auf „Dokument ausstehend“ gesetzt werden.'
      )
    }

    await client.query(
      `UPDATE sickness_absences
          SET status = 'DOCUMENT_PENDING',
              administrator_note = COALESCE($1, administrator_note),
              updated_at = CURRENT_TIMESTAMP
        WHERE id = $2`,
      [administratorNote, id]
    )
    await client.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, description)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        req.auth.userId,
        'REQUEST_SICKNESS_DOCUMENT',
        'sickness_absences',
        id,
        'Sickness absence set to DOCUMENT_PENDING',
      ]
    )
    await client.query('COMMIT')
    res.json(mapSickness(await getSicknessById(pool, id)))
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

router.patch('/:id/validate', ...adminOnly, async (req, res, next) => {
  const client = await pool.connect()

  try {
    const id = parseId(req.params.id)
    if (!id) {
      throw new HttpError(400, 'Die ID der Krankmeldung ist ungültig.')
    }
    const administratorNote =
      asTrimmedString(req.body?.administratorNote) || null

    await client.query('BEGIN')
    const locked = await client.query(
      `SELECT id, employee_id, start_date::text AS start_date,
              end_date::text AS end_date, status
         FROM sickness_absences
        WHERE id = $1
        FOR UPDATE`,
      [id]
    )
    if (!locked.rowCount) {
      throw new HttpError(404, 'Die Krankmeldung wurde nicht gefunden.')
    }

    const record = locked.rows[0]
    if (!OPEN_STATUSES.includes(record.status)) {
      throw new HttpError(
        409,
        'Nur gemeldete oder dokumentenoffene Krankmeldungen können validiert werden.'
      )
    }
    if (!record.end_date) {
      throw new HttpError(
        400,
        'Vor der Validierung muss ein Endedatum vorliegen.'
      )
    }

    const overlap = await findOverlappingValidated(
      client,
      record.employee_id,
      record.start_date,
      record.end_date,
      id
    )
    if (overlap) {
      throw new HttpError(
        409,
        'Der Zeitraum überschneidet sich mit einer anderen validierten Krankmeldung.'
      )
    }

    await client.query(
      `UPDATE sickness_absences
          SET status = 'VALIDATED',
              administrator_note = COALESCE($1, administrator_note),
              validation_user_id = $2,
              validated_at = CURRENT_TIMESTAMP,
              updated_at = CURRENT_TIMESTAMP
        WHERE id = $3`,
      [administratorNote, req.auth.userId, id]
    )
    await client.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, description)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        req.auth.userId,
        'VALIDATE_SICKNESS_ABSENCE',
        'sickness_absences',
        id,
        'Sickness absence validated',
      ]
    )
    await client.query('COMMIT')
    res.json(mapSickness(await getSicknessById(pool, id)))
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

router.patch('/:id/reject', ...adminOnly, async (req, res, next) => {
  const client = await pool.connect()

  try {
    const id = parseId(req.params.id)
    const administratorNote = asTrimmedString(req.body?.administratorNote)
    if (!id) {
      throw new HttpError(400, 'Die ID der Krankmeldung ist ungültig.')
    }
    if (!administratorNote) {
      throw new HttpError(400, 'Bitte eine Begründung der Ablehnung angeben.')
    }

    await client.query('BEGIN')
    const locked = await client.query(
      `SELECT id, status FROM sickness_absences WHERE id = $1 FOR UPDATE`,
      [id]
    )
    if (!locked.rowCount) {
      throw new HttpError(404, 'Die Krankmeldung wurde nicht gefunden.')
    }
    if (!OPEN_STATUSES.includes(locked.rows[0].status)) {
      throw new HttpError(
        409,
        'Nur gemeldete oder dokumentenoffene Krankmeldungen können abgelehnt werden.'
      )
    }

    await client.query(
      `UPDATE sickness_absences
          SET status = 'REJECTED',
              administrator_note = $1,
              validation_user_id = $2,
              validated_at = CURRENT_TIMESTAMP,
              updated_at = CURRENT_TIMESTAMP
        WHERE id = $3`,
      [administratorNote, req.auth.userId, id]
    )
    await client.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, description)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        req.auth.userId,
        'REJECT_SICKNESS_ABSENCE',
        'sickness_absences',
        id,
        'Sickness absence rejected',
      ]
    )
    await client.query('COMMIT')
    res.json(mapSickness(await getSicknessById(pool, id)))
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

router.patch('/:id/close', ...adminOnly, async (req, res, next) => {
  const client = await pool.connect()

  try {
    const id = parseId(req.params.id)
    if (!id) {
      throw new HttpError(400, 'Die ID der Krankmeldung ist ungültig.')
    }

    await client.query('BEGIN')
    const locked = await client.query(
      `SELECT id, status, end_date FROM sickness_absences WHERE id = $1 FOR UPDATE`,
      [id]
    )
    if (!locked.rowCount) {
      throw new HttpError(404, 'Die Krankmeldung wurde nicht gefunden.')
    }
    if (locked.rows[0].status !== 'VALIDATED') {
      throw new HttpError(409, 'Nur validierte Krankmeldungen können abgeschlossen werden.')
    }
    if (!locked.rows[0].end_date) {
      throw new HttpError(
        400,
        'Zum Abschließen muss ein Endedatum vorliegen.'
      )
    }

    await client.query(
      `UPDATE sickness_absences
          SET status = 'CLOSED',
              updated_at = CURRENT_TIMESTAMP
        WHERE id = $1`,
      [id]
    )
    await client.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, description)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        req.auth.userId,
        'CLOSE_SICKNESS_ABSENCE',
        'sickness_absences',
        id,
        'Sickness absence closed',
      ]
    )
    await client.query('COMMIT')
    res.json(mapSickness(await getSicknessById(pool, id)))
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
