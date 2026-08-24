const fs = require('fs')
const path = require('path')
const express = require('express')
const pool = require('../config/database')
const { authenticateToken } = require('../middleware/auth')
const HttpError = require('../utils/httpError')
const { parseId, asTrimmedString } = require('../utils/request')
const { isIsoDate } = require('../utils/workingDays')
const {
  optionalCertificateUpload,
  isStoredCertificateName,
  storedFilePath,
  removeStoredCertificate,
  removeUploadedTemp,
  mimeForStoredName,
} = require('../utils/certificateFiles')
const {
  SELECT_SICKNESS,
  ABSENCE_TYPES,
  STATUSES,
  EDITABLE_STATUSES,
  mapSickness,
  getSicknessById,
  findOverlappingValidated,
  parseOptionalDate,
  assertCanViewCertificate,
} = require('../utils/sicknessAbsences')

const router = express.Router()

function readStartDate(value) {
  const startDate = asTrimmedString(value)
  if (!isIsoDate(startDate)) {
    throw new HttpError(400, 'Bitte ein gültiges Beginndatum angeben.')
  }
  return startDate
}

function readEndDate(value) {
  const endDate = parseOptionalDate(
    typeof value === 'string' ? value.trim() : value
  )
  if (endDate !== null && !isIsoDate(endDate)) {
    throw new HttpError(400, 'Das Endedatum ist ungültig.')
  }
  return endDate
}

function assertDateOrder(startDate, endDate) {
  if (endDate && endDate < startDate) {
    throw new HttpError(
      400,
      'Das Endedatum darf nicht vor dem Beginndatum liegen.'
    )
  }
}

function readTextCertificate(body) {
  const certificateReference = asTrimmedString(body?.certificateReference) || null
  if (certificateReference && certificateReference.length > 100) {
    throw new HttpError(400, 'Die Bescheinigungsreferenz ist zu lang.')
  }
  return certificateReference
}

router.get('/me', authenticateToken, async (req, res, next) => {
  try {
    const employeeId = req.auth.employeeId
    if (!employeeId) {
      throw new HttpError(400, 'Dem Konto ist kein Mitarbeiter zugeordnet.')
    }

    const status = asTrimmedString(req.query.status).toUpperCase()
    if (status && !STATUSES.includes(status)) {
      throw new HttpError(400, 'Der angegebene Status ist ungültig.')
    }

    const result = await pool.query(
      `${SELECT_SICKNESS}
        WHERE sa.employee_id = $1
          AND ($2::text IS NULL OR sa.status = $2::sickness_absence_status)
        ORDER BY sa.created_at DESC`,
      [employeeId, status || null]
    )
    res.json(result.rows.map(mapSickness))
  } catch (err) {
    next(err)
  }
})

router.get('/:id/certificate', authenticateToken, async (req, res, next) => {
  try {
    const id = parseId(req.params.id)
    if (!id) {
      throw new HttpError(400, 'Die ID der Krankmeldung ist ungültig.')
    }

    const row = await assertCanViewCertificate(pool, req.auth, id)
    if (!isStoredCertificateName(row.certificate_reference)) {
      throw new HttpError(404, 'Für diese Krankmeldung liegt keine Datei vor.')
    }

    const filePath = storedFilePath(row.certificate_reference)
    if (!filePath || !fs.existsSync(filePath)) {
      throw new HttpError(404, 'Die Bescheinigungsdatei wurde nicht gefunden.')
    }

    res.setHeader('Content-Type', mimeForStoredName(row.certificate_reference))
    res.setHeader(
      'Content-Disposition',
      `inline; filename="bescheinigung${path.extname(row.certificate_reference)}"`
    )
    fs.createReadStream(filePath).pipe(res)
  } catch (err) {
    next(err)
  }
})

