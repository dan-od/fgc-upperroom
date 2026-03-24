import { useMemo, useState, useEffect, lazy, Suspense, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BarChart3,
  Bell,
  Calendar,
  FileText,
  Heart,
  Image,
  LayoutDashboard,
  Lock,
  LogOut,
  QrCode,
  Settings as SettingsIcon,
  Users
} from 'lucide-react'
import { Moon, Sun } from 'lucide-react'
import Login from './components/Login'
import Dashboard from './components/Dashboard'
const loadEventManager = () => import('./components/EventManager')
const loadMediaManager = () => import('./components/MediaManager')
const loadBlogManager = () => import('./components/BlogManager')
const loadTestimonyManager = () => import('./components/TestimonyManager')
const loadVisitorManager = () => import('./components/VisitorManager')
const loadAttendanceManager = () => import('./components/AttendanceManager')
const loadAnalytics = () => import('./components/Analytics')
const loadSettings = () => import('./components/Settings')

const EventManager = lazy(loadEventManager)
const MediaManager = lazy(loadMediaManager)
const BlogManager = lazy(loadBlogManager)
const TestimonyManager = lazy(loadTestimonyManager)
const VisitorManager = lazy(loadVisitorManager)
const AttendanceManager = lazy(loadAttendanceManager)
const Analytics = lazy(loadAnalytics)
const Settings = lazy(loadSettings)
import './Admin.css'
import { AdminThemeContext } from './AdminThemeContext'
import { ADMIN_SETTINGS_STORAGE_KEY, ADMIN_SETTINGS_UPDATED_EVENT, readAdminSettings } from '../../utils/adminSettings'
import {
  bootstrapAdminSession,
  canAdmin,
  confirmAdminPasswordReset,
  loginAdminWithFallback,
  logoutAdmin,
  requestAdminPasswordReset
} from '../../utils/adminApi'

const NOTIFICATION_LEVEL_PRIORITY = { error: 0, warning: 1, info: 2, success: 3 }

const formatRelativeTime = (isoString) => {
  if (!isoString) return 'just now'
  const deltaMs = Date.now() - new Date(isoString).getTime()
  const deltaSec = Math.max(1, Math.floor(deltaMs / 1000))
  if (deltaSec < 60) return `${deltaSec}s ago`
  const deltaMin = Math.floor(deltaSec / 60)
  if (deltaMin < 60) return `${deltaMin}m ago`
  const deltaHour = Math.floor(deltaMin / 60)
  if (deltaHour < 24) return `${deltaHour}h ago`
  const deltaDay = Math.floor(deltaHour / 24)
  return `${deltaDay}d ago`
}

const readArrayCount = (key) => {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return 0
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.length : 0
  } catch {
    return 0
  }
}

const readDraftCount = () => {
  try {
    const raw = localStorage.getItem('admin_blog_posts')
    if (!raw) return 0
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return 0
    return parsed.filter((post) => String(post?.status || '').toLowerCase() === 'draft').length
  } catch {
    return 0
  }
}

