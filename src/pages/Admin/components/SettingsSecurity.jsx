import { ArrowRight, ScrollText, Shield, UserCog } from 'lucide-react'

export default function SettingsSecurity({ data, onChange, handlers, status, darkMode, ui }) {
  const {
    cardStyle, labelStyle, inputStyle, saveButtonStyle, renderStatus,
    savingBySection, textPrimary, textSecondary, subtleSurface, panelBorder
  } = ui

  const {
    currentUser,
    hasPermission,
    onNavigate,
    securityForm,
    onSecurityChange,
    securityData,
    onSetSecurityData,
    onUpdatePassword,
    onStartTwoFactorSetup,
    onVerifyTwoFactor,
    onDisableTwoFactor
  } = handlers

  return (
    <div style={cardStyle}>
      <h2 style={{ margin: '0 0 1.5rem', fontSize: '1.5rem', color: darkMode ? '#e2e8f0' : '#111827' }}>
        Security Settings
      </h2>
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
            <input type="password" name="currentPassword" value={securityForm.currentPassword} onChange={onSecurityChange} style={inputStyle} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <span style={labelStyle}>New Password</span>
            <input type="password" name="newPassword" value={securityForm.newPassword} onChange={onSecurityChange} style={inputStyle} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <span style={labelStyle}>Confirm New Password</span>
            <input type="password" name="confirmPassword" value={securityForm.confirmPassword} onChange={onSecurityChange} style={inputStyle} />
          </label>
          <button onClick={onUpdatePassword} disabled={Boolean(savingBySection.security)} style={saveButtonStyle('security', true)}>
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
            <button type="button" onClick={onStartTwoFactorSetup} style={{ ...saveButtonStyle('security'), background: '#2d3a7a' }}>
              Start 2FA Setup
            </button>
            {currentUser?.twoFactorEnabled ? (
              <button type="button" onClick={onDisableTwoFactor} style={{ ...saveButtonStyle('security', true), background: '#dc2626' }}>
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
                  onChange={(e) => onSetSecurityData((prev) => ({ ...prev, twoFactorCode: e.target.value }))}
                  placeholder="6-digit code"
                  style={{ ...inputStyle, maxWidth: '220px' }}
                />
                <button type="button" onClick={onVerifyTwoFactor} style={saveButtonStyle('security')}>
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
  )
}
