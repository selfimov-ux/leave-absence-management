import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiRequest } from '../api'
import { clearSession } from '../authStorage'
import AdminPage from '../components/AdminPage'
import { useLanguage } from '../i18n/LanguageContext'

function validateNewPassword(password, t) {
  if (!password || password.length < 10) {
    return t('password.needLength')
  }
  if (!/[A-Z]/.test(password)) {
    return t('password.needUpper')
  }
  if (!/[a-z]/.test(password)) {
    return t('password.needLower')
  }
  if (!/[0-9]/.test(password)) {
    return t('password.needDigit')
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    return t('password.needSpecial')
  }
  return ''
}

function PasswordField({ id, label, autoComplete, value, onChange, disabled, showLabel, hideLabel }) {
  const [visible, setVisible] = useState(false)

  return (
    <>
      <label htmlFor={id}>{label}</label>
      <div className="password-field">
        <input
          id={id}
          name={id}
          type={visible ? 'text' : 'password'}
          autoComplete={autoComplete}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
        />
        <button
          type="button"
          className="btn-secondary"
          onClick={() => setVisible((current) => !current)}
          disabled={disabled}
        >
          {visible ? hideLabel : showLabel}
        </button>
      </div>
    </>
  )
}

function ChangePasswordPage() {
  const navigate = useNavigate()
  const { t } = useLanguage()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  function resetFields() {
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError(t('password.allRequired'))
      resetFields()
      return
    }

    if (newPassword !== confirmPassword) {
      setError(t('password.mismatch'))
      resetFields()
      return
    }

    const ruleError = validateNewPassword(newPassword, t)
    if (ruleError) {
      setError(ruleError)
      resetFields()
      return
    }

    if (newPassword === currentPassword) {
      setError(t('password.sameAsCurrent'))
      resetFields()
      return
    }

    setIsSaving(true)
    try {
      await apiRequest('/api/auth/change-password', {
        method: 'PUT',
        body: {
          currentPassword,
          newPassword,
        },
      })
      resetFields()
      clearSession()
      navigate('/login', {
        replace: true,
        state: { passwordChanged: true },
      })
    } catch (err) {
      if (err.status === 401) {
        resetFields()
        navigate('/login', { replace: true })
        return
      }
      setError(err.message)
      resetFields()
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <AdminPage
      eyebrow={t('password.eyebrow')}
      title={t('password.title')}
      lead={t('password.lead')}
    >
      <ul className="field-hint password-rules">
        <li>{t('password.ruleLength')}</li>
        <li>{t('password.ruleUpper')}</li>
        <li>{t('password.ruleLower')}</li>
        <li>{t('password.ruleDigit')}</li>
        <li>{t('password.ruleSpecial')}</li>
      </ul>

      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}

      <form className="admin-form" onSubmit={handleSubmit} noValidate>
        <PasswordField
          id="currentPassword"
          label={t('password.current')}
          autoComplete="current-password"
          value={currentPassword}
          onChange={setCurrentPassword}
          disabled={isSaving}
          showLabel={t('password.show')}
          hideLabel={t('password.hide')}
        />
        <PasswordField
          id="newPassword"
          label={t('password.new')}
          autoComplete="new-password"
          value={newPassword}
          onChange={setNewPassword}
          disabled={isSaving}
          showLabel={t('password.show')}
          hideLabel={t('password.hide')}
        />
        <PasswordField
          id="confirmPassword"
          label={t('password.confirm')}
          autoComplete="new-password"
          value={confirmPassword}
          onChange={setConfirmPassword}
          disabled={isSaving}
          showLabel={t('password.show')}
          hideLabel={t('password.hide')}
        />

        <div className="form-actions">
          <button type="submit" className="btn-primary" disabled={isSaving}>
            {isSaving ? t('common.saving') : t('password.submit')}
          </button>
        </div>
      </form>
    </AdminPage>
  )
}

export default ChangePasswordPage
