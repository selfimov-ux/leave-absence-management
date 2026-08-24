const HttpError = require('./httpError')
const { asTrimmedString, parseId } = require('./request')
const { isIsoDate } = require('./workingDays')

function readOptionalId(value, invalidMessage) {
  const raw = asTrimmedString(value)
  if (!raw) {
    return null
  }
  const id = parseId(raw)
  if (!id) {
    throw new HttpError(400, invalidMessage)
  }
  return id
}

function readDateRange(query) {
  const fromDate = asTrimmedString(query.fromDate || query.from)
  const toDate = asTrimmedString(query.toDate || query.to)

  if (fromDate && !isIsoDate(fromDate)) {
    throw new HttpError(400, 'Das Von-Datum ist ungültig.')
  }
  if (toDate && !isIsoDate(toDate)) {
    throw new HttpError(400, 'Das Bis-Datum ist ungültig.')
  }
  if (fromDate && toDate && fromDate > toDate) {
    throw new HttpError(
      400,
      'Das Von-Datum darf nicht nach dem Bis-Datum liegen.'
    )
  }

  return {
    fromDate: fromDate || null,
    toDate: toDate || null,
  }
}

module.exports = {
  readOptionalId,
  readDateRange,
}
