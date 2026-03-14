import { useMemo, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BarChart3,
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
import Login from './components/Login'
import Dashboard from './components/Dashboard'
import EventManager from './components/EventManager'
import MediaManager from './components/MediaManager'
import BlogManager from './components/BlogManager'
import TestimonyManager from './components/TestimonyManager'
import VisitorManager from './components/VisitorManager'
import AttendanceManager from './components/AttendanceManager'
import Analytics from './components/Analytics'
import Settings from './components/Settings'
import './Admin.css'

const Admin = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [activeTab, setActiveTab] = useState('dashboard')
  const navigate = useNavigate()

  useEffect(() => {
    const auth = sessionStorage.getItem('adminAuth')
    if (auth === 'true') {
      setIsAuthenticated(true)
    }
  }, [])

  const handleLogin = (password) => {
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
      return <EventManager />
    }

    if (activeTab === 'media') {
      return <MediaManager />
    }

    if (activeTab === 'blog') {
      return <BlogManager />
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

    return <Settings />
  }

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />
  }

  return (
    <div className="admin-container">
      <aside className="admin-sidebar">
        <div className="admin-logo">
          <div className="admin-logo__icon">
            <Lock size={22} />
          </div>
          <div>
            <h2>Admin Center</h2>
            <p>Upper Room Workspace</p>
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
            <span>Session Active</span>
          </div>
        </header>

        <div className="admin-content">{renderActiveView()}</div>
      </main>
    </div>
  )
}

export default Admin