const Admin = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [authUser, setAuthUser] = useState(null)
  const [activeTab, setActiveTab] = useState('dashboard')
  const navigate = useNavigate()

  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('adminDark') === '1')
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => readAdminSettings().enableNotifications !== false)
  const [notificationOpen, setNotificationOpen] = useState(false)
  const [notificationItems, setNotificationItems] = useState([])
  const [notificationLoading, setNotificationLoading] = useState(false)
  const [notificationUpdatedAt, setNotificationUpdatedAt] = useState(null)
  const notificationRef = useRef(null)
  const toggleDark = () => setDarkMode(d => {
    const next = !d
    localStorage.setItem('adminDark', next ? '1' : '0')
    return next
  })

  const syncNotificationSetting = () => {
    const next = readAdminSettings().enableNotifications !== false
    setNotificationsEnabled(next)
  }

  const buildFrontendNotifications = () => {
    const eventsCount = readArrayCount('admin_events')
    const mediaCount = readArrayCount('admin_media')
    const visitorsCount = readArrayCount('admin_visitors')
    const draftCount = readDraftCount()

    const list = []
    if (eventsCount === 0) {
      list.push({
        id: 'frontend-events-empty',
        source: 'frontend',
        level: 'warning',
        title: 'No events published',
        detail: 'Add at least one upcoming event so visitors see active schedules.'
      })
    }

    if (mediaCount === 0) {
      list.push({
        id: 'frontend-media-empty',
        source: 'frontend',
        level: 'info',
        title: 'Media gallery is empty',
        detail: 'Upload media items to improve homepage and media page engagement.'
      })
    }

    if (draftCount > 0) {
      list.push({
        id: 'frontend-blog-drafts',
        source: 'frontend',
        level: 'info',
        title: `${draftCount} blog draft${draftCount > 1 ? 's' : ''} pending`,
        detail: 'Review and publish drafts when ready.'
      })
    }

    if (visitorsCount === 0) {
      list.push({
        id: 'frontend-no-visitors',
        source: 'frontend',
        level: 'info',
        title: 'No visitor records yet',
        detail: 'Visitor records will appear after subscriptions and admin additions.'
      })
    }

    return list
  }

  const fetchJsonWithTimeout = async (url, timeoutMs = 5000) => {
    const controller = new AbortController()
    const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs)
    try {
      const response = await fetch(url, { signal: controller.signal })
      const data = await response.json().catch(() => ({}))
      return { ok: response.ok, status: response.status, data }
    } catch (error) {
      return { ok: false, status: 0, data: null, error: error?.message || 'Request failed' }
    } finally {
      window.clearTimeout(timeoutId)
    }
  }

  const buildServerNotifications = async () => {
    const list = []

    const attendance = await fetchJsonWithTimeout('/attendance/health')
    if (!attendance.ok) {
      list.push({
        id: 'server-attendance-down',
        source: 'server',
        level: 'error',
        title: 'Attendance service unreachable',
        detail: 'Attendance API is not responding from the admin panel.'
      })
    } else {
      list.push({
        id: 'server-attendance-ok',
        source: 'server',
        level: 'success',
        title: 'Attendance service online',
        detail: 'Attendance API health check passed.'
      })
    }

    const botHealth = await fetchJsonWithTimeout('/bot/health')
    if (!botHealth.ok) {
      list.push({
        id: 'server-bot-down',
        source: 'server',
        level: 'error',
        title: 'Bot service unreachable',
        detail: 'Bot API is unavailable to the admin panel.'
      })
    } else {
      list.push({
        id: 'server-bot-ok',
        source: 'server',
        level: 'success',
        title: 'Bot service online',
        detail: 'Bot health endpoint is responding.'
      })
    }

    const monitoringHealth = await fetchJsonWithTimeout('/bot/monitoring/health')
    if (!monitoringHealth.ok) {
      list.push({
        id: 'server-monitoring-health',
        source: 'server',
        level: 'warning',
        title: 'Monitoring health unavailable',
        detail: 'Detailed monitoring health endpoint did not respond normally.'
      })
    } else if (monitoringHealth.data?.status && monitoringHealth.data.status !== 'healthy') {
      list.push({
        id: 'server-monitoring-degraded',
        source: 'server',
        level: monitoringHealth.data.status === 'unhealthy' ? 'error' : 'warning',
        title: `Monitoring status: ${monitoringHealth.data.status}`,
        detail: 'Investigate message delivery, DB, and queue metrics.'
      })
    }

    const alerts = await fetchJsonWithTimeout('/bot/monitoring/alerts')
    if (alerts.ok && alerts.data?.hasAlerts && Array.isArray(alerts.data.alerts) && alerts.data.alerts.length > 0) {
      list.push({
        id: 'server-alerts-active',
        source: 'server',
        level: 'warning',
        title: `${alerts.data.alerts.length} active server alert${alerts.data.alerts.length > 1 ? 's' : ''}`,
        detail: 'Open bot monitoring endpoints/logs to review alert details.'
      })
    }

    return list
  }

  const loadNotifications = async ({ silent = false } = {}) => {
    const enabled = readAdminSettings().enableNotifications !== false
    if (enabled !== notificationsEnabled) {
      setNotificationsEnabled(enabled)
    }

    if (!enabled) {
      setNotificationItems([
        {
          id: 'notifications-disabled',
          source: 'frontend',
          level: 'info',
          title: 'Notifications are disabled',
          detail: 'Enable Admin Notifications in Settings to receive updates.'
        }
      ])
      setNotificationUpdatedAt(new Date().toISOString())
      return
    }

    if (!silent) setNotificationLoading(true)
    const frontend = buildFrontendNotifications()
    const server = await buildServerNotifications()
    const combined = [...server, ...frontend]
      .map((item) => ({ ...item, time: new Date().toISOString() }))
      .sort((a, b) => (NOTIFICATION_LEVEL_PRIORITY[a.level] ?? 9) - (NOTIFICATION_LEVEL_PRIORITY[b.level] ?? 9))

    setNotificationItems(combined)
    setNotificationUpdatedAt(new Date().toISOString())
    setNotificationLoading(false)
  }

  useEffect(() => {
    let mounted = true

    const load = async () => {
      const session = await bootstrapAdminSession()
      if (!mounted) return
      if (session.ok && session.user) {
        setAuthUser(session.user)
        setIsAuthenticated(true)
      }
    }

    void load()
    return () => {
      mounted = false
    }
  }, [])

  const componentPreloaders = {
    events: loadEventManager,
    media: loadMediaManager,
    blog: loadBlogManager,
    testimonies: loadTestimonyManager,
    visitors: loadVisitorManager,
    attendance: loadAttendanceManager,
    analytics: loadAnalytics,
    settings: loadSettings
  }

  useEffect(() => {
    if (!isAuthenticated) return

    const preloadLikelyNextTabs = () => {
      loadEventManager()
      loadMediaManager()
      loadBlogManager()
      loadAnalytics()
    }

    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(preloadLikelyNextTabs, { timeout: 1200 })
      return () => window.cancelIdleCallback(id)
    }

    const timeoutId = window.setTimeout(preloadLikelyNextTabs, 300)
    return () => window.clearTimeout(timeoutId)
  }, [isAuthenticated])

  useEffect(() => {
    if (!isAuthenticated) return

    syncNotificationSetting()
    void loadNotifications({ silent: true })

    const intervalId = window.setInterval(() => {
      void loadNotifications({ silent: true })
    }, 90 * 1000)

    const handleStorage = (event) => {
      if (!event.key || event.key === ADMIN_SETTINGS_STORAGE_KEY) {
        syncNotificationSetting()
        void loadNotifications({ silent: true })
      }
    }

    const handleSettingsUpdated = () => {
      syncNotificationSetting()
      void loadNotifications({ silent: true })
    }

    const handleDocumentClick = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setNotificationOpen(false)
      }
    }

    const handleEscape = (event) => {
      if (event.key === 'Escape') setNotificationOpen(false)
    }

    window.addEventListener('storage', handleStorage)
    window.addEventListener(ADMIN_SETTINGS_UPDATED_EVENT, handleSettingsUpdated)
    document.addEventListener('mousedown', handleDocumentClick)
    document.addEventListener('keydown', handleEscape)

    return () => {
      window.clearInterval(intervalId)
      window.removeEventListener('storage', handleStorage)
      window.removeEventListener(ADMIN_SETTINGS_UPDATED_EVENT, handleSettingsUpdated)
      document.removeEventListener('mousedown', handleDocumentClick)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isAuthenticated, notificationsEnabled])

  const handleLogin = async ({ email, password, otpCode }) => {
    const result = await loginAdminWithFallback({ email, password, otpCode })
    if (result?.ok && result?.user) {
      setAuthUser(result.user)
      setIsAuthenticated(true)
    }
    return result
  }

  const handleRequestReset = async ({ email }) => {
    return requestAdminPasswordReset({ email })
  }

  const handleConfirmReset = async ({ token, newPassword }) => {
    return confirmAdminPasswordReset({ token, newPassword })
  }

  const handleLogout = async () => {
    await logoutAdmin()
    setAuthUser(null)
    setIsAuthenticated(false)
    navigate('/')
  }

  const hasPermission = (permission) => canAdmin(authUser?.role, permission)

  const tabs = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      description: 'High-level ministry performance, publishing velocity, and activity snapshots.'
    },
    {
      id: 'events',
      label: 'Events',
      icon: Calendar,
      description: 'Organize event schedules, service timelines, and communication plans.'
    },
    {
      id: 'media',
      label: 'Media',
      icon: Image,
      description: 'Upload and curate visual assets used across pages and announcements.'
    },
    {
      id: 'blog',
      label: 'Blog',
      icon: FileText,
      description: 'Create polished posts and manage publishing quality from one workspace.'
    },
    {
      id: 'testimonies',
      label: 'Testimonies',
      icon: Heart,
      description: 'Upload and manage member testimonies shown publicly.'
    },
    {
      id: 'visitors',
      label: 'Visitors',
      icon: Users,
      description: 'Track visitor records and follow-up engagement data in one view.'
    },
    {
      id: 'attendance',
      label: 'Attendance',
      icon: QrCode,
      description: 'Generate Sunday attendance code and QR for service sharing.'
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: BarChart3,
      description: 'Review trends, channel performance, and audience engagement metrics.'
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: SettingsIcon,
      description: 'Configure admin defaults, security options, and operational preferences.'
    }
  ]

  const activeTabMeta = useMemo(() => {
    return tabs.find((tab) => tab.id === activeTab) || tabs[0]
  }, [activeTab])

  const renderActiveView = () => {
    if (activeTab === 'dashboard') {
      return <Dashboard onNavigate={setActiveTab} />
    }

    if (activeTab === 'events') {
      return <EventManager currentUser={authUser} hasPermission={hasPermission} />
    }

    if (activeTab === 'media') {
      return <MediaManager currentUser={authUser} hasPermission={hasPermission} />
    }

    if (activeTab === 'blog') {
      return <BlogManager currentUser={authUser} hasPermission={hasPermission} />
    }

    if (activeTab === 'testimonies') {
      return <TestimonyManager />
    }

    if (activeTab === 'visitors') {
      return <VisitorManager />
    }

    if (activeTab === 'attendance') {
      return <AttendanceManager />
    }

    if (activeTab === 'analytics') {
      return <Analytics />
    }

    return <Settings currentUser={authUser} hasPermission={hasPermission} />
  }

  const issueCount = notificationItems.filter((item) => item.level === 'error' || item.level === 'warning').length

  const toggleNotifications = () => {
    setNotificationOpen((prev) => {
      const next = !prev
      if (next) {
        syncNotificationSetting()
        void loadNotifications({ silent: false })
      }
      return next
    })
  }

  if (!isAuthenticated) {
    return (
      <Login
        onLogin={handleLogin}
        onRequestReset={handleRequestReset}
        onConfirmReset={handleConfirmReset}
      />
    )
  }

  return (
    <AdminThemeContext.Provider value={{ darkMode, toggleDark }}>
    <div className={`admin-container${darkMode ? ' admin-dark' : ''}`}>
      <aside className="admin-sidebar">
        <div className="admin-logo">
          <div className="admin-logo__icon">
            <Lock size={22} />
          </div>
          <div>
            <h2>Admin Center</h2>
            <p>Upperroom Workspace</p>
          </div>
        </div>

        <nav className="admin-nav">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                className={`admin-nav-btn ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
                onMouseEnter={() => componentPreloaders[tab.id]?.()}
                onFocus={() => componentPreloaders[tab.id]?.()}
              >
                <Icon size={18} />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </nav>

        <button className="admin-logout-btn" onClick={handleLogout}>
          <LogOut size={18} />
          <span>Logout</span>
        </button>
      </aside>

      <main className="admin-main admin-page">
        <header className="admin-main__header">
          <div>
            <p className="admin-main__eyebrow">Operations Workspace</p>
            <h1>{activeTabMeta.label}</h1>
            <p>{activeTabMeta.description}</p>
          </div>
          <div className="admin-main__meta">
            <div className="admin-notifications" ref={notificationRef}>
              <button
                type="button"
                className="admin-notifications__button"
                onClick={toggleNotifications}
                aria-label="Open notifications"
                aria-expanded={notificationOpen}
                aria-haspopup="menu"
                title="Notifications"
              >
                <Bell size={16} />
                {notificationsEnabled && issueCount > 0 ? (
                  <span className="admin-notifications__badge">{issueCount > 9 ? '9+' : issueCount}</span>
                ) : null}
              </button>

              {notificationOpen ? (
                <div className="admin-notifications__menu" role="menu">
                  <div className="admin-notifications__menu-head">
                    <div>
                      <strong>Notifications</strong>
                      <p>{notificationUpdatedAt ? `Updated ${formatRelativeTime(notificationUpdatedAt)}` : 'Checking status...'}</p>
                    </div>
                    <button
                      type="button"
                      className="admin-notifications__refresh"
                      onClick={() => void loadNotifications({ silent: false })}
                      disabled={notificationLoading}
                    >
                      {notificationLoading ? 'Refreshing...' : 'Refresh'}
                    </button>
                  </div>

                  {!notificationsEnabled ? (
                    <div className="admin-notifications__empty">
                      <p>Notifications are disabled in Settings.</p>
                      <button
                        type="button"
                        className="admin-notifications__open-settings"
                        onClick={() => {
                          setActiveTab('settings')
                          setNotificationOpen(false)
                        }}
                      >
                        Open Settings
                      </button>
                    </div>
                  ) : null}

                  {notificationsEnabled && notificationItems.length === 0 ? (
                    <div className="admin-notifications__empty">
                      <p>No notifications right now.</p>
                    </div>
                  ) : null}

                  {notificationsEnabled && notificationItems.length > 0 ? (
                    <ul className="admin-notifications__list">
                      {notificationItems.map((item) => (
                        <li key={item.id} className={`admin-notifications__item admin-notifications__item--${item.level}`}>
                          <div className="admin-notifications__meta-line">
                            <span className="admin-notifications__source">{item.source}</span>
                            <span className="admin-notifications__time">{formatRelativeTime(item.time)}</span>
                          </div>
                          <p className="admin-notifications__title">{item.title}</p>
                          <p className="admin-notifications__detail">{item.detail}</p>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ) : null}
            </div>

            <button
              className="admin-dark-toggle"
              onClick={toggleDark}
              title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {darkMode ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <span>{authUser?.name ? `${authUser.name} (${authUser.role})` : 'Session Active'}</span>
          </div>
        </header>

        <div className="admin-content">
          <Suspense fallback={<div style={{ padding: '1rem', color: darkMode ? '#7f93b3' : '#6b7280' }}>Loading section...</div>}>
            {renderActiveView()}
          </Suspense>
        </div>
      </main>
    </div>
    </AdminThemeContext.Provider>
  )
}

export default Admin
