export function countWorkingDays(startDate, endDate) {
  if (!startDate || !endDate || startDate > endDate) {
    return 0
  }

  const start = new Date(`${startDate}T00:00:00`)
  const end = new Date(`${endDate}T00:00:00`)
  let count = 0
  const current = new Date(start)

  while (current <= end) {
    const weekday = current.getDay()
    if (weekday !== 0 && weekday !== 6) {
      count += 1
    }
    current.setDate(current.getDate() + 1)
  }

  return count
}

export function formatDate(isoDate, language = 'de') {
  if (!isoDate) {
    return '—'
  }
  const locale = language === 'en' ? 'en-GB' : 'de-DE'
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString(locale)
}

export function formatDateTime(value, language = 'de') {
  if (!value) {
    return '—'
  }
  const locale = language === 'en' ? 'en-GB' : 'de-DE'
  return new Date(value).toLocaleString(locale)
}

export function getStatusLabel(status, t) {
  return t(`status.${status}`)
}

export function getLeaveTypeLabel(name, t) {
  const key = `leaveType.${name}`
  const label = t(key)
  return label === key ? name : label
}

export function getSicknessStatusLabel(status, t) {
  return t(`status.${status}`)
}

export function getAbsenceTypeLabel(type, t) {
  return t(`absenceType.${type}`)
}

export function getAuditActionLabel(action, t) {
  const key = `auditAction.${action}`
  const label = t(key)
  return label === key ? action : label
}

export function getRecordTypeLabel(type, t) {
  return t(`recordType.${type}`)
}

export function getRoleLabel(role, t) {
  return t(`roles.${role}`)
}
