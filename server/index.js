require('dotenv').config()

const express = require('express')
const pool = require('./config/database')

const app = express()
const PORT = 5000

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
