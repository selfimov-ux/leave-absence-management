const express = require('express')
const pool = require('../config/database')
const { authenticateToken } = require('../middleware/auth')
const HttpError = require('../utils/httpError')

const router = express.Router()

router.get('/me', authenticateToken, async (req, res, next) => {
  try {
    const employeeId = req.auth.employeeId
    if (!employeeId) {
      throw new HttpError(400, 'Dem Konto ist kein Mitarbeiter zugeordnet.')
    }

    const result = await pool.query(
      `SELECT lb.id,
              lb.leave_type_id,
              lt.name AS leave_type_name,
              lb.calendar_year,
              lb.annual_allowance,
              lb.used_days,
              lb.adjusted_days,
              (lb.annual_allowance + lb.adjusted_days - lb.used_days) AS remaining_days
         FROM leave_balances lb
         INNER JOIN leave_types lt ON lt.id = lb.leave_type_id
        WHERE lb.employee_id = $1
        ORDER BY lb.calendar_year DESC, lt.name ASC`,
      [employeeId]
    )

    res.json(
      result.rows.map((row) => ({
        id: row.id,
        leaveTypeId: row.leave_type_id,
        leaveTypeName: row.leave_type_name,
        calendarYear: row.calendar_year,
        annualAllowance: Number(row.annual_allowance),
        usedDays: Number(row.used_days),
        adjustedDays: Number(row.adjusted_days),
        remainingDays: Number(row.remaining_days),
      }))
    )
  } catch (err) {
    next(err)
  }
})

module.exports = router
