function parseId(value) {
  const id = Number.parseInt(value, 10)
  return Number.isInteger(id) && id > 0 ? id : null
}

function asTrimmedString(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function asNullableId(value) {
  if (value === null || value === undefined || value === '') {
    return null
  }
  const id = Number(value)
  return Number.isInteger(id) && id > 0 ? id : undefined
}

function asBoolean(value) {
  if (typeof value === 'boolean') {
    return value
  }
  return undefined
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)
}

const ROLES = ['EMPLOYEE', 'MANAGER', 'ADMINISTRATOR']

function uniqueConstraintMessage(err) {
  const name = err.constraint || ''

  if (name.includes('username')) {
    return 'Dieser Benutzername ist bereits vergeben.'
  }
  if (name.includes('email')) {
    return 'Diese E-Mail-Adresse ist bereits vergeben.'
  }
  if (name.includes('employee_number')) {
    return 'Diese Personalnummer ist bereits vergeben.'
  }
  if (name.includes('departments_name') || name.includes('uq_departments_name')) {
    return 'Dieser Abteilungsname ist bereits vergeben.'
  }
  if (name.includes('leave_types_name') || name.includes('uq_leave_types_name')) {
    return 'Dieser Name der Urlaubsart ist bereits vergeben.'
  }

  return 'Der Datensatz verletzt eine Eindeutigkeitsbedingung.'
}

module.exports = {
  parseId,
  asTrimmedString,
  asNullableId,
  asBoolean,
  isValidEmail,
  ROLES,
  uniqueConstraintMessage,
}
