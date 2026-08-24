require('dotenv').config()

const express = require('express')
const pool = require('./config/database')
const authRoutes = require('./routes/auth')
const { authenticateToken, authorizeRoles } = require('./middleware/auth')

const app = express()
const PORT = 5000
const ALLOWED_ORIGINS = new Set([
  'http://localhost:5173',
  'http://localhost:5174',
])

const DATABASE_ERROR_CODES = new Set([
  'ECONNREFUSED',
  'ENOTFOUND',
  'ETIMEDOUT',
  '28P01',
  '28000',
  '3D000',
  '57P01',
  '53300',
])

app.use((req, res, next) => {
  const origin = req.headers.origin
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Vary', 'Origin')
  }
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')

  if (req.method === 'OPTIONS') {
    res.sendStatus(204)
    return
  }

  next()
})

app.use(express.json())

app.get('/', (req, res) => {
  res.send('Leave and Absence Management API')
})

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Leave and Absence Management API is running',
  })
})

app.get('/api/health/database', async (req, res, next) => {
  try {
    await pool.query('SELECT 1')
    res.json({
      status: 'ok',
      message: 'Database connection is working',
    })
  } catch (err) {
    next(err)
  }
})

app.get('/api/departments', async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT id, name, description, manager_id
         FROM departments
        WHERE name IS DISTINCT FROM $1
        ORDER BY name ASC`,
      ['']
    )
    res.json(result.rows)
  } catch (err) {
    next(err)
  }
})

app.use('/api/auth', authRoutes)

app.get(
  '/api/admin/test',
  authenticateToken,
  authorizeRoles('ADMINISTRATOR'),
  (req, res) => {
    res.json({
      status: 'ok',
      message: 'Administrator access granted',
    })
  }
)

app.use((err, req, res, next) => {
  console.error('Server error:', err.code || 'NO_CODE', err.message)

  if (DATABASE_ERROR_CODES.has(err.code)) {
    res.status(503).json({
      status: 'error',
      message: 'Database connection failed',
    })
    return
  }

  res.status(500).json({
    status: 'error',
    message: 'An unexpected error occurred',
  })
})

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
})
