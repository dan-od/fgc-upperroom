export const YOUTUBE_CHANNEL_ID_PATTERN = /^UC[a-zA-Z0-9_-]{22}$/
export const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
export const phonePattern = /^[+\d()\-\s]{7,20}$/

export const EXPORT_KEYS = ['admin_media', 'admin_blog_posts', 'admin_settings_v1']
export const LOCAL_CACHE_KEYS = ['upperroom_newsletter_subscribed', 'upperroom_attendance_browser_token']
export const SESSION_CACHE_KEYS = ['newsletterModalShown']

export const SECTIONS = [
  { id: 'general', label: 'General' },
  { id: 'api', label: 'API Keys' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'database', label: 'Database' },
  { id: 'security', label: 'Security' }
]

export function downloadJsonFile(fileName, payload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const objectUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = objectUrl
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(objectUrl)
}

export function buildUiTokens(darkMode, savingBySection) {
  const panelBackground = darkMode ? '#1a2235' : '#ffffff'
  const panelBorder = darkMode ? '#2a3550' : '#e5e7eb'
  const inputBackground = darkMode ? '#131b2e' : '#ffffff'
  const textPrimary = darkMode ? '#e2e8f0' : '#111827'
  const textSecondary = darkMode ? '#7f93b3' : '#6b7280'
  const textLabel = darkMode ? '#94afd4' : '#374151'
  const subtleSurface = darkMode ? '#222c40' : '#f9fafb'

  const cardStyle = { background: panelBackground, padding: '2rem', borderRadius: '0.75rem', border: `1px solid ${panelBorder}` }
  const labelStyle = { fontSize: '0.875rem', fontWeight: 600, color: textLabel }
  const inputStyle = { padding: '0.75rem', border: `1px solid ${panelBorder}`, borderRadius: '0.5rem', fontSize: '1rem', background: inputBackground, color: textPrimary }
  const saveButtonStyle = (section, destructive = false) => ({
    padding: '0.75rem 2rem', background: destructive ? '#ef4444' : '#5a4494', color: 'white',
    border: 'none', borderRadius: '0.5rem', fontSize: '1rem', fontWeight: 600,
    cursor: savingBySection[section] ? 'not-allowed' : 'pointer',
    display: 'flex', alignItems: 'center', gap: '0.5rem', width: 'fit-content',
    opacity: savingBySection[section] ? 0.7 : 1
  })

  return { panelBackground, panelBorder, textPrimary, textSecondary, subtleSurface, cardStyle, labelStyle, inputStyle, saveButtonStyle }
}
