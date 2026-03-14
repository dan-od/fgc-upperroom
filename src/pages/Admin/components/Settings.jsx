import { useState } from 'react'
import { Save, Key, Bell, Globe, Database, Shield } from 'lucide-react'

const Settings = () => {
  const [activeSection, setActiveSection] = useState('general')
  const [settings, setSettings] = useState({
    siteName: 'FGC Upper Room Mgbuoba',
    siteDescription: 'Youth Fellowship of Foursquare Gospel Church',
    contactEmail: 'info@fgcupperroom.org',
    whatsappNumber: '+234801234567',
    address: 'Mgbuoba, Port Harcourt',
    youtubeApiKey: '',
    youtubeChannelId: '',
    enableScheduler: false,
    enableNotifications: true,
    adminPassword: '',
    newPassword: '',
    confirmPassword: ''
  })

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleSave = (section) => {
    console.log('Saving settings for:', section, settings)
    alert(`${section} settings saved successfully!`)
  }

  const sections = [
    { id: 'general', label: 'General', icon: Globe },
    { id: 'api', label: 'API Keys', icon: Key },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'database', label: 'Database', icon: Database },
    { id: 'security', label: 'Security', icon: Shield }
  ]

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ margin: '0 0 0.5rem', fontSize: '2rem', color: '#111827' }}>
          Settings
        </h1>
        <p style={{ margin: 0, color: '#6b7280' }}>
          Configure website and system settings
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '250px 1fr', gap: '1.5rem' }}>
        {/* Sidebar */}
        <div style={{
          background: 'white',
          padding: '1rem',
          borderRadius: '0.75rem',
          border: '1px solid #e5e7eb',
          height: 'fit-content'
        }}>
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
                  background: activeSection === section.id ? '#f3f4f6' : 'transparent',
                  border: 'none',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  color: activeSection === section.id ? '#5a4494' : '#6b7280',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
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

        {/* Content */}
        <div>
          {activeSection === 'general' && (
            <div style={{
              background: 'white',
              padding: '2rem',
              borderRadius: '0.75rem',
              border: '1px solid #e5e7eb'
            }}>
              <h2 style={{ margin: '0 0 1.5rem', fontSize: '1.5rem', color: '#111827' }}>
                General Settings
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>
                    Site Name
                  </label>
                  <input
                    type="text"
                    name="siteName"
                    value={settings.siteName}
                    onChange={handleChange}
                    style={{
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.5rem',
                      fontSize: '1rem'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>
                    Site Description
                  </label>
                  <textarea
                    name="siteDescription"
                    value={settings.siteDescription}
                    onChange={handleChange}
                    rows={3}
                    style={{
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.5rem',
                      fontSize: '1rem',
                      resize: 'vertical'
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>
                      Contact Email
                    </label>
                    <input
                      type="email"
                      name="contactEmail"
                      value={settings.contactEmail}
                      onChange={handleChange}
                      style={{
                        padding: '0.75rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.5rem',
                        fontSize: '1rem'
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>
                      WhatsApp Number
                    </label>
                    <input
                      type="tel"
                      name="whatsappNumber"
                      value={settings.whatsappNumber}
                      onChange={handleChange}
                      style={{
                        padding: '0.75rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.5rem',
                        fontSize: '1rem'
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>
                    Church Address
                  </label>
                  <input
                    type="text"
                    name="address"
                    value={settings.address}
                    onChange={handleChange}
                    style={{
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.5rem',
                      fontSize: '1rem'
                    }}
                  />
                </div>

                <button
                  onClick={() => handleSave('general')}
                  style={{
                    padding: '0.75rem 2rem',
                    background: '#5a4494',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.5rem',
                    fontSize: '1rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    width: 'fit-content'
                  }}
                >
                  <Save size={18} />
                  Save Changes
                </button>
              </div>
            </div>
          )}

          {activeSection === 'api' && (
            <div style={{
              background: 'white',
              padding: '2rem',
              borderRadius: '0.75rem',
              border: '1px solid #e5e7eb'
            }}>
              <h2 style={{ margin: '0 0 1.5rem', fontSize: '1.5rem', color: '#111827' }}>
                API Keys
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>
                    YouTube API Key
                  </label>
                  <input
                    type="password"
                    name="youtubeApiKey"
                    value={settings.youtubeApiKey}
                    onChange={handleChange}
                    placeholder="Enter YouTube Data API v3 key"
                    style={{
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.5rem',
                      fontSize: '1rem'
                    }}
                  />
                  <p style={{ margin: '0.5rem 0 0', fontSize: '0.75rem', color: '#6b7280' }}>
                    Get your API key from Google Cloud Console
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>
                    YouTube Channel ID
                  </label>
                  <input
                    type="text"
                    name="youtubeChannelId"
                    value={settings.youtubeChannelId}
                    onChange={handleChange}
                    placeholder="UC..."
                    style={{
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.5rem',
                      fontSize: '1rem'
                    }}
                  />
                </div>

                <button
                  onClick={() => handleSave('api')}
                  style={{
                    padding: '0.75rem 2rem',
                    background: '#5a4494',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.5rem',
                    fontSize: '1rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    width: 'fit-content'
                  }}
                >
                  <Save size={18} />
                  Save API Keys
                </button>
              </div>
            </div>
          )}

          {activeSection === 'notifications' && (
            <div style={{
              background: 'white',
              padding: '2rem',
              borderRadius: '0.75rem',
              border: '1px solid #e5e7eb'
            }}>
              <h2 style={{ margin: '0 0 1.5rem', fontSize: '1.5rem', color: '#111827' }}>
                Notification Settings
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: '#f9fafb', borderRadius: '0.5rem' }}>
                  <input
                    type="checkbox"
                    id="enableScheduler"
                    name="enableScheduler"
                    checked={settings.enableScheduler}
                    onChange={handleChange}
                    style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                  />
                  <div>
                    <label htmlFor="enableScheduler" style={{ fontSize: '0.875rem', fontWeight: 600, color: '#111827', cursor: 'pointer', display: 'block' }}>
                      Enable WhatsApp Scheduler
                    </label>
                    <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: '#6b7280' }}>
                      Send automated service and event reminders
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: '#f9fafb', borderRadius: '0.5rem' }}>
                  <input
                    type="checkbox"
                    id="enableNotifications"
                    name="enableNotifications"
                    checked={settings.enableNotifications}
                    onChange={handleChange}
                    style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                  />
                  <div>
                    <label htmlFor="enableNotifications" style={{ fontSize: '0.875rem', fontWeight: 600, color: '#111827', cursor: 'pointer', display: 'block' }}>
                      Admin Notifications
                    </label>
                    <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: '#6b7280' }}>
                      Receive alerts for new submissions and errors
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => handleSave('notifications')}
                  style={{
                    padding: '0.75rem 2rem',
                    background: '#5a4494',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.5rem',
                    fontSize: '1rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    width: 'fit-content'
                  }}
                >
                  <Save size={18} />
                  Save Settings
                </button>
              </div>
            </div>
          )}

          {activeSection === 'security' && (
            <div style={{
              background: 'white',
              padding: '2rem',
              borderRadius: '0.75rem',
              border: '1px solid #e5e7eb'
            }}>
              <h2 style={{ margin: '0 0 1.5rem', fontSize: '1.5rem', color: '#111827' }}>
                Security Settings
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>
                    Current Password
                  </label>
                  <input
                    type="password"
                    name="adminPassword"
                    value={settings.adminPassword}
                    onChange={handleChange}
                    style={{
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.5rem',
                      fontSize: '1rem'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>
                    New Password
                  </label>
                  <input
                    type="password"
                    name="newPassword"
                    value={settings.newPassword}
                    onChange={handleChange}
                    style={{
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.5rem',
                      fontSize: '1rem'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={settings.confirmPassword}
                    onChange={handleChange}
                    style={{
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.5rem',
                      fontSize: '1rem'
                    }}
                  />
                </div>

                <button
                  onClick={() => handleSave('security')}
                  style={{
                    padding: '0.75rem 2rem',
                    background: '#ef4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.5rem',
                    fontSize: '1rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    width: 'fit-content'
                  }}
                >
                  <Shield size={18} />
                  Update Password
                </button>
              </div>
            </div>
          )}

          {activeSection === 'database' && (
            <div style={{
              background: 'white',
              padding: '2rem',
              borderRadius: '0.75rem',
              border: '1px solid #e5e7eb'
            }}>
              <h2 style={{ margin: '0 0 1.5rem', fontSize: '1.5rem', color: '#111827' }}>
                Database Management
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ padding: '1rem', background: '#fef3c7', border: '1px solid #f59e0b', borderRadius: '0.5rem' }}>
                  <p style={{ margin: 0, fontSize: '0.875rem', color: '#92400e' }}>
                    <strong>Warning:</strong> Database operations can result in data loss. Always backup before proceeding.
                  </p>
                </div>

                <button
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    width: 'fit-content'
                  }}
                >
                  <Database size={18} style={{ display: 'inline', marginRight: '0.5rem' }} />
                  Export Database Backup
                </button>

                <button
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: '#6b7280',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    width: 'fit-content'
                  }}
                >
                  Clear Cache
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Settings
