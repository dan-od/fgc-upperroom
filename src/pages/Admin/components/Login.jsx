import { useState } from 'react'
import { Eye, EyeOff, KeyRound, Lock, Mail, ShieldCheck } from 'lucide-react'

const initialForm = {
  email: '',
  password: '',
  otpCode: ''
}

const Login = ({ onLogin, onRequestReset, onConfirmReset }) => {
  const [form, setForm] = useState(initialForm)
  const [mode, setMode] = useState('login')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)
  const [otpRequired, setOtpRequired] = useState(false)
  const [resetToken, setResetToken] = useState('')
  const [resetPassword, setResetPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showResetPassword, setShowResetPassword] = useState(false)

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleLoginSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setInfo('')
    setLoading(true)

    try {
      const result = await onLogin({
        email: form.email,
        password: form.password,
        otpCode: form.otpCode
      })

      if (result?.ok) {
        return
      }

      setOtpRequired(Boolean(result?.otpRequired))
      setError(result?.message || 'Unable to sign in.')
      if (!result?.otpRequired) {
        setForm((prev) => ({ ...prev, password: '', otpCode: '' }))
      }
    } catch {
      setError('Unable to sign in.')
    } finally {
      setLoading(false)
    }
  }

  const handleRequestReset = async (event) => {
    event.preventDefault()
    setError('')
    setInfo('')

    const email = String(form.email || '').trim()
    if (!email) {
      setError('Enter your admin email first.')
      return
    }

    setLoading(true)
    try {
      const result = await onRequestReset({ email })
      if (result?.resetToken) {
        setInfo(`Reset token generated (dev): ${result.resetToken}`)
      } else {
        setInfo('Reset request received. If this account exists, a token was generated.')
      }
      setMode('confirm-reset')
    } catch (err) {
      setError(err?.message || 'Could not request password reset.')
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmReset = async (event) => {
    event.preventDefault()
    setError('')
    setInfo('')

    if (!resetToken.trim() || !resetPassword.trim()) {
      setError('Reset token and new password are required.')
      return
    }

    setLoading(true)
    try {
      await onConfirmReset({ token: resetToken.trim(), newPassword: resetPassword.trim() })
      setInfo('Password reset successful. Sign in with the new password.')
      setMode('login')
      setResetToken('')
      setResetPassword('')
      setOtpRequired(false)
      setForm((prev) => ({ ...prev, password: '', otpCode: '' }))
    } catch (err) {
      setError(err?.message || 'Could not reset password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="admin-login">
      <div className="admin-login-card">
        <div className="admin-login-card__halo" aria-hidden="true" />
        <div className="admin-login-header">
          <span className="admin-login-eyebrow">Admin Center</span>
          <div className="admin-login-icon">
            {mode === 'login' ? <Lock size={32} /> : <KeyRound size={32} />}
          </div>
          <h1>{mode === 'login' ? 'Admin Login' : 'Password Reset'}</h1>
          <p>
            {mode === 'login'
              ? 'Sign in with your server-backed admin account credentials'
              : 'Use a reset token to set a new admin password'}
          </p>
        </div>

        {mode === 'login' ? (
          <form className="admin-login-form" onSubmit={handleLoginSubmit}>
            <div className="admin-form-group">
              <label htmlFor="email" className="admin-form-label">Email</label>
              <div className="admin-input-with-icon">
                <Mail size={16} />
                <input
                  type="email"
                  id="email"
                  name="email"
                  className="admin-form-input"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="admin@upperroom.local"
                  autoFocus
                  required
                />
              </div>
            </div>

            <div className="admin-form-group">
              <label htmlFor="password" className="admin-form-label">Password</label>
              <div className="admin-input-with-icon">
                <Lock size={16} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  className="admin-form-input"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="admin-input-toggle"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {otpRequired && (
              <div className="admin-form-group">
                <label htmlFor="otpCode" className="admin-form-label">2FA Code</label>
                <div className="admin-input-with-icon">
                  <ShieldCheck size={16} />
                  <input
                    type="text"
                    id="otpCode"
                    name="otpCode"
                    className="admin-form-input"
                    value={form.otpCode}
                    onChange={handleChange}
                    placeholder="6-digit authenticator code"
                    inputMode="numeric"
                    pattern="\d{6}"
                    required
                  />
                </div>
              </div>
            )}

            {error && <div className="admin-login-error">{error}</div>}
            {info && <div className="admin-login-info">{info}</div>}

            <button type="submit" className="admin-login-btn" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>

            <button
              type="button"
              className="admin-login-link"
              onClick={() => {
                setMode('request-reset')
                setError('')
                setInfo('')
              }}
            >
              Forgot password?
            </button>

            <p className="admin-login-help">
              Use password reset if your seeded local admin password has already been changed.
            </p>
          </form>
        ) : null}

        {mode === 'request-reset' ? (
          <form className="admin-login-form" onSubmit={handleRequestReset}>
            <div className="admin-form-group">
              <label htmlFor="reset-email" className="admin-form-label">Admin Email</label>
              <div className="admin-input-with-icon">
                <Mail size={16} />
                <input
                  id="reset-email"
                  type="email"
                  name="email"
                  className="admin-form-input"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="admin@upperroom.local"
                  required
                />
              </div>
            </div>

            {error && <div className="admin-login-error">{error}</div>}
            {info && <div className="admin-login-info">{info}</div>}

            <button type="submit" className="admin-login-btn" disabled={loading}>
              {loading ? 'Requesting...' : 'Request Reset'}
            </button>
            <button type="button" className="admin-login-link" onClick={() => setMode('confirm-reset')}>
              I already have a reset token
            </button>
            <button type="button" className="admin-login-link" onClick={() => setMode('login')}>
              Back to login
            </button>
          </form>
        ) : null}

        {mode === 'confirm-reset' ? (
          <form className="admin-login-form" onSubmit={handleConfirmReset}>
            <div className="admin-form-group">
              <label htmlFor="reset-token" className="admin-form-label">Reset Token</label>
              <div className="admin-input-with-icon">
                <KeyRound size={16} />
                <input
                  id="reset-token"
                  type="text"
                  className="admin-form-input"
                  value={resetToken}
                  onChange={(event) => setResetToken(event.target.value)}
                  placeholder="Paste reset token"
                  required
                />
              </div>
            </div>

            <div className="admin-form-group">
              <label htmlFor="reset-password" className="admin-form-label">New Password</label>
              <div className="admin-input-with-icon">
                <Lock size={16} />
                <input
                  id="reset-password"
                  type={showResetPassword ? 'text' : 'password'}
                  className="admin-form-input"
                  value={resetPassword}
                  onChange={(event) => setResetPassword(event.target.value)}
                  placeholder="Minimum 10 characters with upper/lower/number"
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  className="admin-input-toggle"
                  onClick={() => setShowResetPassword((prev) => !prev)}
                  aria-label={showResetPassword ? 'Hide new password' : 'Show new password'}
                >
                  {showResetPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && <div className="admin-login-error">{error}</div>}
            {info && <div className="admin-login-info">{info}</div>}

            <button type="submit" className="admin-login-btn" disabled={loading}>
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
            <button type="button" className="admin-login-link" onClick={() => setMode('login')}>
              Back to login
            </button>
          </form>
        ) : null}
      </div>
    </div>
  )
}

export default Login
