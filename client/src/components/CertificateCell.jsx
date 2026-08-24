import { useEffect, useState } from 'react'
import { fetchAuthorizedFile } from '../api'

function CertificateCell({ record }) {
  const [previewUrl, setPreviewUrl] = useState(null)
  const [error, setError] = useState('')
  const [isOpening, setIsOpening] = useState(false)

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

  async function openPreview() {
    setIsOpening(true)
    setError('')
    try {
      const file = await fetchAuthorizedFile(
        `/api/sickness-absences/${record.id}/certificate`
      )
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
      setPreviewUrl(URL.createObjectURL(file.blob))
    } catch (err) {
      setError(err.message)
    } finally {
      setIsOpening(false)
    }
  }

  function closePreview() {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }
    setPreviewUrl(null)
  }

  if (!record.hasCertificateFile) {
    return '—'
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

      {previewUrl ? (
        <div className="certificate-overlay" role="dialog" aria-modal="true">
          <div className="certificate-dialog">
            <div className="form-actions">
              <a
                className="btn-secondary"
                href={previewUrl}
                download="bescheinigung.pdf"
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
            <iframe
              className="certificate-preview"
              title="Bescheinigung"
              src={previewUrl}
            />
          </div>
        </div>
      ) : null}
    </>
  )
}

export default CertificateCell
