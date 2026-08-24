const express = require('express')
const pool = require('../config/database')
const { authenticateToken, authorizeRoles } = require('../middleware/auth')
const HttpError = require('../utils/httpError')
const { asTrimmedString } = require('../utils/request')
const { readOptionalId, readDateRange } = require('../utils/reportQuery')

const router = express.Router()
const DEFAULT_PAGE = 1
const DEFAULT_PAGE_SIZE = 20
const MAX_PAGE_SIZE = 100

function readPage(value) {
  const raw = asTrimmedString(value)
  if (!raw) {
    return DEFAULT_PAGE
  }
  const page = Number.parseInt(raw, 10)
  if (!Number.isInteger(page) || page < 1) {
    throw new HttpError(400, 'Die Seitenangabe ist ungültig.')
  }
  return page
}

function readPageSize(value) {
  const raw = asTrimmedString(value)
  if (!raw) {
    return DEFAULT_PAGE_SIZE
  }
  const pageSize = Number.parseInt(raw, 10)
  if (!Number.isInteger(pageSize) || pageSize < 1) {
    throw new HttpError(400, 'Die Seitengröße ist ungültig.')
  }
  if (pageSize > MAX_PAGE_SIZE) {
    throw new HttpError(400, 'Die Seitengröße darf höchstens 100 betragen.')
  }
  return pageSize
}

router.get(
  '/',
  authenticateToken,
  authorizeRoles('ADMINISTRATOR'),
  async (req, res, next) => {
    try {
      const userId = readOptionalId(
        req.query.userId,
        'Die Benutzer-ID ist ungültig.'
      )
      const action = asTrimmedString(req.query.action)
      const entityType = asTrimmedString(req.query.entityType)
      const { fromDate, toDate } = readDateRange(req.query)
      const page = readPage(req.query.page)
      const pageSize = readPageSize(req.query.pageSize)
      const offset = (page - 1) * pageSize

      const where = `WHERE ($1::int IS NULL OR a.user_id = $1)
          AND ($2::text IS NULL OR a.action = $2)
          AND ($3::text IS NULL OR a.entity_type = $3)
          AND ($4::date IS NULL OR a.created_at::date >= $4::date)
          AND ($5::date IS NULL OR a.created_at::date <= $5::date)`
      const filterValues = [
        userId,
        action || null,
        entityType || null,
        fromDate,
        toDate,
      ]

      const countResult = await pool.query(
        `SELECT COUNT(*)::int AS total
           FROM audit_logs a
           INNER JOIN users u ON u.id = a.user_id
           ${where}`,
        filterValues
      )
      const totalCount = countResult.rows[0].total

      const result = await pool.query(
        `SELECT a.id,
                a.created_at AS timestamp,
                a.action,
                a.entity_type,
                a.entity_id,
                a.description,
                COALESCE(
                  NULLIF(BTRIM(CONCAT(e.first_name, ' ', e.last_name)), ''),
                  u.username
                ) AS actor_name
           FROM audit_logs a
           INNER JOIN users u ON u.id = a.user_id
           LEFT JOIN employees e ON e.user_id = u.id
           ${where}
          ORDER BY a.created_at DESC
          LIMIT $6 OFFSET $7`,
        [...filterValues, pageSize, offset]
      )

      res.json({
        totalCount,
        page,
        pageSize,
        records: result.rows.map((row) => ({
          id: row.id,
          timestamp: row.timestamp,
          actorName: row.actor_name,
          action: row.action,
          entityType: row.entity_type,
          entityId: row.entity_id,
          description: row.description,
        })),
      })
    } catch (err) {
      next(err)
    }
  }
)

module.exports = router
