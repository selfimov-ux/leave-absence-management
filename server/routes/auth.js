const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const express = require('express')
const pool = require('../config/database')
const { authenticateToken } = require('../middleware/auth')

const router = express.Router()
const GENERIC_LOGIN_ERROR = 'Benutzername oder Passwort ist ungültig.'

function toPublicUser(row) {
  return {
    id: row.id,
    username: row.username,
    role: row.role,
    employeeId: row.employee_id,
    firstName: row.first_name,
    lastName: row.last_name,
  }
}

async function findUserByUsername(username) {
  const result = await pool.query(
    `SELECT u.id,
            u.username,
            u.password_hash,
            u.role,
            u.is_active,
            e.id AS employee_id,
            e.first_name,
            e.last_name
       FROM users u
       INNER JOIN employees e ON e.user_id = u.id
      WHERE u.username = $1`,
    [username]
  )
  return result.rows[0] || null
}

async function findUserById(userId) {
  const result = await pool.query(
    `SELECT u.id,
            u.username,
            u.role,
            u.is_active,
            e.id AS employee_id,
            e.first_name,
            e.last_name
       FROM users u
       INNER JOIN employees e ON e.user_id = u.id
      WHERE u.id = $1`,
    [userId]
  )
  return result.rows[0] || null
}

function createAccessToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      role: user.role,
      employeeId: user.employee_id,
    },
    process.env.JWT_SECRET,
    { expiresIn: '8h' }
  )
}

router.post('/login', async (req, res, next) => {
  try {
    const username =
      typeof req.body?.username === 'string' ? req.body.username.trim() : ''
    const password =
      typeof req.body?.password === 'string' ? req.body.password : ''

    if (!username || !password) {
      console.info('Login failed: missing credentials')
      res.status(400).json({
        status: 'error',
        message: 'Bitte Benutzername und Passwort eingeben.',
      })
      return
    }

    if (!process.env.JWT_SECRET) {
      console.error('Login failed: JWT_SECRET is not configured')
      res.status(500).json({
        status: 'error',
        message: 'An unexpected error occurred',
      })
      return
    }

    const user = await findUserByUsername(username)

    if (!user || !user.is_active) {
      console.info('Login failed', { username })
      res.status(401).json({
        status: 'error',
        message: GENERIC_LOGIN_ERROR,
      })
      return
    }

    const passwordMatches = await bcrypt.compare(password, user.password_hash)

    if (!passwordMatches) {
      console.info('Login failed', { username })
      res.status(401).json({
        status: 'error',
        message: GENERIC_LOGIN_ERROR,
      })
      return
    }

    const token = createAccessToken(user)
    console.info('Login succeeded', { username })

    res.json({
      token,
      user: toPublicUser(user),
    })
  } catch (err) {
    next(err)
  }
})

router.get('/me', authenticateToken, async (req, res, next) => {
  try {
    const user = await findUserById(req.auth.userId)

    if (!user || !user.is_active) {
      res.status(401).json({
        status: 'error',
        message: 'Anmeldung ist ungültig oder abgelaufen.',
      })
      return
    }

    res.json({
      user: toPublicUser(user),
    })
  } catch (err) {
    next(err)
  }
})

module.exports = router
