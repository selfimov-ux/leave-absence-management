function isIsoDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false
  }
  const parsed = new Date(`${value}T00:00:00`)
  return !Number.isNaN(parsed.getTime())
}

function countWorkingDays(startDate, endDate) {
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

function calendarYear(isoDate) {
  return Number(isoDate.slice(0, 4))
}

module.exports = {
  isIsoDate,
  countWorkingDays,
  calendarYear,
}
