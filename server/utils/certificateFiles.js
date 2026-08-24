const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const multer = require('multer')
const HttpError = require('./httpError')

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'sickness-certificates')
const MAX_FILE_SIZE = 5 * 1024 * 1024
const STORED_NAME_PATTERN = /^[a-f0-9]{32}\.pdf$/
const INVALID_TYPE_MESSAGE = 'Nur PDF-Dateien sind erlaubt.'
const MISSING_FILE_MESSAGE = 'Bitte eine PDF-Datei hochladen.'
const FILE_TOO_LARGE_MESSAGE = 'Die Datei darf höchstens 5 MB groß sein.'

fs.mkdirSync(UPLOAD_DIR, { recursive: true })

function isPdfUpload(file) {
  if (!file) {
    return false
  }
  const originalName = path.basename(file.originalname || '').toLowerCase()
  return file.mimetype === 'application/pdf' && originalName.endsWith('.pdf')
}

function isStoredCertificateName(value) {
  return typeof value === 'string' && STORED_NAME_PATTERN.test(value)
}

function storedFilePath(filename) {
  if (!isStoredCertificateName(filename)) {
    return null
  }
  const resolved = path.resolve(UPLOAD_DIR, filename)
  const relative = path.relative(path.resolve(UPLOAD_DIR), resolved)
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    return null
  }
  return resolved
}

function removeStoredCertificate(filename) {
  const filePath = storedFilePath(filename)
  if (!filePath) {
    return
  }
  try {
    fs.unlinkSync(filePath)
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.error('Could not delete certificate file:', err.message)
    }
  }
}

function removeUploadedTemp(file) {
  if (!file?.path) {
    return
  }
  try {
    fs.unlinkSync(file.path)
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.error('Could not delete uploaded temp file:', err.message)
    }
  }
}

const diskStorage = multer.diskStorage({
  destination: UPLOAD_DIR,
  filename: (_req, _file, callback) => {
    callback(null, `${crypto.randomBytes(16).toString('hex')}.pdf`)
  },
})

const upload = multer({
  storage: diskStorage,
  limits: { fileSize: MAX_FILE_SIZE, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (!isPdfUpload(file)) {
      callback(new HttpError(400, INVALID_TYPE_MESSAGE))
      return
    }
    callback(null, true)
  },
})

function mapMulterError(err) {
  if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
    return new HttpError(400, FILE_TOO_LARGE_MESSAGE)
  }
  return err
}

function optionalCertificateUpload(req, res, next) {
  const contentType = req.headers['content-type'] || ''
  if (!contentType.includes('multipart/form-data')) {
    next()
    return
  }

  upload.single('certificate')(req, res, (err) => {
    if (err) {
      next(mapMulterError(err))
      return
    }
    next()
  })
}

function requireCertificateUpload(req, res, next) {
  const contentType = req.headers['content-type'] || ''
  if (!contentType.includes('multipart/form-data')) {
    next(new HttpError(400, MISSING_FILE_MESSAGE))
    return
  }

  upload.single('certificate')(req, res, (err) => {
    if (err) {
      next(mapMulterError(err))
      return
    }
    if (!req.file) {
      next(new HttpError(400, MISSING_FILE_MESSAGE))
      return
    }
    next()
  })
}

module.exports = {
  isStoredCertificateName,
  storedFilePath,
  removeStoredCertificate,
  removeUploadedTemp,
  optionalCertificateUpload,
  requireCertificateUpload,
}
