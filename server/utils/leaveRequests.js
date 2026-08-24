const SELECT_LEAVE_REQUEST = `
  SELECT lr.id,
         lr.employee_id,
         lr.leave_type_id,
         lr.start_date::text AS start_date,
         lr.end_date::text AS end_date,
         lr.requested_days,
         lr.status,
         lr.reason,
         lr.reviewer_id,
         lr.reviewed_at,
         lr.rejection_reason,
         lr.created_at,
         lt.name AS leave_type_name,
         e.employee_number,
         e.first_name,
         e.last_name,
         d.name AS department_name,
         rv.first_name AS reviewer_first_name,
         rv.last_name AS reviewer_last_name
    FROM leave_requests lr
    INNER JOIN leave_types lt ON lt.id = lr.leave_type_id
    INNER JOIN employees e ON e.id = lr.employee_id
    INNER JOIN departments d ON d.id = e.department_id
    LEFT JOIN employees rv ON rv.id = lr.reviewer_id
`

function mapLeaveRequest(row) {
  return {
    id: row.id,
    employeeId: row.employee_id,
    employeeNumber: row.employee_number,
    employeeName: `${row.first_name} ${row.last_name}`,
    departmentName: row.department_name,
    leaveTypeId: row.leave_type_id,
    leaveTypeName: row.leave_type_name,
    startDate: row.start_date,
    endDate: row.end_date,
    requestedDays: Number(row.requested_days),
    status: row.status,
    reason: row.reason,
    reviewerId: row.reviewer_id,
    reviewerName: row.reviewer_first_name
      ? `${row.reviewer_first_name} ${row.reviewer_last_name}`
      : null,
    reviewedAt: row.reviewed_at,
    rejectionReason: row.rejection_reason,
    createdAt: row.created_at,
  }
}

async function getLeaveRequestById(queryable, id) {
  const result = await queryable.query(`${SELECT_LEAVE_REQUEST} WHERE lr.id = $1`, [id])
  return result.rows[0] || null
}

async function findOverlappingRequest(queryable, employeeId, startDate, endDate, excludeId) {
  const result = await queryable.query(
    `SELECT id
       FROM leave_requests
      WHERE employee_id = $1
        AND status IN ('PENDING', 'APPROVED')
        AND ($2::int IS NULL OR id <> $2)
        AND start_date <= $4::date
        AND end_date >= $3::date
      LIMIT 1`,
    [employeeId, excludeId, startDate, endDate]
  )
  return result.rows[0] || null
}

function isAnnualLeave(name) {
  return String(name).toLowerCase() === 'annual leave'
}

async function getAnnualRemaining(queryable, employeeId, leaveTypeId, year, { lock = false } = {}) {
  const result = await queryable.query(
    `SELECT id,
            annual_allowance,
            used_days,
            adjusted_days,
            (annual_allowance + adjusted_days - used_days) AS remaining
       FROM leave_balances
      WHERE employee_id = $1
        AND leave_type_id = $2
        AND calendar_year = $3
      ${lock ? 'FOR UPDATE' : ''}`,
    [employeeId, leaveTypeId, year]
  )
  return result.rows[0] || null
}

module.exports = {
  SELECT_LEAVE_REQUEST,
  mapLeaveRequest,
  getLeaveRequestById,
  findOverlappingRequest,
  isAnnualLeave,
  getAnnualRemaining,
}
