const jwt = require('jsonwebtoken')

function authenticateToken(req, res, next) {
  const header = req.headers.authorization

  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({
      status: 'error',
      message: 'Anmeldung ist ungültig oder abgelaufen.',
    })
    return
  }

  const token = header.slice('Bearer '.length)

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET)
    req.auth = {
      userId: payload.sub,
      role: payload.role,
      employeeId: payload.employeeId,
    }
    next()
  } catch {
    res.status(401).json({
      status: 'error',
      message: 'Anmeldung ist ungültig oder abgelaufen.',
    })
  }
}

function authorizeRoles(...roles) {
  return (req, res, next) => {
    if (!req.auth || !roles.includes(req.auth.role)) {
      res.status(403).json({
        status: 'error',
        message: 'Sie haben keine Berechtigung für diese Aktion.',
      })
      return
    }
    next()
  }
}

module.exports = {
  authenticateToken,
  authorizeRoles,
}
