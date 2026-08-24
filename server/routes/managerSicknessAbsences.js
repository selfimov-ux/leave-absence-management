const express = require('express')
const pool = require('../config/database')
const { authenticateToken, authorizeRoles } = require('../middleware/auth')
const HttpError = require('../utils/httpError')
const { asTrimmedString } = require('../utils/request')
const { isIsoDate } = require('../utils/workingDays')
const {
  SELECT_SICKNESS,
  ABSENCE_TYPES,
  STATUSES,
  mapSickness,
} = require('../utils/sicknessAbsences')

const router = express.Router()
const managerOnly = [authenticateToken, authorizeRoles('MANAGER')]

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
    const absenceType = asTrimmedString(req.query.absenceType).toUpperCase()
    const fromDate = asTrimmedString(req.query.from)
    const toDate = asTrimmedString(req.query.to)

    if (status && !STATUSES.includes(status)) {
      throw new HttpError(400, 'Der angegebene Status ist ungültig.')
    }
    if (absenceType && !ABSENCE_TYPES.includes(absenceType)) {
      throw new HttpError(400, 'Die Abwesenheitsart ist ungültig.')
    }
    if (fromDate && !isIsoDate(fromDate)) {
      throw new HttpError(400, 'Das Von-Datum ist ungültig.')
    }
    if (toDate && !isIsoDate(toDate)) {
      throw new HttpError(400, 'Das Bis-Datum ist ungültig.')
    }

    const result = await pool.query(
      `${SELECT_SICKNESS}
        WHERE e.department_id = ANY($1::int[])
          AND e.id <> $2
          AND ($3::text IS NULL OR sa.status = $3::sickness_absence_status)
          AND ($4::text IS NULL OR sa.absence_type = $4::sickness_absence_type)
          AND ($5::date IS NULL OR COALESCE(sa.end_date, sa.start_date) >= $5::date)
          AND ($6::date IS NULL OR sa.start_date <= $6::date)
        ORDER BY CASE
                   WHEN sa.status IN ('REPORTED', 'DOCUMENT_PENDING') THEN 0
                   ELSE 1
                 END,
                 sa.created_at DESC`,
      [
        departmentIds,
        managerEmployeeId,
        status || null,
        absenceType || null,
        fromDate || null,
        toDate || null,
      ]
    )

    res.json(result.rows.map(mapSickness))
  } catch (err) {
    next(err)
  }
})

module.exports = router
