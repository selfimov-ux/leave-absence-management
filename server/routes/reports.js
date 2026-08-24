const express = require('express')
const pool = require('../config/database')
const { authenticateToken, authorizeRoles } = require('../middleware/auth')
const HttpError = require('../utils/httpError')
const { asTrimmedString } = require('../utils/request')
const { isStoredCertificateName } = require('../utils/certificateFiles')
const { readOptionalId, readDateRange } = require('../utils/reportQuery')

const router = express.Router()
const adminOnly = [authenticateToken, authorizeRoles('ADMINISTRATOR')]

const LEAVE_STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED']
const SICKNESS_STATUSES = [
  'REPORTED',
  'DOCUMENT_PENDING',
  'VALIDATED',
  'REJECTED',
  'CLOSED',
]
const SICKNESS_TYPES = ['SICK_LEAVE', 'CARE_LEAVE']
const RECORD_TYPES = ['LEAVE', 'SICKNESS_ABSENCE']

function dateOverlapSql(startAlias, endAlias) {
  return `($1::date IS NULL OR COALESCE(${endAlias}, ${startAlias}) >= $1::date)
      AND ($2::date IS NULL OR ${startAlias} <= $2::date)`
}

router.get('/leave', ...adminOnly, async (req, res, next) => {
  try {
    const employeeId = readOptionalId(
      req.query.employeeId,
      'Die Mitarbeiter-ID ist ungültig.'
    )
    const departmentId = readOptionalId(
      req.query.departmentId,
      'Die Abteilungs-ID ist ungültig.'
    )
    const leaveTypeId = readOptionalId(
      req.query.leaveTypeId,
      'Die Urlaubsart-ID ist ungültig.'
    )
    const status = asTrimmedString(req.query.status).toUpperCase()
    const { fromDate, toDate } = readDateRange(req.query)

    if (status && !LEAVE_STATUSES.includes(status)) {
      throw new HttpError(400, 'Der angegebene Status ist ungültig.')
    }

    const result = await pool.query(
      `SELECT lr.id,
              e.employee_number,
              e.first_name,
              e.last_name,
              d.name AS department_name,
              lt.name AS leave_type_name,
              lr.start_date::text AS start_date,
              lr.end_date::text AS end_date,
              lr.requested_days,
              lr.status,
              lr.reason,
              rv.first_name AS reviewer_first_name,
              rv.last_name AS reviewer_last_name,
              lr.reviewed_at,
              lr.rejection_reason
         FROM leave_requests lr
         INNER JOIN employees e ON e.id = lr.employee_id
         INNER JOIN departments d ON d.id = e.department_id
         INNER JOIN leave_types lt ON lt.id = lr.leave_type_id
         LEFT JOIN employees rv ON rv.id = lr.reviewer_id
        WHERE ($3::int IS NULL OR lr.employee_id = $3)
          AND ($4::int IS NULL OR e.department_id = $4)
          AND ($5::int IS NULL OR lr.leave_type_id = $5)
          AND ($6::text IS NULL OR lr.status = $6::leave_request_status)
          AND ${dateOverlapSql('lr.start_date', 'lr.end_date')}
        ORDER BY lr.start_date DESC, e.last_name ASC, e.first_name ASC`,
      [
        fromDate,
        toDate,
        employeeId,
        departmentId,
        leaveTypeId,
        status || null,
      ]
    )

    res.json({
      filters: {
        employeeId,
        departmentId,
        leaveTypeId,
        status: status || null,
        fromDate,
        toDate,
      },
      total: result.rowCount,
      records: result.rows.map((row) => ({
        id: row.id,
        employeeNumber: row.employee_number,
        firstName: row.first_name,
        lastName: row.last_name,
        departmentName: row.department_name,
        leaveTypeName: row.leave_type_name,
        startDate: row.start_date,
        endDate: row.end_date,
        requestedDays: Number(row.requested_days),
        status: row.status,
        reason: row.reason,
        reviewerName: row.reviewer_first_name
          ? `${row.reviewer_first_name} ${row.reviewer_last_name}`
          : null,
        reviewedAt: row.reviewed_at,
        rejectionReason: row.rejection_reason,
      })),
    })
  } catch (err) {
    next(err)
  }
})

