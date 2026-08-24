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

export function formatDate(isoDate) {
  if (!isoDate) {
    return '—'
  }
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString('de-DE')
}

export function getStatusLabel(status) {
  if (status === 'PENDING') {
    return 'Ausstehend'
  }
  if (status === 'APPROVED') {
    return 'Genehmigt'
  }
  if (status === 'REJECTED') {
    return 'Abgelehnt'
  }
  if (status === 'CANCELLED') {
    return 'Storniert'
  }
  return status
}

export function getLeaveTypeLabel(name) {
  if (name === 'Annual Leave') {
    return 'Erholungsurlaub'
  }
  if (name === 'Unpaid Leave') {
    return 'Unbezahlter Urlaub'
  }
  if (name === 'Special Leave') {
    return 'Sonderurlaub'
  }
  if (name === 'Study Leave') {
    return 'Bildungsurlaub'
  }
  return name
}

export function getSicknessStatusLabel(status) {
  if (status === 'REPORTED') {
    return 'Gemeldet'
  }
  if (status === 'DOCUMENT_PENDING') {
    return 'Dokument ausstehend'
  }
  if (status === 'VALIDATED') {
    return 'Validiert'
  }
  if (status === 'REJECTED') {
    return 'Abgelehnt'
  }
  if (status === 'CLOSED') {
    return 'Abgeschlossen'
  }
  return status
}

export function getAbsenceTypeLabel(type) {
  if (type === 'SICK_LEAVE') {
    return 'Krankmeldung'
  }
  if (type === 'CARE_LEAVE') {
    return 'Pflegefreistellung'
  }
  return type
}
