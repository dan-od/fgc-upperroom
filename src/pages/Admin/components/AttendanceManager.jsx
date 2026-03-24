import { useEffect, useState } from 'react'
import { Copy, Download, QrCode, RefreshCw } from 'lucide-react'
import { FacebookIcon, InstagramIcon, TikTokIcon, TwitterIcon, YoutubeIcon } from '../../../components/common/SocialIcons'
import { useAdminTheme } from '../AdminThemeContext'

import {
  generateAttendanceAdminSession,
  getAttendanceAdminQrDownloadUrl,
  getAttendanceAdminSession,
  getAttendanceAdminSocialQrDownloadUrl,
  getAttendanceAdminSocialQrs
} from '../../../utils/attendanceApi'

const BASE_ACTION_STYLE = {
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

const SOCIAL_ICON_COMPONENTS = {
  facebook: FacebookIcon,
  instagram: InstagramIcon,
  youtube: YoutubeIcon,
  x: TwitterIcon,
  tiktok: TikTokIcon
}

const SOCIAL_BRAND_STYLES = {
  facebook: { badgeBackground: '#1877F2', iconColor: '#ffffff' },
  instagram: { badgeBackground: '#E1306C', iconColor: '#ffffff' },
  youtube: { badgeBackground: '#FF0000', iconColor: '#ffffff' },
  x: { badgeBackground: '#111827', iconColor: '#ffffff' },
  tiktok: { badgeBackground: '#111827', iconColor: '#ffffff' }
}

const SOCIAL_ICON_PATHS = {
  facebook: 'M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z',
  instagram: 'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z',
  youtube: 'M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z',
  tiktok: 'M19.589 6.686a4.793 4.793 0 01-3.77-4.716h-3.4v13.77a2.892 2.892 0 11-2.891-2.892c.358 0 .704.067 1.026.184V9.577a6.292 6.292 0 00-1.026-.084 6.292 6.292 0 106.292 6.292V9.211a8.194 8.194 0 004.77 1.523V7.333a4.83 4.83 0 01-1.001-.647z',
  x: 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z'
}

const getSocialBrandStyle = (socialKey) => SOCIAL_BRAND_STYLES[socialKey] || { badgeBackground: '#111827', iconColor: '#ffffff' }

const loadImage = (source) => new Promise((resolve, reject) => {
  const image = new Image()
  image.onload = () => resolve(image)
  image.onerror = reject
  image.src = source
})

const getSocialIconSvgDataUrl = (socialKey, fillColor) => {
  const iconPath = SOCIAL_ICON_PATHS[socialKey]
  if (!iconPath) return null

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="${fillColor}"><path d="${iconPath}"/></svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

const downloadBlobAsFile = (blob, fileName) => {
  const objectUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = objectUrl
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(objectUrl)
}

const AttendanceManager = () => {
  const { darkMode } = useAdminTheme()
  const ui = {
    panel: darkMode ? '#1a2235' : '#fff',
    panelSubtle: darkMode ? '#131b2e' : '#f9fafb',
    border: darkMode ? '#2a3550' : '#e5e7eb',
    borderSoft: darkMode ? '#3a4866' : '#d1d5db',
    textPrimary: darkMode ? '#e2e8f0' : '#111827',
    textSecondary: darkMode ? '#94afd4' : '#4b5563',
    textMuted: darkMode ? '#c3d4ef' : '#1f2937',
    link: darkMode ? '#9ab8ff' : '#4f46e5'
  }
  const panelStyle = {
    background: ui.panel,
    border: `1px solid ${ui.border}`,
    borderRadius: '14px',
    padding: '1.25rem',
    boxShadow: darkMode ? '0 8px 30px rgba(1, 6, 15, 0.45)' : '0 4px 18px rgba(2, 8, 23, 0.06)'
  }
  const actionStyle = BASE_ACTION_STYLE
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [session, setSession] = useState(null)
  const [isTestMode, setIsTestMode] = useState(false)
  const [socialLoading, setSocialLoading] = useState(true)
  const [socialLinks, setSocialLinks] = useState([])
  const [socialStatusMessage, setSocialStatusMessage] = useState('')

  const loadSocialQrs = async () => {
    setSocialLoading(true)
    const result = await getAttendanceAdminSocialQrs()
    if (!result.ok || !result.data?.success) {
      setSocialLinks([])
      setSocialStatusMessage(result.data?.message || 'Unable to load permanent social QR links.')
      setSocialLoading(false)
      return
    }

    setSocialLinks(Array.isArray(result.data.links) ? result.data.links : [])
    setSocialStatusMessage('')
    setSocialLoading(false)
  }

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
    loadSocialQrs()
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
    setSocialStatusMessage('')
    await Promise.all([loadSession(), loadSocialQrs()])
    setStatusMessage((current) => current || 'Attendance session refreshed.')
    setSocialStatusMessage((current) => current || 'Permanent social QR links refreshed.')
    setRefreshing(false)
  }

  const copyText = async (value, successLabel, setMessage = setStatusMessage) => {
    try {
      await navigator.clipboard.writeText(value)
      setMessage(successLabel)
    } catch {
      setMessage('Unable to copy. Please copy manually.')
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

  const handleDownloadSocialQr = async (social) => {
    const { key: socialKey, label: socialLabel, qrPngDataUrl } = social
    const brand = getSocialBrandStyle(socialKey)

    try {
      const qrImage = await loadImage(qrPngDataUrl)
      const iconSvgDataUrl = getSocialIconSvgDataUrl(socialKey, brand.iconColor)
      if (!iconSvgDataUrl) {
        throw new Error('icon-not-available')
      }

      const iconImage = await loadImage(iconSvgDataUrl)
      const qrSize = qrImage.width || 280
      const canvas = document.createElement('canvas')
      canvas.width = qrSize
      canvas.height = qrSize
      const context = canvas.getContext('2d')
      if (!context) {
        throw new Error('canvas-unavailable')
      }

      context.drawImage(qrImage, 0, 0, qrSize, qrSize)

      const badgeRadius = qrSize * 0.125
      const badgeCenter = qrSize / 2
      context.beginPath()
      context.arc(badgeCenter, badgeCenter, badgeRadius, 0, Math.PI * 2)
      context.fillStyle = '#ffffff'
      context.fill()
      context.lineWidth = Math.max(2, qrSize * 0.01)
      context.strokeStyle = ui.borderSoft
      context.stroke()

      const innerBadgeRadius = badgeRadius * 0.68
      context.beginPath()
      context.arc(badgeCenter, badgeCenter, innerBadgeRadius, 0, Math.PI * 2)
      context.fillStyle = brand.badgeBackground
      context.fill()

      const iconSize = innerBadgeRadius * 1.22
      context.drawImage(iconImage, badgeCenter - iconSize / 2, badgeCenter - iconSize / 2, iconSize, iconSize)

      const composedBlob = await new Promise((resolve) => {
        canvas.toBlob(resolve, 'image/png')
      })

      if (!composedBlob) {
        throw new Error('blob-failed')
      }

      downloadBlobAsFile(composedBlob, `social-${socialKey}.png`)
      setSocialStatusMessage(`${socialLabel} branded QR image downloaded.`)
    } catch {
      const { url, key } = getAttendanceAdminSocialQrDownloadUrl(socialKey)
      const fallback = await fetch(url, {
        headers: { 'x-attendance-admin-key': key }
      }).catch(() => null)

      if (!fallback || !fallback.ok) {
        setSocialStatusMessage(`Unable to download ${socialLabel} QR image right now.`)
        return
      }

      const fallbackBlob = await fallback.blob()
      downloadBlobAsFile(fallbackBlob, `social-${socialKey}.png`)
      setSocialStatusMessage(`${socialLabel} QR image downloaded.`)
    }
  }

  return (
    <div>
      <div style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
          <h2 style={{ margin: 0, color: ui.textPrimary }}>Attendance Control</h2>
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
        <p style={{ margin: '0.45rem 0 0', color: ui.textSecondary }}>
          Generate Sunday attendance code and QR from this panel only. Share the code/QR during service.
        </p>
      </div>

      <div style={panelStyle}>
        {loading ? <p style={{ margin: 0 }}>Loading attendance state...</p> : null}

        {!loading && !session ? (
          <div style={{ display: 'grid', gap: '0.9rem' }}>
            <p style={{ margin: 0, color: ui.textSecondary }}>
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
              <p style={{ margin: 0, fontSize: '0.8rem', color: ui.textSecondary, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Service Date
              </p>
              <p style={{ margin: 0, color: ui.textPrimary, fontWeight: 700 }}>{session.serviceDate}</p>
            </div>

            <div style={{ display: 'grid', gap: '0.35rem' }}>
              <p style={{ margin: 0, fontSize: '0.8rem', color: ui.textSecondary, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Attendance Code
              </p>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '1.4rem', fontWeight: 800, letterSpacing: '0.08em', color: ui.textPrimary }}>{session.code}</span>
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
                style={{ width: '220px', maxWidth: '100%', borderRadius: '12px', border: `1px solid ${ui.borderSoft}`, background: ui.panel, padding: '0.45rem' }}
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
          <p style={{ margin: '1rem 0 0', color: ui.textMuted, fontSize: '0.92rem' }}>{statusMessage}</p>
        ) : null}
      </div>

      <div style={{ marginTop: '1.15rem' }}>
        <div style={{ marginBottom: '0.8rem' }}>
          <h3 style={{ margin: 0, color: ui.textPrimary }}>Permanent Social QR Codes</h3>
          <p style={{ margin: '0.45rem 0 0', color: ui.textSecondary }}>
            These links stay stable and won&apos;t affect Sunday attendance QR flow.
          </p>
        </div>

        <div style={panelStyle}>
          {socialLoading ? <p style={{ margin: 0 }}>Loading social QR links...</p> : null}

          {!socialLoading && socialLinks.length === 0 ? (
            <p style={{ margin: 0, color: ui.textSecondary }}>
              No social links configured yet.
            </p>
          ) : null}

          {!socialLoading && socialLinks.length > 0 ? (
            <div style={{ overflowX: 'auto', paddingBottom: '0.35rem' }}>
              <div style={{ display: 'grid', gap: '0.9rem', gridTemplateColumns: 'repeat(5, minmax(220px, 1fr))', minWidth: '1120px' }}>
                {socialLinks.map((social) => {
                  const SocialIcon = SOCIAL_ICON_COMPONENTS[social.key]
                  const brand = getSocialBrandStyle(social.key)

                  return (
                    <div
                      key={social.key}
                      style={{
                        border: `1px solid ${ui.border}`,
                        borderRadius: '12px',
                        padding: '0.85rem',
                        display: 'grid',
                        gap: '0.65rem'
                      }}
                    >
                      <div style={{ display: 'grid', gap: '0.2rem' }}>
                        <p style={{ margin: 0, fontWeight: 700, color: ui.textPrimary }}>{social.label}</p>
                        <a href={social.permanentUrl} target="_blank" rel="noopener noreferrer" style={{ color: ui.link, wordBreak: 'break-all', fontSize: '0.8rem' }}>
                          {social.permanentUrl}
                        </a>
                      </div>

                      <div style={{ position: 'relative', width: '180px', justifySelf: 'center' }}>
                        <img
                          src={social.qrPngDataUrl}
                          alt={`${social.label} permanent QR`}
                          style={{ width: '100%', maxWidth: '100%', borderRadius: '10px', border: `1px solid ${ui.borderSoft}`, background: ui.panel, padding: '0.35rem' }}
                        />
                        {SocialIcon ? (
                          <div
                            style={{
                              position: 'absolute',
                              top: '50%',
                              left: '50%',
                              transform: 'translate(-50%, -50%)',
                              width: '40px',
                              height: '40px',
                              borderRadius: '999px',
                              background: '#ffffff',
                              border: `1px solid ${ui.borderSoft}`,
                              display: 'grid',
                              placeItems: 'center',
                              pointerEvents: 'none'
                            }}
                          >
                            <div
                              style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: '999px',
                                background: brand.badgeBackground,
                                display: 'grid',
                                placeItems: 'center'
                              }}
                            >
                              <SocialIcon size={14} color={brand.iconColor} />
                            </div>
                          </div>
                        ) : null}
                      </div>

                      <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          style={{ ...actionStyle, background: '#ecfeff', color: '#0f766e', border: '1px solid #99f6e4' }}
                          onClick={() => copyText(social.permanentUrl, `${social.label} permanent link copied.`, setSocialStatusMessage)}
                        >
                          <Copy size={16} />
                          Copy Link
                        </button>

                        <button
                          type="button"
                          style={{ ...actionStyle, background: '#eef2ff', color: '#312e81', border: '1px solid #c7d2fe' }}
                          onClick={() => handleDownloadSocialQr(social)}
                        >
                          <Download size={16} />
                          Download QR
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : null}

          {socialStatusMessage ? (
            <p style={{ margin: '1rem 0 0', color: ui.textMuted, fontSize: '0.92rem' }}>{socialStatusMessage}</p>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export default AttendanceManager
