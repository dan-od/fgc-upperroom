import { useEffect, useState } from 'react'
import { Copy, Download, QrCode, RefreshCw } from 'lucide-react'

import {
  generateAttendanceAdminSession,
  getAttendanceAdminQrDownloadUrl,
  getAttendanceAdminSession
} from '../../../utils/attendanceApi'

const panelStyle = {
  background: '#fff',
  border: '1px solid #e5e7eb',
  borderRadius: '14px',
  padding: '1.25rem',
  boxShadow: '0 4px 18px rgba(2, 8, 23, 0.06)'
}

const actionStyle = {
  border: 0,
  borderRadius: '10px',
  fontWeight: 700,
  fontSize: '0.9rem',
  padding: '0.65rem 0.9rem',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.45rem'
}

const AttendanceManager = () => {
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [session, setSession] = useState(null)
  const [isTestMode, setIsTestMode] = useState(false)

  const loadSession = async () => {
    setLoading(true)
    const result = await getAttendanceAdminSession()
    if (!result.ok) {
      setStatusMessage(result.data?.message || 'Unable to load attendance admin panel state.')
      setSession(null)
      setIsTestMode(Boolean(result.data?.testMode))
      setLoading(false)
      return
    }

    if (!result.data?.success) {
      setStatusMessage(result.data?.message || 'Unable to load attendance admin panel state.')
      setSession(null)
      setIsTestMode(Boolean(result.data?.testMode))
      setLoading(false)
      return
    }

    setIsTestMode(Boolean(result.data?.testMode))

    if (!result.data.sessionReady) {
      const generated = await generateAttendanceAdminSession({ force: false })
      if (generated.ok && generated.data?.success && generated.data.sessionReady) {
        setSession(generated.data.session)
        setIsTestMode(Boolean(generated.data?.testMode))
        setStatusMessage('Attendance code and QR generated automatically for this service window.')
        setLoading(false)
        return
      }

      setSession(null)
      setIsTestMode(Boolean(generated.data?.testMode || result.data?.testMode))
      setStatusMessage(generated.data?.message || result.data.message || 'Attendance is not ready yet.')
      setLoading(false)
      return
    }

    setSession(result.data.session)
    setStatusMessage(result.data.message || '')
    setLoading(false)
  }

  useEffect(() => {
    loadSession()
  }, [])

  const handleGenerate = async (force = false) => {
    setBusy(true)
    setStatusMessage('')

    const result = await generateAttendanceAdminSession({ force })
    if (!result.ok || !result.data?.success) {
      setStatusMessage(result.data?.message || 'Unable to generate attendance code.')
      setIsTestMode(Boolean(result.data?.testMode))
      setBusy(false)
      return
    }

    setSession(result.data.session)
    setIsTestMode(Boolean(result.data?.testMode))
    setStatusMessage(force ? 'Attendance code and QR regenerated.' : 'Attendance code and QR generated.')
    setBusy(false)
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    setStatusMessage('')
    await loadSession()
    setStatusMessage((current) => current || 'Attendance session refreshed.')
    setRefreshing(false)
  }

  const copyText = async (value, successLabel) => {
    try {
      await navigator.clipboard.writeText(value)
      setStatusMessage(successLabel)
    } catch {
      setStatusMessage('Unable to copy. Please copy manually.')
    }
  }

  const handleDownloadQr = async () => {
    const { url, key } = getAttendanceAdminQrDownloadUrl()

    try {
      const res = await fetch(url, {
        headers: { 'x-attendance-admin-key': key }
      })

      if (!res.ok) {
        setStatusMessage('Unable to download QR image right now.')
        return
      }

      const blob = await res.blob()
      const objectUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = objectUrl
      link.download = `attendance-${session?.serviceDate || 'sunday'}.png`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(objectUrl)
      setStatusMessage('QR image downloaded.')
    } catch {
      setStatusMessage('Unable to download QR image right now.')
    }
  }

  return (
    <div>
      <div style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
          <h2 style={{ margin: 0, color: '#111827' }}>Attendance Control</h2>
          {isTestMode ? (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                borderRadius: '999px',
                fontSize: '0.72rem',
                fontWeight: 800,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                padding: '0.22rem 0.6rem',
                background: '#fff7ed',
                color: '#9a3412',
                border: '1px solid #fed7aa'
              }}
            >
              Test Mode
            </span>
          ) : null}
        </div>
        <p style={{ margin: '0.45rem 0 0', color: '#4b5563' }}>
          Generate Sunday attendance code and QR from this panel only. Share the code/QR during service.
        </p>
      </div>

      <div style={panelStyle}>
        {loading ? <p style={{ margin: 0 }}>Loading attendance state...</p> : null}

        {!loading && !session ? (
          <div style={{ display: 'grid', gap: '0.9rem' }}>
            <p style={{ margin: 0, color: '#4b5563' }}>
              No attendance code published for the active Sunday window.
            </p>
            <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                style={{ ...actionStyle, background: '#5a4494', color: '#fff' }}
                onClick={() => handleGenerate(false)}
                disabled={busy}
              >
                <QrCode size={16} />
                {busy ? 'Generating...' : 'Generate Attendance Code & QR'}
              </button>
              <button
                type="button"
                style={{ ...actionStyle, background: '#eef2ff', color: '#312e81', border: '1px solid #c7d2fe' }}
                onClick={handleRefresh}
                disabled={busy || refreshing}
              >
                <RefreshCw size={16} />
                {refreshing ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
          </div>
        ) : null}

        {!loading && session ? (
          <div style={{ display: 'grid', gap: '1rem' }}>
            <div style={{ display: 'grid', gap: '0.35rem' }}>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Service Date
              </p>
              <p style={{ margin: 0, color: '#111827', fontWeight: 700 }}>{session.serviceDate}</p>
            </div>

            <div style={{ display: 'grid', gap: '0.35rem' }}>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Attendance Code
              </p>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '1.4rem', fontWeight: 800, letterSpacing: '0.08em', color: '#111827' }}>{session.code}</span>
                <button
                  type="button"
                  style={{ ...actionStyle, background: '#ecfeff', color: '#0f766e', border: '1px solid #99f6e4' }}
                  onClick={() => copyText(session.code, 'Attendance code copied.')}
                >
                  <Copy size={16} />
                  Copy Code
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gap: '0.6rem' }}>
              <img
                src={session.qrPngDataUrl}
                alt="Attendance QR"
                style={{ width: '220px', maxWidth: '100%', borderRadius: '12px', border: '1px solid #d1d5db', background: '#fff', padding: '0.45rem' }}
              />

              <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  style={{ ...actionStyle, background: '#eef2ff', color: '#312e81', border: '1px solid #c7d2fe' }}
                  onClick={handleRefresh}
                  disabled={busy || refreshing}
                >
                  <RefreshCw size={16} />
                  {refreshing ? 'Refreshing...' : 'Refresh'}
                </button>

                <button
                  type="button"
                  style={{ ...actionStyle, background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0' }}
                  onClick={handleDownloadQr}
                  disabled={refreshing}
                >
                  <Download size={16} />
                  Download QR
                </button>

                <button
                  type="button"
                  style={{ ...actionStyle, background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca' }}
                  onClick={() => handleGenerate(true)}
                  disabled={busy || refreshing}
                >
                  <RefreshCw size={16} />
                  {busy ? 'Regenerating...' : 'Regenerate Code & QR'}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {statusMessage ? (
          <p style={{ margin: '1rem 0 0', color: '#1f2937', fontSize: '0.92rem' }}>{statusMessage}</p>
        ) : null}
      </div>
    </div>
  )
}

export default AttendanceManager
