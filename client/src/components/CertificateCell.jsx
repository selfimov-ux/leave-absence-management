import { useEffect, useState } from 'react'
import { fetchAuthorizedFile } from '../api'

function CertificateCell({ record }) {
  const [preview, setPreview] = useState(null)
  const [error, setError] = useState('')
  const [isOpening, setIsOpening] = useState(false)

  useEffect(() => {
    return () => {
      if (preview?.url) {
        URL.revokeObjectURL(preview.url)
      }
    }
  }, [preview])

  async function openPreview() {
    setIsOpening(true)
    setError('')
    try {
      const file = await fetchAuthorizedFile(
        `/api/sickness-absences/${record.id}/certificate`
      )
      if (preview?.url) {
        URL.revokeObjectURL(preview.url)
      }
      setPreview({
        url: URL.createObjectURL(file.blob),
        isImage: file.contentType.startsWith('image/'),
      })
    } catch (err) {
      setError(err.message)
    } finally {
      setIsOpening(false)
    }
  }

  function closePreview() {
    if (preview?.url) {
      URL.revokeObjectURL(preview.url)
    }
    setPreview(null)
  }

  if (!record.hasCertificateFile) {
    return record.certificateReference || '—'
  }

  return (
    <>
      <button
        type="button"
        className="link-button"
        onClick={openPreview}
        disabled={isOpening}
      >
        {isOpening ? 'Wird geladen…' : 'Bescheinigung anzeigen'}
      </button>
      {error ? <p className="form-error">{error}</p> : null}

      {preview ? (
        <div className="certificate-overlay" role="dialog" aria-modal="true">
          <div className="certificate-dialog">
            <div className="form-actions">
              <a
                className="btn-secondary"
                href={preview.url}
                download="bescheinigung"
              >
                Herunterladen
              </a>
              <button
                type="button"
                className="btn-primary"
                onClick={closePreview}
              >
                Schließen
              </button>
            </div>
            {preview.isImage ? (
              <img
                className="certificate-preview"
                src={preview.url}
                alt="Bescheinigung"
              />
            ) : (
              <iframe
                className="certificate-preview"
                title="Bescheinigung"
                src={preview.url}
              />
            )}
          </div>
        </div>
      ) : null}
    </>
  )
}

export default CertificateCell
