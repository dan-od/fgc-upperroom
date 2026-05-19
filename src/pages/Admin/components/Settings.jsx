import { useEffect, useMemo, useState } from 'react'
import { Bell, Database, Globe, Key, Shield } from 'lucide-react'

import { useAdminTheme } from '../AdminThemeContext'
import AdminModal from './AdminModal'
import SettingsGeneral from './SettingsGeneral'
import SettingsApi from './SettingsApi'
import SettingsNotifications from './SettingsNotifications'
import SettingsDatabase from './SettingsDatabase'
import SettingsSecurity from './SettingsSecurity'
import { readAdminSettings, saveAdminSettings } from '../../../utils/adminSettings'
import { changeAdminPassword, disableAdminTwoFactor, setupAdminTwoFactor, verifyAdminTwoFactor } from '../../../utils/adminApi'
import {
  SECTIONS, EXPORT_KEYS, LOCAL_CACHE_KEYS, SESSION_CACHE_KEYS,
  YOUTUBE_CHANNEL_ID_PATTERN, emailPattern, phonePattern,
  downloadJsonFile, buildUiTokens
} from './settingsHelpers'

const SECTION_ICONS = { general: Globe, api: Key, notifications: Bell, database: Database, security: Shield }

export default function Settings({ currentUser = null, hasPermission = () => false, initialSection = 'general', onNavigate = () => {} }) {
  const { darkMode } = useAdminTheme()

  const [activeSection, setActiveSection] = useState(initialSection)
  const [settings, setSettings] = useState(() => readAdminSettings())
  const [securityForm, setSecurityForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [securityData, setSecurityData] = useState({ twoFactorSetup: null, twoFactorCode: '' })
  const [savingBySection, setSavingBySection] = useState({})
  const [statusBySection, setStatusBySection] = useState({})
  const [modalConfig, setModalConfig] = useState({
    isOpen: false, title: '', message: '', tone: 'info',
    onConfirm: null, showInput: false, inputValue: '', inputPlaceholder: '', confirmLabel: 'Confirm', cancelLabel: 'Cancel'
  })

  const sectionMap = useMemo(() => Object.fromEntries(SECTIONS.map((s) => [s.id, s])), [])

  useEffect(() => { if (sectionMap[initialSection]) setActiveSection(initialSection) }, [initialSection, sectionMap])
  useEffect(() => { /* Users/audit log managed in dedicated tabs */ }, [activeSection])

  const tokens = buildUiTokens(darkMode, savingBySection)
  const { panelBackground, panelBorder, textPrimary, textSecondary, subtleSurface, cardStyle } = tokens

  const canManageSettings = hasPermission('admin:settings:manage')
  if (!canManageSettings) {
    return (
      <div style={{ padding: '2rem', background: panelBackground, border: `1px solid ${panelBorder}`, borderRadius: '1rem', textAlign: 'center' }}>
        <div style={{ padding: '1rem', background: '#fef2f2', color: '#991b1b', borderRadius: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <Shield size={24} />
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>Access Denied</h2>
        </div>
        <p style={{ margin: 0, color: textSecondary, fontSize: '0.95rem' }}>
          You do not have permission to view or manage admin settings.
          Please contact a Super Admin if you believe this is an error.
        </p>
      </div>
    )
  }

  const closeModal = () => setModalConfig((p) => ({ ...p, isOpen: false }))
  const openModal = (cfg) => setModalConfig({ isOpen: true, title: cfg.title || 'Are you sure?', message: cfg.message || '', tone: cfg.tone || 'info', onConfirm: cfg.onConfirm || null, showInput: !!cfg.showInput, inputValue: cfg.initialValue || '', inputPlaceholder: cfg.inputPlaceholder || '', confirmLabel: cfg.confirmLabel || 'Confirm', cancelLabel: cfg.cancelLabel || 'Cancel' })
  const handleModalConfirm = () => { if (modalConfig.onConfirm) modalConfig.onConfirm(modalConfig.inputValue); closeModal() }

  const setSectionStatus = (section, tone, message) => setStatusBySection((p) => ({ ...p, [section]: { tone, message } }))
  const runSectionAction = async (section, action) => {
    setSavingBySection((p) => ({ ...p, [section]: true }))
    try { await action() } catch { setSectionStatus(section, 'error', 'Something went wrong. Please try again.') }
    finally { setSavingBySection((p) => ({ ...p, [section]: false })) }
  }
  const persistSettings = () => setSettings(saveAdminSettings(settings))
  const handleChange = (e) => { const { name, value, type, checked } = e.target; setSettings((p) => ({ ...p, [name]: type === 'checkbox' ? checked : value })) }

  const handleSaveGeneral = () => runSectionAction('general', () => {
    const { siteName, siteDescription, contactEmail, whatsappNumber, address } = { siteName: settings.siteName.trim(), siteDescription: settings.siteDescription.trim(), contactEmail: settings.contactEmail.trim(), whatsappNumber: settings.whatsappNumber.trim(), address: settings.address.trim() }
    if (siteName.length < 3) return setSectionStatus('general', 'error', 'Site name must be at least 3 characters.')
    if (!siteDescription) return setSectionStatus('general', 'error', 'Site description is required.')
    if (!emailPattern.test(contactEmail)) return setSectionStatus('general', 'error', 'Enter a valid contact email address.')
    if (whatsappNumber && !phonePattern.test(whatsappNumber)) return setSectionStatus('general', 'error', 'Enter a valid WhatsApp number.')
    if (!address) return setSectionStatus('general', 'error', 'Church address is required.')
    persistSettings(); setSectionStatus('general', 'success', 'General settings saved.')
  })

  const handleSaveApi = () => runSectionAction('api', () => {
    const channelId = settings.youtubeChannelId.trim()
    if (channelId && !YOUTUBE_CHANNEL_ID_PATTERN.test(channelId)) return setSectionStatus('api', 'error', 'YouTube Channel ID should look like UCxxxxxxxxxxxxxxxxxxxxxx.')
    persistSettings(); setSectionStatus('api', 'success', 'API settings saved.')
  })

  const handleSaveNotifications = () => runSectionAction('notifications', () => { persistSettings(); setSectionStatus('notifications', 'success', 'Notification preferences saved.') })

  const handleUpdatePassword = () => runSectionAction('security', () => {
    const { currentPassword, newPassword, confirmPassword } = securityForm
    if (newPassword.trim().length < 8) return setSectionStatus('security', 'error', 'New password must be at least 8 characters.')
    if (newPassword.trim() !== confirmPassword.trim()) return setSectionStatus('security', 'error', 'New password and confirmation do not match.')
    return changeAdminPassword({ currentPassword: currentPassword.trim(), newPassword: newPassword.trim() })
      .then(() => { setSecurityForm({ currentPassword: '', newPassword: '', confirmPassword: '' }); setSectionStatus('security', 'success', 'Admin password updated successfully.') })
      .catch((err) => setSectionStatus('security', 'error', err?.message || 'Unable to update password.'))
  })

  const handleStartTwoFactorSetup = () => runSectionAction('security', () =>
    setupAdminTwoFactor()
      .then((r) => { setSecurityData((p) => ({ ...p, twoFactorSetup: r, twoFactorCode: '' })); setSectionStatus('security', 'success', '2FA secret generated. Verify with a code to enable.') })
      .catch((err) => setSectionStatus('security', 'error', err?.message || 'Unable to start 2FA setup.'))
  )

  const handleVerifyTwoFactor = () => runSectionAction('security', () => {
    const otpCode = String(securityData.twoFactorCode || '').trim()
    if (!otpCode) return setSectionStatus('security', 'error', 'Enter a 6-digit authenticator code.')
    return verifyAdminTwoFactor({ otpCode })
      .then(() => { setSecurityData((p) => ({ ...p, twoFactorSetup: null, twoFactorCode: '' })); setSectionStatus('security', 'success', '2FA enabled successfully.') })
      .catch((err) => setSectionStatus('security', 'error', err?.message || 'Invalid 2FA code.'))
  })

  const handleDisableTwoFactor = () => openModal({ title: 'Disable 2FA', message: 'Enter your current 6-digit authenticator code to disable Two-Factor Authentication.', showInput: true, inputPlaceholder: '000000', tone: 'warning', confirmLabel: 'Disable Now', onConfirm: (otpCode) => { if (!otpCode) return; runSectionAction('security', () => disableAdminTwoFactor({ otpCode }).then(() => setSectionStatus('security', 'success', '2FA disabled.')).catch((err) => setSectionStatus('security', 'error', err?.message || 'Unable to disable 2FA.'))) } })

  const handleExportBackup = () => runSectionAction('database', () => {
    const snapshot = { exportedAt: new Date().toISOString(), settings: readAdminSettings(), adminPasswordOverrideSet: false, storage: {} }
    for (const key of EXPORT_KEYS) { const raw = localStorage.getItem(key); if (raw === null) continue; try { snapshot.storage[key] = JSON.parse(raw) } catch { snapshot.storage[key] = raw } }
    downloadJsonFile(`upperroom-admin-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`, snapshot)
    setSectionStatus('database', 'success', 'Backup exported successfully.')
  })

  const handleClearCache = () => openModal({ title: 'Clear Cache', message: 'Clear non-critical browser cache for this admin workspace?', tone: 'warning', confirmLabel: 'Clear All', onConfirm: () => runSectionAction('database', () => { let removed = 0; for (const key of LOCAL_CACHE_KEYS) { if (localStorage.getItem(key) !== null) { localStorage.removeItem(key); removed++ } } for (const key of SESSION_CACHE_KEYS) { if (sessionStorage.getItem(key) !== null) { sessionStorage.removeItem(key); removed++ } } setSectionStatus('database', 'success', removed > 0 ? `Cleared ${removed} cached item(s).` : 'No cache items were found.') }) })

  const renderStatus = (section) => {
    const s = statusBySection[section]; if (!s) return null
    const ok = s.tone === 'success'
    return <p style={{ margin: 0, fontSize: '0.84rem', color: ok ? '#065f46' : '#991b1b', background: ok ? '#ecfdf5' : '#fef2f2', border: `1px solid ${ok ? '#bbf7d0' : '#fecaca'}`, borderRadius: '0.5rem', padding: '0.6rem 0.75rem' }}>{s.message}</p>
  }

  const ui = { ...tokens, renderStatus, savingBySection }
  const securityHandlers = { currentUser, hasPermission, onNavigate, securityForm, onSecurityChange: (e) => setSecurityForm((p) => ({ ...p, [e.target.name]: e.target.value })), securityData, onSetSecurityData: setSecurityData, onUpdatePassword: handleUpdatePassword, onStartTwoFactorSetup: handleStartTwoFactorSetup, onVerifyTwoFactor: handleVerifyTwoFactor, onDisableTwoFactor: handleDisableTwoFactor }

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ margin: '0 0 0.5rem', fontSize: '2rem', color: textPrimary }}>Settings</h1>
        <p style={{ margin: 0, color: textSecondary }}>Configure website and system settings</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '250px 1fr', gap: '1.5rem' }}>
        <div style={{ background: panelBackground, padding: '1rem', borderRadius: '0.75rem', border: `1px solid ${panelBorder}`, height: 'fit-content' }}>
          {SECTIONS.map((section) => {
            const Icon = SECTION_ICONS[section.id]
            return (
              <button key={section.id} onClick={() => setActiveSection(section.id)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', background: activeSection === section.id ? subtleSurface : 'transparent', border: 'none', borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: 500, color: activeSection === section.id ? '#5a4494' : textSecondary, cursor: 'pointer', textAlign: 'left', marginBottom: '0.25rem' }}>
                <Icon size={18} />{section.label}
              </button>
            )
          })}
        </div>
        <div>
          {activeSection === 'general' && <SettingsGeneral data={settings} onChange={handleChange} onSave={handleSaveGeneral} status={statusBySection.general} darkMode={darkMode} ui={ui} />}
          {activeSection === 'api' && <SettingsApi data={settings} onChange={handleChange} onSave={handleSaveApi} status={statusBySection.api} darkMode={darkMode} ui={ui} />}
          {activeSection === 'notifications' && <SettingsNotifications data={settings} onChange={handleChange} onSave={handleSaveNotifications} status={statusBySection.notifications} darkMode={darkMode} ui={ui} />}
          {activeSection === 'database' && <SettingsDatabase onExport={handleExportBackup} onClearCache={handleClearCache} status={statusBySection.database} darkMode={darkMode} ui={ui} />}
          {activeSection === 'security' && <SettingsSecurity data={settings} onChange={handleChange} handlers={securityHandlers} status={statusBySection.security} darkMode={darkMode} ui={ui} />}
          {!sectionMap[activeSection] ? <div style={cardStyle}><p style={{ margin: 0, color: textSecondary }}>Select a settings section.</p></div> : null}
        </div>
      </div>
      <AdminModal isOpen={modalConfig.isOpen} onClose={closeModal} title={modalConfig.title} tone={modalConfig.tone} onConfirm={handleModalConfirm} showInput={modalConfig.showInput} inputValue={modalConfig.inputValue} onInputChange={(val) => setModalConfig((p) => ({ ...p, inputValue: val }))} inputPlaceholder={modalConfig.inputPlaceholder} confirmLabel={modalConfig.confirmLabel} cancelLabel={modalConfig.cancelLabel}>
        <p style={{ margin: 0 }}>{modalConfig.message}</p>
      </AdminModal>
    </div>
  )
}