router.post(
  '/',
  authenticateToken,
  optionalCertificateUpload,
  async (req, res, next) => {
    const client = await pool.connect()

    try {
      const employeeId = req.auth.employeeId
      if (!employeeId) {
        throw new HttpError(400, 'Dem Konto ist kein Mitarbeiter zugeordnet.')
      }

      const absenceType = asTrimmedString(req.body?.absenceType).toUpperCase()
      const startDate = readStartDate(req.body?.startDate)
      const endDate = readEndDate(req.body?.endDate)
      const certificateReference = req.file
        ? req.file.filename
        : readTextCertificate(req.body)
      const employeeNote = asTrimmedString(req.body?.employeeNote) || null

      if (!ABSENCE_TYPES.includes(absenceType)) {
        throw new HttpError(400, 'Bitte eine gültige Abwesenheitsart wählen.')
      }
      assertDateOrder(startDate, endDate)

      await client.query('BEGIN')

      const overlap = await findOverlappingValidated(
        client,
        employeeId,
        startDate,
        endDate,
        null
      )
      if (overlap) {
        throw new HttpError(
          409,
          'Der Zeitraum überschneidet sich mit einer bereits validierten Krankmeldung.'
        )
      }

      const inserted = await client.query(
        `INSERT INTO sickness_absences (
            employee_id, start_date, end_date, absence_type, status,
            certificate_reference, employee_note
          )
         VALUES ($1, $2, $3, $4, 'REPORTED', $5, $6)
         RETURNING id`,
        [
          employeeId,
          startDate,
          endDate,
          absenceType,
          certificateReference,
          employeeNote,
        ]
      )
      const id = inserted.rows[0].id

      await client.query(
        `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, description)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          req.auth.userId,
          'REPORT_SICKNESS_ABSENCE',
          'sickness_absences',
          id,
          `Sickness absence reported (${absenceType})`,
        ]
      )

      await client.query('COMMIT')
      res.status(201).json(mapSickness(await getSicknessById(pool, id)))
    } catch (err) {
      try {
        await client.query('ROLLBACK')
      } catch {
        // Ignore rollback errors.
      }
      removeUploadedTemp(req.file)
      next(err)
    } finally {
      client.release()
    }
  }
)

router.patch(
  '/:id',
  authenticateToken,
  optionalCertificateUpload,
  async (req, res, next) => {
    const client = await pool.connect()
    let previousStoredName = null

    try {
      const employeeId = req.auth.employeeId
      const id = parseId(req.params.id)
      if (!id) {
        throw new HttpError(400, 'Die ID der Krankmeldung ist ungültig.')
      }

      const endDate = readEndDate(req.body?.endDate)
      const employeeNote = asTrimmedString(req.body?.employeeNote) || null

      await client.query('BEGIN')

      const locked = await client.query(
        `SELECT id, employee_id, start_date::text AS start_date, status,
                certificate_reference
           FROM sickness_absences
          WHERE id = $1
          FOR UPDATE`,
        [id]
      )
      if (!locked.rowCount) {
        throw new HttpError(404, 'Die Krankmeldung wurde nicht gefunden.')
      }

      const record = locked.rows[0]
      if (record.employee_id !== employeeId) {
        throw new HttpError(
          403,
          'Sie können nur eigene Krankmeldungen bearbeiten.'
        )
      }
      if (!EDITABLE_STATUSES.includes(record.status)) {
        throw new HttpError(
          409,
          'Diese Krankmeldung kann in diesem Status nicht mehr bearbeitet werden.'
        )
      }

      assertDateOrder(record.start_date, endDate)

      const overlap = await findOverlappingValidated(
        client,
        employeeId,
        record.start_date,
        endDate,
        id
      )
      if (overlap) {
        throw new HttpError(
          409,
          'Der Zeitraum überschneidet sich mit einer bereits validierten Krankmeldung.'
        )
      }

      let certificateReference = record.certificate_reference
      if (req.file) {
        previousStoredName = isStoredCertificateName(record.certificate_reference)
          ? record.certificate_reference
          : null
        certificateReference = req.file.filename
      } else if (
        !String(req.headers['content-type'] || '').includes(
          'multipart/form-data'
        )
      ) {
        certificateReference = readTextCertificate(req.body)
      }

      await client.query(
        `UPDATE sickness_absences
            SET end_date = $1,
                certificate_reference = $2,
                employee_note = $3,
                updated_at = CURRENT_TIMESTAMP
          WHERE id = $4`,
        [endDate, certificateReference, employeeNote, id]
      )
      await client.query(
        `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, description)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          req.auth.userId,
          'UPDATE_SICKNESS_ABSENCE',
          'sickness_absences',
          id,
          'Sickness absence updated by the employee',
        ]
      )

      await client.query('COMMIT')
      if (previousStoredName && previousStoredName !== req.file?.filename) {
        removeStoredCertificate(previousStoredName)
      }
      res.json(mapSickness(await getSicknessById(pool, id)))
    } catch (err) {
      try {
        await client.query('ROLLBACK')
      } catch {
        // Ignore rollback errors.
      }
      removeUploadedTemp(req.file)
      next(err)
    } finally {
      client.release()
    }
  }
)

module.exports = router