router.get('/sickness-absences', ...adminOnly, async (req, res, next) => {
  try {
    const employeeId = readOptionalId(
      req.query.employeeId,
      'Die Mitarbeiter-ID ist ungültig.'
    )
    const departmentId = readOptionalId(
      req.query.departmentId,
      'Die Abteilungs-ID ist ungültig.'
    )
    const absenceType = asTrimmedString(req.query.absenceType).toUpperCase()
    const status = asTrimmedString(req.query.status).toUpperCase()
    const { fromDate, toDate } = readDateRange(req.query)

    if (absenceType && !SICKNESS_TYPES.includes(absenceType)) {
      throw new HttpError(400, 'Die angegebene Abwesenheitsart ist ungültig.')
    }
    if (status && !SICKNESS_STATUSES.includes(status)) {
      throw new HttpError(400, 'Der angegebene Status ist ungültig.')
    }

    const result = await pool.query(
      `SELECT sa.id,
              e.employee_number,
              e.first_name,
              e.last_name,
              d.name AS department_name,
              sa.absence_type,
              sa.start_date::text AS start_date,
              sa.end_date::text AS end_date,
              sa.status,
              sa.certificate_reference,
              sa.employee_note,
              sa.administrator_note,
              sa.validated_at,
              vu.username AS validator_username
         FROM sickness_absences sa
         INNER JOIN employees e ON e.id = sa.employee_id
         INNER JOIN departments d ON d.id = e.department_id
         LEFT JOIN users vu ON vu.id = sa.validation_user_id
        WHERE ($3::int IS NULL OR sa.employee_id = $3)
          AND ($4::int IS NULL OR e.department_id = $4)
          AND ($5::text IS NULL OR sa.absence_type = $5::sickness_absence_type)
          AND ($6::text IS NULL OR sa.status = $6::sickness_absence_status)
          AND ${dateOverlapSql('sa.start_date', 'sa.end_date')}
        ORDER BY sa.start_date DESC, e.last_name ASC, e.first_name ASC`,
      [
        fromDate,
        toDate,
        employeeId,
        departmentId,
        absenceType || null,
        status || null,
      ]
    )

    res.json({
      filters: {
        employeeId,
        departmentId,
        absenceType: absenceType || null,
        status: status || null,
        fromDate,
        toDate,
      },
      total: result.rowCount,
      records: result.rows.map((row) => ({
        id: row.id,
        employeeNumber: row.employee_number,
        firstName: row.first_name,
        lastName: row.last_name,
        departmentName: row.department_name,
        absenceType: row.absence_type,
        startDate: row.start_date,
        endDate: row.end_date,
        status: row.status,
        certificateAvailable: isStoredCertificateName(row.certificate_reference),
        employeeNote: row.employee_note,
        administratorNote: row.administrator_note,
        validatedAt: row.validated_at,
        validatorName: row.validator_username || null,
      })),
    })
  } catch (err) {
    next(err)
  }
})

router.get('/absence-overview', ...adminOnly, async (req, res, next) => {
  try {
    const employeeId = readOptionalId(
      req.query.employeeId,
      'Die Mitarbeiter-ID ist ungültig.'
    )
    const departmentId = readOptionalId(
      req.query.departmentId,
      'Die Abteilungs-ID ist ungültig.'
    )
    const recordType = asTrimmedString(req.query.recordType).toUpperCase()
    const { fromDate, toDate } = readDateRange(req.query)

    if (recordType && !RECORD_TYPES.includes(recordType)) {
      throw new HttpError(400, 'Der angegebene Datensatztyp ist ungültig.')
    }

    const result = await pool.query(
      `SELECT * FROM (
          SELECT 'LEAVE'::text AS record_type,
                 e.employee_number,
                 e.first_name,
                 e.last_name,
                 d.name AS department_name,
                 lt.name AS type_name,
                 lr.start_date::text AS start_date,
                 lr.end_date::text AS end_date,
                 lr.status::text AS status
            FROM leave_requests lr
            INNER JOIN employees e ON e.id = lr.employee_id
            INNER JOIN departments d ON d.id = e.department_id
            INNER JOIN leave_types lt ON lt.id = lr.leave_type_id
           WHERE lr.status = 'APPROVED'
             AND ($3::int IS NULL OR lr.employee_id = $3)
             AND ($4::int IS NULL OR e.department_id = $4)
             AND ($5::text IS NULL OR $5 = 'LEAVE')
             AND ${dateOverlapSql('lr.start_date', 'lr.end_date')}
          UNION ALL
          SELECT 'SICKNESS_ABSENCE'::text AS record_type,
                 e.employee_number,
                 e.first_name,
                 e.last_name,
                 d.name AS department_name,
                 sa.absence_type::text AS type_name,
                 sa.start_date::text AS start_date,
                 sa.end_date::text AS end_date,
                 sa.status::text AS status
            FROM sickness_absences sa
            INNER JOIN employees e ON e.id = sa.employee_id
            INNER JOIN departments d ON d.id = e.department_id
           WHERE sa.status IN (
                   'REPORTED',
                   'DOCUMENT_PENDING',
                   'VALIDATED',
                   'CLOSED'
                 )
             AND ($3::int IS NULL OR sa.employee_id = $3)
             AND ($4::int IS NULL OR e.department_id = $4)
             AND ($5::text IS NULL OR $5 = 'SICKNESS_ABSENCE')
             AND ${dateOverlapSql('sa.start_date', 'sa.end_date')}
        ) overview
        ORDER BY overview.start_date DESC, overview.last_name ASC, overview.first_name ASC`,
      [fromDate, toDate, employeeId, departmentId, recordType || null]
    )

    res.json({
      filters: {
        employeeId,
        departmentId,
        recordType: recordType || null,
        fromDate,
        toDate,
      },
      total: result.rowCount,
      records: result.rows.map((row) => ({
        recordType: row.record_type,
        employeeNumber: row.employee_number,
        employeeName: `${row.first_name} ${row.last_name}`,
        departmentName: row.department_name,
        typeName: row.type_name,
        startDate: row.start_date,
        endDate: row.end_date,
        status: row.status,
      })),
    })
  } catch (err) {
    next(err)
  }
})

module.exports = router
