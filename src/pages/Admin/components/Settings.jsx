import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, Bell, Database, Globe, Key, Save, ScrollText, Shield, UserCog } from 'lucide-react'

import { useAdminTheme } from '../AdminThemeContext'
import AdminModal from './AdminModal'
import {
  readAdminSettings,
  saveAdminSettings
} from '../../../utils/adminSettings'
import {
  changeAdminPassword,
  disableAdminTwoFactor,
  setupAdminTwoFactor,
  verifyAdminTwoFactor
} from '../../../utils/adminApi'

const YOUTUBE_CHANNEL_ID_PATTERN = /^UC[a-zA-Z0-9_-]{22}$/

const EXPORT_KEYS = [
  'admin_media',
  'admin_blog_posts',
  'admin_settings_v1'
]

const LOCAL_CACHE_KEYS = [
  'upperroom_newsletter_subscribed',
  'upperroom_attendance_browser_token'
]

const SESSION_CACHE_KEYS = ['newsletterModalShown']

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const phonePattern = /^[+\d()\-\s]{7,20}$/

const downloadJsonFile = (fileName, payload) => {
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

const Settings = ({ initialSection = 'general', currentUser = null, hasPermission = () => false, onNavigate = () => {} }) => {
  const { darkMode } = useAdminTheme()
  const canManageSettings = hasPermission('admin:settings:manage')

  if (!canManageSettings) {
    return (
      <div style={{
        padding: '2rem',
        background: darkMode ? '#1a2235' : '#ffffff',
        border: `1px solid ${darkMode ? '#2a3550' : '#e5e7eb'}`,
        borderRadius: '1rem',
        textAlign: 'center'
      }}>
        <div style={{ padding: '1rem', background: '#fef2f2', color: '#991b1b', borderRadius: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <Shield size={24} />
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>Access Denied</h2>
        </div>
        <p style={{ margin: 0, color: darkMode ? '#7f93b3' : '#64748b', fontSize: '0.95rem' }}>
          You do not have permission to view or manage admin settings. 
          Please contact a Super Admin if you believe this is an error.
        </p>
      </div>
    )
  }

  const [activeSection, setActiveSection] = useState(initialSection)
  const [settings, setSettings] = useState(() => readAdminSettings())
  const [securityForm, setSecurityForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [securityData, setSecurityData] = useState({
    twoFactorSetup: null,
    twoFactorCode: ''
  })
  const [savingBySection, setSavingBySection] = useState({})
  const [statusBySection, setStatusBySection] = useState({})

  // Modal system
  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    title: '',
    message: '',
    tone: 'info',
    onConfirm: null,
    showInput: false,
    inputValue: '',
    inputPlaceholder: '',
    confirmLabel: 'Confirm',
    cancelLabel: 'Cancel'
  })

  const closeModal = () => setModalConfig((prev) => ({ ...prev, isOpen: false }))
  const openModal = (config) => setModalConfig({
    isOpen: true,
    title: config.title || 'Are you sure?',
    message: config.message || '',
    tone: config.tone || 'info',
    onConfirm: config.onConfirm || null,
    showInput: !!config.showInput,
    inputValue: config.initialValue || '',
    inputPlaceholder: config.inputPlaceholder || '',
    confirmLabel: config.confirmLabel || 'Confirm',
    cancelLabel: config.cancelLabel || 'Cancel'
  })

  const handleModalConfirm = () => {
    if (modalConfig.onConfirm) {
      modalConfig.onConfirm(modalConfig.inputValue)
    }
    closeModal()
  }

  const sections = [
    { id: 'general', label: 'General', icon: Globe },
    { id: 'api', label: 'API Keys', icon: Key },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'database', label: 'Database', icon: Database },
    { id: 'security', label: 'Security', icon: Shield }
  ]

  const sectionMap = useMemo(() => {
    return Object.fromEntries(sections.map((item) => [item.id, item]))
  }, [])

  useEffect(() => {
    if (sectionMap[initialSection]) {
      setActiveSection(initialSection)
    }
  }, [initialSection, sectionMap])

  const panelBackground = darkMode ? '#1a2235' : '#ffffff'
  const panelBorder = darkMode ? '#2a3550' : '#e5e7eb'
  const inputBackground = darkMode ? '#131b2e' : '#ffffff'
  const textPrimary = darkMode ? '#e2e8f0' : '#111827'
  const textSecondary = darkMode ? '#7f93b3' : '#6b7280'
  const textLabel = darkMode ? '#94afd4' : '#374151'
  const subtleSurface = darkMode ? '#222c40' : '#f9fafb'

  const setSectionStatus = (section, tone, message) => {
    setStatusBySection((prev) => ({
      ...prev,
      [section]: { tone, message }
    }))
  }

  const runSectionAction = async (section, action) => {
    setSavingBySection((prev) => ({ ...prev, [section]: true }))
    try {
      await action()
    } catch {
      setSectionStatus(section, 'error', 'Something went wrong. Please try again.')
    } finally {
      setSavingBySection((prev) => ({ ...prev, [section]: false }))
    }
  }

  const persistSettings = () => {
    const next = saveAdminSettings(settings)
    setSettings(next)
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setSettings((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleSecurityChange = (e) => {
    const { name, value } = e.target
    setSecurityForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSaveGeneral = () => {
    runSectionAction('general', () => {
      const siteName = settings.siteName.trim()
      const siteDescription = settings.siteDescription.trim()
      const contactEmail = settings.contactEmail.trim()
      const whatsappNumber = settings.whatsappNumber.trim()
      const address = settings.address.trim()

      if (siteName.length < 3) {
        setSectionStatus('general', 'error', 'Site name must be at least 3 characters.')
        return
      }

      if (!siteDescription) {
        setSectionStatus('general', 'error', 'Site description is required.')
        return
      }

      if (!emailPattern.test(contactEmail)) {
        setSectionStatus('general', 'error', 'Enter a valid contact email address.')
        return
      }

      if (whatsappNumber && !phonePattern.test(whatsappNumber)) {
        setSectionStatus('general', 'error', 'Enter a valid WhatsApp number.')
        return
      }

      if (!address) {
        setSectionStatus('general', 'error', 'Church address is required.')
        return
      }

      persistSettings()
      setSectionStatus('general', 'success', 'General settings saved.')
    })
  }

  const handleSaveApi = () => {
    runSectionAction('api', () => {
      const channelId = settings.youtubeChannelId.trim()
      if (channelId && !YOUTUBE_CHANNEL_ID_PATTERN.test(channelId)) {
        setSectionStatus('api', 'error', 'YouTube Channel ID should look like UCxxxxxxxxxxxxxxxxxxxxxx.')
        return
      }

      persistSettings()
      setSectionStatus('api', 'success', 'API settings saved.')
    })
  }

  const handleSaveNotifications = () => {
    runSectionAction('notifications', () => {
      persistSettings()
      setSectionStatus('notifications', 'success', 'Notification preferences saved.')
    })
  }

  const handleUpdatePassword = () => {
    runSectionAction('security', () => {
      const currentPassword = securityForm.currentPassword.trim()
      const newPassword = securityForm.newPassword.trim()
      const confirmPassword = securityForm.confirmPassword.trim()

      if (newPassword.length < 8) {
        setSectionStatus('security', 'error', 'New password must be at least 8 characters.')
        return
      }

      if (newPassword !== confirmPassword) {
        setSectionStatus('security', 'error', 'New password and confirmation do not match.')
        return
      }

      return changeAdminPassword({ currentPassword, newPassword })
        .then(() => {
          setSecurityForm({
            currentPassword: '',
            newPassword: '',
            confirmPassword: ''
          })
          setSectionStatus('security', 'success', 'Admin password updated successfully.')
        })
        .catch((error) => {
          setSectionStatus('security', 'error', error?.message || 'Unable to update password.')
        })
    })
  }

  const loadSecurityData = async () => {
    // Users and audit log are now managed in dedicated Admin Users and Audit Log tabs.
  }

  useEffect(() => {
    if (activeSection !== 'security') return
    void loadSecurityData()
  }, [activeSection])

  const handleToggleAdminStatus = () => {}

  const handleStartTwoFactorSetup = () => {
    runSectionAction('security', () => {
      return setupAdminTwoFactor()
        .then((result) => {
          setSecurityData((prev) => ({ ...prev, twoFactorSetup: result, twoFactorCode: '' }))
          setSectionStatus('security', 'success', '2FA secret generated. Verify with a code to enable.')
        })
        .catch((error) => {
          setSectionStatus('security', 'error', error?.message || 'Unable to start 2FA setup.')
        })
    })
  }

  const handleVerifyTwoFactor = () => {
    runSectionAction('security', () => {
      const otpCode = String(securityData.twoFactorCode || '').trim()
      if (!otpCode) {
        setSectionStatus('security', 'error', 'Enter a 6-digit authenticator code.')
        return
      }
      return verifyAdminTwoFactor({ otpCode })
        .then(() => {
          setSecurityData((prev) => ({ ...prev, twoFactorSetup: null, twoFactorCode: '' }))
          setSectionStatus('security', 'success', '2FA enabled successfully.')
        })
        .catch((error) => {
          setSectionStatus('security', 'error', error?.message || 'Invalid 2FA code.')
        })
    })
  }

  const handleDisableTwoFactor = () => {
    openModal({
      title: 'Disable 2FA',
      message: 'Enter your current 6-digit authenticator code to disable Two-Factor Authentication.',
      showInput: true,
      inputPlaceholder: '000000',
      tone: 'warning',
      confirmLabel: 'Disable Now',
      onConfirm: (otpCode) => {
        if (!otpCode) return
        runSectionAction('security', () => {
          return disableAdminTwoFactor({ otpCode })
            .then(() => {
              setSectionStatus('security', 'success', '2FA disabled.')
            })
            .catch((error) => {
              setSectionStatus('security', 'error', error?.message || 'Unable to disable 2FA.')
            })
        })
      }
    })
  }

  const handleExportBackup = () => {
    runSectionAction('database', () => {
      const snapshot = {
        exportedAt: new Date().toISOString(),
        settings: readAdminSettings(),
        adminPasswordOverrideSet: false,
        storage: {}
      }

      for (const key of EXPORT_KEYS) {
        const raw = localStorage.getItem(key)
        if (raw === null) continue
        try {
          snapshot.storage[key] = JSON.parse(raw)
        } catch {
          snapshot.storage[key] = raw
        }
      }

      const stamp = new Date().toISOString().replace(/[:.]/g, '-')
      downloadJsonFile(`upperroom-admin-backup-${stamp}.json`, snapshot)
      setSectionStatus('database', 'success', 'Backup exported successfully.')
    })
  }

  const handleClearCache = () => {
    openModal({
      title: 'Clear Cache',
      message: 'Clear non-critical browser cache for this admin workspace?',
      tone: 'warning',
      confirmLabel: 'Clear All',
      onConfirm: () => {
        runSectionAction('database', () => {
          let removed = 0
          for (const key of LOCAL_CACHE_KEYS) {
            if (localStorage.getItem(key) !== null) {
              localStorage.removeItem(key)
              removed += 1
            }
          }

          for (const key of SESSION_CACHE_KEYS) {
            if (sessionStorage.getItem(key) !== null) {
              sessionStorage.removeItem(key)
              removed += 1
            }
          }

          setSectionStatus('database', 'success', removed > 0 ? `Cleared ${removed} cached item(s).` : 'No cache items were found.')
        })
      }
    })
  }

  const renderStatus = (section) => {
    const status = statusBySection[section]
    if (!status) return null
    const isSuccess = status.tone === 'success'
    return (
      <p
        style={{
          margin: 0,
          fontSize: '0.84rem',
          color: isSuccess ? '#065f46' : '#991b1b',
          background: isSuccess ? '#ecfdf5' : '#fef2f2',
          border: `1px solid ${isSuccess ? '#bbf7d0' : '#fecaca'}`,
          borderRadius: '0.5rem',
          padding: '0.6rem 0.75rem'
        }}
      >
        {status.message}
      </p>
    )
  }

  const cardStyle = {
    background: panelBackground,
    padding: '2rem',
    borderRadius: '0.75rem',
    border: `1px solid ${panelBorder}`
  }

  const labelStyle = { fontSize: '0.875rem', fontWeight: 600, color: textLabel }
  const inputStyle = {
    padding: '0.75rem',
    border: `1px solid ${panelBorder}`,
    borderRadius: '0.5rem',
    fontSize: '1rem',
    background: inputBackground,
    color: textPrimary
  }

  const saveButtonStyle = (section, destructive = false) => ({
    padding: '0.75rem 2rem',
    background: destructive ? '#ef4444' : '#5a4494',
    color: 'white',
    border: 'none',
    borderRadius: '0.5rem',
    fontSize: '1rem',
    fontWeight: 600,
    cursor: savingBySection[section] ? 'not-allowed' : 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    width: 'fit-content',
    opacity: savingBySection[section] ? 0.7 : 1
  })

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ margin: '0 0 0.5rem', fontSize: '2rem', color: textPrimary }}>
          Settings
        </h1>
        <p style={{ margin: 0, color: textSecondary }}>
          Configure website and system settings
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '250px 1fr', gap: '1.5rem' }}>
        <div style={{ background: panelBackground, padding: '1rem', borderRadius: '0.75rem', border: `1px solid ${panelBorder}`, height: 'fit-content' }}>
          {sections.map((section) => {
            const Icon = section.icon
            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.75rem',
                  background: activeSection === section.id ? subtleSurface : 'transparent',
                  border: 'none',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  color: activeSection === section.id ? '#5a4494' : textSecondary,
                  cursor: 'pointer',
                  textAlign: 'left',
                  marginBottom: '0.25rem'
                }}
              >
                <Icon size={18} />
                {section.label}
              </button>
            )
          })}
        </div>

        <div>
          {activeSection === 'general' && (
            <div style={cardStyle}>
              <h2 style={{ margin: '0 0 1.5rem', fontSize: '1.5rem', color: textPrimary }}>General Settings</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <span style={labelStyle}>Site Name</span>
                  <input type="text" name="siteName" value={settings.siteName} onChange={handleChange} style={inputStyle} />
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <span style={labelStyle}>Site Description</span>
                  <textarea name="siteDescription" value={settings.siteDescription} onChange={handleChange} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
                </label>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <span style={labelStyle}>Contact Email</span>
                    <input type="email" name="contactEmail" value={settings.contactEmail} onChange={handleChange} style={inputStyle} />
                  </label>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <span style={labelStyle}>WhatsApp Number</span>
                    <input type="tel" name="whatsappNumber" value={settings.whatsappNumber} onChange={handleChange} style={inputStyle} />
                  </label>
                </div>

                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <span style={labelStyle}>Church Address</span>
                  <input type="text" name="address" value={settings.address} onChange={handleChange} style={inputStyle} />
                </label>

                <button onClick={handleSaveGeneral} disabled={Boolean(savingBySection.general)} style={saveButtonStyle('general')}>
                  <Save size={18} />
                  {savingBySection.general ? 'Saving...' : 'Save Changes'}
                </button>
                {renderStatus('general')}
              </div>
            </div>
          )}

          {activeSection === 'api' && (
            <div style={cardStyle}>
              <h2 style={{ margin: '0 0 1.5rem', fontSize: '1.5rem', color: textPrimary }}>API Keys</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <span style={labelStyle}>YouTube API Key</span>
                  <input type="password" name="youtubeApiKey" value={settings.youtubeApiKey} onChange={handleChange} placeholder="Enter YouTube Data API v3 key" style={inputStyle} />
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <span style={labelStyle}>YouTube Channel ID</span>
                  <input type="text" name="youtubeChannelId" value={settings.youtubeChannelId} onChange={handleChange} placeholder="UC..." style={inputStyle} />
                </label>

                <p style={{ margin: 0, fontSize: '0.75rem', color: textSecondary }}>
                  Saved locally for this browser admin workspace. Production API credentials should still be managed in environment variables.
                </p>

                <button onClick={handleSaveApi} disabled={Boolean(savingBySection.api)} style={saveButtonStyle('api')}>
                  <Save size={18} />
                  {savingBySection.api ? 'Saving...' : 'Save API Keys'}
                </button>
                {renderStatus('api')}
              </div>
            </div>
          )}

          {activeSection === 'notifications' && (
            <div style={cardStyle}>
              <h2 style={{ margin: '0 0 1.5rem', fontSize: '1.5rem', color: textPrimary }}>Notification Settings</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', padding: '1rem', background: subtleSurface, borderRadius: '0.5rem' }}>
                  <input type="checkbox" name="enableScheduler" checked={settings.enableScheduler} onChange={handleChange} style={{ width: '20px', height: '20px', cursor: 'pointer' }} />
                  <div>
                    <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600, color: textPrimary }}>Enable WhatsApp Scheduler</p>
                    <p style={{ margin: '0.2rem 0 0', fontSize: '0.75rem', color: textSecondary }}>Save ministry preference for reminder scheduling.</p>
                  </div>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', padding: '1rem', background: subtleSurface, borderRadius: '0.5rem' }}>
                  <input type="checkbox" name="enableNotifications" checked={settings.enableNotifications} onChange={handleChange} style={{ width: '20px', height: '20px', cursor: 'pointer' }} />
                  <div>
                    <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600, color: textPrimary }}>Admin Notifications</p>
                    <p style={{ margin: '0.2rem 0 0', fontSize: '0.75rem', color: textSecondary }}>Enable dashboard-side notifications preference.</p>
                  </div>
                </label>

                <button onClick={handleSaveNotifications} disabled={Boolean(savingBySection.notifications)} style={saveButtonStyle('notifications')}>
                  <Save size={18} />
                  {savingBySection.notifications ? 'Saving...' : 'Save Settings'}
                </button>
                {renderStatus('notifications')}
              </div>
            </div>
          )}

          {activeSection === 'security' && (
            <div style={cardStyle}>
              <h2 style={{ margin: '0 0 1.5rem', fontSize: '1.5rem', color: textPrimary }}>Security Settings</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ padding: '0.9rem', border: `1px solid ${panelBorder}`, borderRadius: '0.6rem', background: subtleSurface }}>
                  <p style={{ margin: 0, color: textPrimary, fontWeight: 700 }}>
                    Signed in as {currentUser?.name || 'Admin'} ({currentUser?.role || 'unknown'})
                  </p>
                  <p style={{ margin: '0.3rem 0 0', color: textSecondary, fontSize: '0.8rem' }}>
                    RBAC now enforces role-based access across protected admin APIs.
                  </p>
                </div>

                <div style={{ display: 'grid', gap: '0.75rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1rem', color: textPrimary }}>Change Password</h3>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <span style={labelStyle}>Current Password</span>
                    <input type="password" name="currentPassword" value={securityForm.currentPassword} onChange={handleSecurityChange} style={inputStyle} />
                  </label>

                  <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <span style={labelStyle}>New Password</span>
                    <input type="password" name="newPassword" value={securityForm.newPassword} onChange={handleSecurityChange} style={inputStyle} />
                  </label>

                  <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <span style={labelStyle}>Confirm New Password</span>
                    <input type="password" name="confirmPassword" value={securityForm.confirmPassword} onChange={handleSecurityChange} style={inputStyle} />
                  </label>

                  <button onClick={handleUpdatePassword} disabled={Boolean(savingBySection.security)} style={saveButtonStyle('security', true)}>
                    <Shield size={18} />
                    {savingBySection.security ? 'Updating...' : 'Update Password'}
                  </button>
                </div>

                <div style={{ display: 'grid', gap: '0.75rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1rem', color: textPrimary }}>Two-Factor Authentication (2FA)</h3>
                  <p style={{ margin: 0, color: textSecondary, fontSize: '0.8rem' }}>
                    Add authenticator-based second factor for admin sign-in.
                  </p>
                  <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={handleStartTwoFactorSetup}
                      style={{ ...saveButtonStyle('security'), background: '#2d3a7a' }}
                    >
                      Start 2FA Setup
                    </button>
                    {currentUser?.twoFactorEnabled ? (
                      <button
                        type="button"
                        onClick={handleDisableTwoFactor}
                        style={{ ...saveButtonStyle('security', true), background: '#dc2626' }}
                      >
                        Disable 2FA
                      </button>
                    ) : null}
                  </div>
                  {securityData.twoFactorSetup?.secret ? (
                    <div style={{ padding: '0.8rem', borderRadius: '0.5rem', background: '#f9fafb', border: '1px solid #d1d5db' }}>
                      <p style={{ margin: 0, fontSize: '0.78rem', color: '#374151' }}>
                        Secret: <code>{securityData.twoFactorSetup.secret}</code>
                      </p>
                      <p style={{ margin: '0.35rem 0', fontSize: '0.78rem', color: '#374151', wordBreak: 'break-all' }}>
                        otpauth URL: <code>{securityData.twoFactorSetup.otpauthUrl}</code>
                      </p>
                      <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.5rem' }}>
                        <input
                          type="text"
                          value={securityData.twoFactorCode}
                          onChange={(event) => setSecurityData((prev) => ({ ...prev, twoFactorCode: event.target.value }))}
                          placeholder="6-digit code"
                          style={{ ...inputStyle, maxWidth: '220px' }}
                        />
                        <button type="button" onClick={handleVerifyTwoFactor} style={saveButtonStyle('security')}>
                          Verify 2FA
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>

                {hasPermission('admin:users:manage') ? (
                  <div style={{ display: 'grid', gap: '0.75rem' }}>
                    <div style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '1rem 1.25rem', borderRadius: '0.625rem',
                      background: darkMode ? '#1e2d44' : '#f0f4ff',
                      border: `1px solid ${darkMode ? '#2a3a5a' : '#c7d7f9'}`
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <UserCog size={20} style={{ color: '#5a4494', flexShrink: 0 }} />
                        <div>
                          <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem', color: textPrimary }}>Admin Users</p>
                          <p style={{ margin: '0.15rem 0 0', fontSize: '0.78rem', color: textSecondary }}>
                            Manage accounts, roles, and access permissions
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onNavigate('adminUsers')}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                          padding: '0.5rem 0.9rem', borderRadius: '0.45rem',
                          background: '#5a4494', color: '#fff', border: 'none',
                          fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap'
                        }}
                      >
                        Open <ArrowRight size={13} />
                      </button>
                    </div>
                  </div>
                ) : null}

                {hasPermission('audit:read') ? (
                  <div style={{ display: 'grid', gap: '0.75rem' }}>
                    <div style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '1rem 1.25rem', borderRadius: '0.625rem',
                      background: darkMode ? '#0e2720' : '#f0fdf4',
                      border: `1px solid ${darkMode ? '#1a4535' : '#bbf7d0'}`
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <ScrollText size={20} style={{ color: '#16a34a', flexShrink: 0 }} />
                        <div>
                          <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem', color: textPrimary }}>Audit Log</p>
                          <p style={{ margin: '0.15rem 0 0', fontSize: '0.78rem', color: textSecondary }}>
                            Full history of all admin actions — filterable and exportable
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onNavigate('auditLog')}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                          padding: '0.5rem 0.9rem', borderRadius: '0.45rem',
                          background: '#16a34a', color: '#fff', border: 'none',
                          fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap'
                        }}
                      >
                        Open <ArrowRight size={13} />
                      </button>
                    </div>
                  </div>
                ) : null}


                {renderStatus('security')}
              </div>
            </div>
          )}

          {activeSection === 'database' && (
            <div style={cardStyle}>
              <h2 style={{ margin: '0 0 1.5rem', fontSize: '1.5rem', color: textPrimary }}>Database Management</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ padding: '1rem', background: '#fef3c7', border: '1px solid #f59e0b', borderRadius: '0.5rem' }}>
                  <p style={{ margin: 0, fontSize: '0.875rem', color: '#92400e' }}>
                    <strong>Warning:</strong> Backup before clearing anything. These tools operate on browser-stored admin data.
                  </p>
                </div>

                <button
                  onClick={handleExportBackup}
                  disabled={Boolean(savingBySection.database)}
                  style={{
                    ...saveButtonStyle('database'),
                    background: '#10b981'
                  }}
                >
                  <Database size={18} />
                  {savingBySection.database ? 'Working...' : 'Export Admin Backup'}
                </button>

                <button
                  onClick={handleClearCache}
                  disabled={Boolean(savingBySection.database)}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: '#6b7280',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    cursor: savingBySection.database ? 'not-allowed' : 'pointer',
                    width: 'fit-content',
                    opacity: savingBySection.database ? 0.7 : 1
                  }}
                >
                  Clear Cache
                </button>

                {renderStatus('database')}
              </div>
            </div>
          )}

          {!sectionMap[activeSection] ? (
            <div style={cardStyle}>
              <p style={{ margin: 0, color: textSecondary }}>Select a settings section.</p>
            </div>
          ) : null}
        </div>
      </div>

      <AdminModal
        isOpen={modalConfig.isOpen}
        onClose={closeModal}
        title={modalConfig.title}
        tone={modalConfig.tone}
        onConfirm={handleModalConfirm}
        showInput={modalConfig.showInput}
        inputValue={modalConfig.inputValue}
        onInputChange={(val) => setModalConfig(prev => ({ ...prev, inputValue: val }))}
        inputPlaceholder={modalConfig.inputPlaceholder}
        confirmLabel={modalConfig.confirmLabel}
        cancelLabel={modalConfig.cancelLabel}
      >
        <p style={{ margin: 0 }}>{modalConfig.message}</p>
      </AdminModal>
    </div>
  )
}

export default Settings
