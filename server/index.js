require('dotenv').config()

const express = require('express')
const pool = require('./config/database')
const authRoutes = require('./routes/auth')
const departmentRoutes = require('./routes/departments')
const leaveTypeRoutes = require('./routes/leaveTypes')
const employeeRoutes = require('./routes/employees')
const auditLogRoutes = require('./routes/auditLogs')
const leaveRequestRoutes = require('./routes/leaveRequests')
const leaveBalanceRoutes = require('./routes/leaveBalances')
const managerLeaveRequestRoutes = require('./routes/managerLeaveRequests')
const sicknessAbsenceRoutes = require('./routes/sicknessAbsences')
const managerSicknessAbsenceRoutes = require('./routes/managerSicknessAbsences')
const adminSicknessAbsenceRoutes = require('./routes/adminSicknessAbsences')
const { authenticateToken, authorizeRoles } = require('./middleware/auth')
const HttpError = require('./utils/httpError')
const { uniqueConstraintMessage } = require('./utils/request')

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
  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET, POST, PUT, PATCH, DELETE, OPTIONS'
  )

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

app.use('/api/auth', authRoutes)
app.use('/api/departments', departmentRoutes)
app.use('/api/leave-types', leaveTypeRoutes)
app.use('/api/employees', employeeRoutes)
app.use('/api/audit-logs', auditLogRoutes)
app.use('/api/leave-requests', leaveRequestRoutes)
app.use('/api/leave-balances', leaveBalanceRoutes)
app.use('/api/manager/leave-requests', managerLeaveRequestRoutes)
app.use('/api/sickness-absences', sicknessAbsenceRoutes)
app.use('/api/manager/sickness-absences', managerSicknessAbsenceRoutes)
app.use('/api/admin/sickness-absences', adminSicknessAbsenceRoutes)

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
  if (err instanceof HttpError) {
    res.status(err.status).json({
      status: 'error',
      message: err.message,
    })
    return
  }

  console.error('Server error:', err.code || 'NO_CODE', err.message)

  if (err.code === '23505') {
    res.status(409).json({
      status: 'error',
      message: uniqueConstraintMessage(err),
    })
    return
  }

  if (err.code === '23503') {
    res.status(400).json({
      status: 'error',
      message: 'Die angegebene Referenz existiert nicht.',
    })
    return
  }

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
