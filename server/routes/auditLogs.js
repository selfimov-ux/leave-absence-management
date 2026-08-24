const express = require('express')
const pool = require('../config/database')
const { authenticateToken, authorizeRoles } = require('../middleware/auth')

const router = express.Router()

router.get(
  '/',
  authenticateToken,
  authorizeRoles('ADMINISTRATOR'),
  async (req, res, next) => {
    try {
      const result = await pool.query(
        `SELECT a.id,
                a.action,
                a.entity_type,
                a.entity_id,
                a.description,
                a.created_at,
                u.username
           FROM audit_logs a
           INNER JOIN users u ON u.id = a.user_id
          ORDER BY a.created_at DESC
          LIMIT 50`
      )

      res.json(
        result.rows.map((row) => ({
          id: row.id,
          action: row.action,
          entityType: row.entity_type,
          entityId: row.entity_id,
          description: row.description,
          createdAt: row.created_at,
          username: row.username,
        }))
      )
    } catch (err) {
      next(err)
    }
  }
)

module.exports = router
