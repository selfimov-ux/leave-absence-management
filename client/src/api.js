import { getToken, clearSession } from './authStorage'

export class ApiError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

export async function apiRequest(path, { method = 'GET', body } = {}) {
  const token = getToken()
  const response = await fetch(path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  const data = await response.json().catch(() => null)

  if (response.status === 401) {
    clearSession()
  }

  if (!response.ok) {
    throw new ApiError(
      response.status,
      data?.message || 'Die Anfrage ist fehlgeschlagen.'
    )
  }

  return data
}

export async function apiFormRequest(path, { method = 'POST', formData }) {
  const token = getToken()
  const response = await fetch(path, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  })

  const data = await response.json().catch(() => null)

  if (response.status === 401) {
    clearSession()
  }

  if (!response.ok) {
    throw new ApiError(
      response.status,
      data?.message || 'Die Anfrage ist fehlgeschlagen.'
    )
  }

  return data
}

export async function fetchAuthorizedFile(path) {
  const token = getToken()
  const response = await fetch(path, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })

  if (response.status === 401) {
    clearSession()
  }

  if (!response.ok) {
    const data = await response.json().catch(() => null)
    throw new ApiError(
      response.status,
      data?.message || 'Die Datei konnte nicht geladen werden.'
    )
  }

  return {
    blob: await response.blob(),
    contentType: response.headers.get('Content-Type') || '',
  }
}
