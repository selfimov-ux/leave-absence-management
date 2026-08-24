const HttpError = require('./httpError')
const { isStoredCertificateName } = require('./certificateFiles')

const SELECT_SICKNESS = `
  SELECT sa.id,
         sa.employee_id,
         sa.start_date::text AS start_date,
         sa.end_date::text AS end_date,
         sa.absence_type,
         sa.status,
         sa.certificate_reference,
         sa.employee_note,
         sa.administrator_note,
         sa.validation_user_id,
         sa.validated_at,
         sa.created_at,
         e.employee_number,
         e.first_name,
         e.last_name,
         d.id AS department_id,
         d.name AS department_name,
         vu.username AS validator_username
    FROM sickness_absences sa
    INNER JOIN employees e ON e.id = sa.employee_id
    INNER JOIN departments d ON d.id = e.department_id
    LEFT JOIN users vu ON vu.id = sa.validation_user_id
`

const ABSENCE_TYPES = ['SICK_LEAVE', 'CARE_LEAVE']
const STATUSES = [
  'REPORTED',
  'DOCUMENT_PENDING',
  'VALIDATED',
  'REJECTED',
  'CLOSED',
]
const EDITABLE_STATUSES = ['REPORTED', 'DOCUMENT_PENDING']

function mapSickness(row) {
  return {
    id: row.id,
    employeeId: row.employee_id,
    employeeNumber: row.employee_number,
    employeeName: `${row.first_name} ${row.last_name}`,
    departmentId: row.department_id,
    departmentName: row.department_name,
    absenceType: row.absence_type,
    startDate: row.start_date,
    endDate: row.end_date,
    status: row.status,
    certificateReference: isStoredCertificateName(row.certificate_reference)
      ? null
      : row.certificate_reference,
    hasCertificateFile: isStoredCertificateName(row.certificate_reference),
    employeeNote: row.employee_note,
    administratorNote: row.administrator_note,
    validationUserId: row.validation_user_id,
    validatorName: row.validator_username || null,
    validatedAt: row.validated_at,
    createdAt: row.created_at,
  }
}

async function getSicknessById(queryable, id) {
  const result = await queryable.query(`${SELECT_SICKNESS} WHERE sa.id = $1`, [id])
  return result.rows[0] || null
}

async function findOverlappingValidated(
  queryable,
  employeeId,
  startDate,
  endDate,
  excludeId
) {
  if (!endDate) {
    return null
  }

  const result = await queryable.query(
    `SELECT id
       FROM sickness_absences
      WHERE employee_id = $1
        AND status = 'VALIDATED'
        AND ($2::int IS NULL OR id <> $2)
        AND start_date <= $4::date
        AND (end_date IS NULL OR end_date >= $3::date)
      LIMIT 1`,
    [employeeId, excludeId, startDate, endDate]
  )
  return result.rows[0] || null
}

function parseOptionalDate(value) {
  if (value === null || value === undefined || value === '') {
    return null
  }
  return value
}

async function assertCanViewCertificate(queryable, auth, recordId) {
  const row = await getSicknessById(queryable, recordId)
  if (!row) {
    throw new HttpError(404, 'Die Krankmeldung wurde nicht gefunden.')
  }

  if (auth.role === 'ADMINISTRATOR') {
    return row
  }

  if (auth.employeeId && row.employee_id === auth.employeeId) {
    return row
  }

  if (auth.role === 'MANAGER' && auth.employeeId) {
    const access = await queryable.query(
      `SELECT 1
         FROM employees e
         INNER JOIN departments d ON d.id = e.department_id
        WHERE e.id = $1
          AND d.manager_id = $2
          AND e.id <> $2
        LIMIT 1`,
      [row.employee_id, auth.employeeId]
    )
    if (access.rowCount) {
      return row
    }
  }

  throw new HttpError(
    403,
    'Sie haben keine Berechtigung, diese Bescheinigung zu sehen.'
  )
}

module.exports = {
  SELECT_SICKNESS,
  ABSENCE_TYPES,
  STATUSES,
  EDITABLE_STATUSES,
  mapSickness,
  getSicknessById,
  findOverlappingValidated,
  parseOptionalDate,
  assertCanViewCertificate,
}
