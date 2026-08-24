const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const multer = require('multer')
const HttpError = require('./httpError')

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'sickness')
const MAX_FILE_SIZE = 5 * 1024 * 1024
const STORED_NAME_PATTERN = /^[0-9]+-[a-f0-9]+\.(pdf|jpg|png|webp|gif)$/

const MIME_TO_EXTENSION = {
  'application/pdf': '.pdf',
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
}

const EXTENSION_TO_MIME = {
  '.pdf': 'application/pdf',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
}

fs.mkdirSync(UPLOAD_DIR, { recursive: true })

function isStoredCertificateName(value) {
  return typeof value === 'string' && STORED_NAME_PATTERN.test(value)
}

function storedFilePath(filename) {
  if (!isStoredCertificateName(filename)) {
    return null
  }
  return path.join(UPLOAD_DIR, filename)
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
  filename: (_req, file, callback) => {
    const extension = MIME_TO_EXTENSION[file.mimetype]
    const name = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${extension}`
    callback(null, name)
  },
})

const upload = multer({
  storage: diskStorage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, callback) => {
    if (!MIME_TO_EXTENSION[file.mimetype]) {
      callback(
        new HttpError(
          400,
          'Nur PDF- oder Bilddateien (JPEG, PNG, WebP, GIF) sind erlaubt.'
        )
      )
      return
    }
    callback(null, true)
  },
})

function optionalCertificateUpload(req, res, next) {
  const contentType = req.headers['content-type'] || ''
  if (!contentType.includes('multipart/form-data')) {
    next()
    return
  }

  upload.single('certificate')(req, res, (err) => {
    if (!err) {
      next()
      return
    }
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      next(new HttpError(400, 'Die Datei darf höchstens 5 MB groß sein.'))
      return
    }
    next(err)
  })
}

function mimeForStoredName(filename) {
  return EXTENSION_TO_MIME[path.extname(filename)] || 'application/octet-stream'
}

module.exports = {
  isStoredCertificateName,
  storedFilePath,
  removeStoredCertificate,
  removeUploadedTemp,
  optionalCertificateUpload,
  mimeForStoredName,
}
