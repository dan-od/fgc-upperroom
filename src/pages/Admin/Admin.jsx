import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock, LayoutDashboard, Calendar, Image, FileText, LogOut } from 'lucide-react'
import Login from './components/Login'
import Dashboard from './components/Dashboard'
import EventManager from './components/EventManager'
import MediaManager from './components/MediaManager'
import BlogManager from './components/BlogManager'
import './Admin.css'

const Admin = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [activeTab, setActiveTab] = useState('dashboard')
  const navigate = useNavigate()

  useEffect(() => {
    // Check if already authenticated (session storage)
    const auth = sessionStorage.getItem('adminAuth')
    if (auth === 'true') {
      setIsAuthenticated(true)
    }
  }, [])

  const handleLogin = (password) => {
    // In production, validate against backend
    const adminPassword = import.meta.env.VITE_ADMIN_PASSWORD || 'admin123'
    
    if (password === adminPassword) {
      setIsAuthenticated(true)
      sessionStorage.setItem('adminAuth', 'true')
      return true
    }
    return false
  }

  const handleLogout = () => {
    setIsAuthenticated(false)
    sessionStorage.removeItem('adminAuth')
    navigate('/')
  }

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />
  }

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'events', label: 'Events', icon: Calendar },
    { id: 'media', label: 'Media', icon: Image },
    { id: 'blog', label: 'Blog', icon: FileText }
  ]

  return (
    <div className="admin-container">
      <aside className="admin-sidebar">
        <div className="admin-logo">
          <Lock size={28} />
          <h2>Admin Center</h2>
        </div>
        
        <nav className="admin-nav">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                className={`admin-nav-btn ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon size={20} />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </nav>

        <button className="admin-logout-btn" onClick={handleLogout}>
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </aside>

      <main className="admin-main">
        <div className="admin-content">
          {activeTab === 'dashboard' && <Dashboard />}
          {activeTab === 'events' && <EventManager />}
          {activeTab === 'media' && <MediaManager />}
          {activeTab === 'blog' && <BlogManager />}
        </div>
      </main>
    </div>
  )
}

export default Admin
