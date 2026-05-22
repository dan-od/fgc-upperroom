import { useMemo, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Menu, Moon, Sun } from 'lucide-react'
import ADMIN_TABS from './adminTabs'
import adminPreloaders from './adminPreloaders'
import Login from './components/Login'
import AdminSidebar from './components/AdminSidebar'
import AdminNotifications from './components/AdminNotifications'
import AdminContentPanel from './components/AdminContentPanel'
import { useNotifications } from './components/useNotifications'
import './Admin.css'
import { AdminThemeContext } from './AdminThemeContext'
import {
  bootstrapAdminSession, canAdmin, confirmAdminPasswordReset,
  loginAdmin, logoutAdmin, requestAdminPasswordReset
} from '../../utils/adminApi'

export default function Admin() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [authUser, setAuthUser] = useState(null)
  const [activeTab, setActiveTab] = useState('dashboard')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const navigate = useNavigate()

  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('adminDark') === '1')

  const toggleDark = () => setDarkMode(d => {
    const next = !d
    localStorage.setItem('adminDark', next ? '1' : '0')
    return next
  })

  const {
    notificationsEnabled, notificationOpen, notificationItems,
    notificationLoading, notificationUpdatedAt, notificationRef,
    toggleNotifications, closeNotifications, loadNotifications, issueCount
  } = useNotifications(isAuthenticated)

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
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    if (!isAuthenticated) return
    const preload = () => {
      adminPreloaders.events(); adminPreloaders.media()
      adminPreloaders.blog(); adminPreloaders.analytics()
    }
    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(preload, { timeout: 1200 })
      return () => window.cancelIdleCallback(id)
    }
    const id = window.setTimeout(preload, 300)
    return () => window.clearTimeout(id)
  }, [isAuthenticated])

  const handleLogin = async ({ email, password, otpCode }) => {
    const result = await loginAdmin({ email, password, otpCode })
    if (result?.ok && result?.user) { setAuthUser(result.user); setIsAuthenticated(true) }
    return result
  }
  const handleRequestReset = async ({ email }) => requestAdminPasswordReset({ email })
  const handleConfirmReset = async ({ token, newPassword }) => confirmAdminPasswordReset({ token, newPassword })
  const handleLogout = async () => {
    await logoutAdmin()
    setAuthUser(null)
    setIsAuthenticated(false)
    navigate('/admin')
  }

  const hasPermission = (permission) => canAdmin(authUser?.role, permission)

  const visibleTabs = ADMIN_TABS.filter((tab) => !tab.permission || hasPermission(tab.permission))
  const activeTabMeta = useMemo(() => ADMIN_TABS.find((tab) => tab.id === activeTab) || ADMIN_TABS[0], [activeTab])

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} onRequestReset={handleRequestReset} onConfirmReset={handleConfirmReset} />
  }

  return (
    <AdminThemeContext.Provider value={{ darkMode, toggleDark }}>
      <div className={`admin-container${darkMode ? ' admin-dark' : ''}`}>
        <AdminSidebar
          tabs={visibleTabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onLogout={handleLogout}
          componentPreloaders={adminPreloaders}
          onMobileClose={() => setMobileMenuOpen(false)}
        />

        {mobileMenuOpen && (
          <div className="admin-sidebar-backdrop open" onClick={() => setMobileMenuOpen(false)}></div>
        )}

        <main className="admin-main admin-page">
          <header className="admin-main__header">
            <div className="admin-header__left">
              <button className="admin-mobile-toggle" onClick={() => setMobileMenuOpen(true)}>
                <Menu size={24} />
              </button>
              <div>
                <p className="admin-main__eyebrow">Operations Workspace</p>
                <h1>{activeTabMeta.label}</h1>
                <p>{activeTabMeta.description}</p>
              </div>
            </div>
            <div className="admin-main__meta">
              <AdminNotifications
                notifications={notificationItems}
                loading={notificationLoading}
                isOpen={notificationOpen}
                onToggle={toggleNotifications}
                onRefresh={() => void loadNotifications({ silent: false })}
                onOpenSettings={() => { setActiveTab('settings'); closeNotifications() }}
                updatedAt={notificationUpdatedAt}
                notificationsEnabled={notificationsEnabled}
                issueCount={issueCount}
                notificationRef={notificationRef}
              />
              <button
                className="admin-dark-toggle"
                onClick={toggleDark}
                title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {darkMode ? <Sun size={15} /> : <Moon size={15} />}
              </button>
              <span className="admin-user-badge">{authUser?.name ? `${authUser.name} (${authUser.role})` : 'Session Active'}</span>
            </div>
          </header>

          <div className="admin-content">
            <AdminContentPanel activeTab={activeTab} authUser={authUser} hasPermission={hasPermission} darkMode={darkMode} onNavigate={setActiveTab} />
          </div>
        </main>
      </div>
    </AdminThemeContext.Provider>
  )
}
