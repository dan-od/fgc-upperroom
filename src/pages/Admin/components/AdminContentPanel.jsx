import { Suspense, lazy } from 'react'
import Dashboard from './Dashboard'

const EventManager = lazy(() => import('./EventManager'))
const MediaManager = lazy(() => import('./MediaManager'))
const BlogManager = lazy(() => import('./BlogManager'))
const TestimonyManager = lazy(() => import('./TestimonyManager'))
const VisitorManager = lazy(() => import('./VisitorManager'))
const BotOpsManager = lazy(() => import('./BotOpsManager'))
const AttendanceManager = lazy(() => import('./AttendanceManager'))
const Analytics = lazy(() => import('./Analytics'))
const GivingManager = lazy(() => import('./GivingManager'))
const Settings = lazy(() => import('./Settings'))
const AdminUsers = lazy(() => import('./AdminUsers'))
const AuditLog = lazy(() => import('./AuditLog'))

export default function AdminContentPanel({ activeTab, authUser, hasPermission, darkMode, onNavigate }) {
  const renderView = () => {
    if (activeTab === 'dashboard') return <Dashboard onNavigate={onNavigate} />
    if (activeTab === 'events') return <EventManager currentUser={authUser} hasPermission={hasPermission} />
    if (activeTab === 'media') return <MediaManager currentUser={authUser} hasPermission={hasPermission} />
    if (activeTab === 'blog') return <BlogManager currentUser={authUser} hasPermission={hasPermission} />
    if (activeTab === 'testimonies') return <TestimonyManager currentUser={authUser} hasPermission={hasPermission} />
    if (activeTab === 'visitors') return <VisitorManager currentUser={authUser} hasPermission={hasPermission} />
    if (activeTab === 'botOps') return <BotOpsManager currentUser={authUser} hasPermission={hasPermission} />
    if (activeTab === 'attendance') return <AttendanceManager currentUser={authUser} hasPermission={hasPermission} />
    if (activeTab === 'analytics') return <Analytics currentUser={authUser} hasPermission={hasPermission} />
    if (activeTab === 'giving') return <GivingManager currentUser={authUser} hasPermission={hasPermission} />
    if (activeTab === 'adminUsers') return <AdminUsers currentUser={authUser} hasPermission={hasPermission} />
    if (activeTab === 'auditLog') return <AuditLog currentUser={authUser} hasPermission={hasPermission} />
    return <Settings currentUser={authUser} hasPermission={hasPermission} onNavigate={onNavigate} />
  }

  return (
    <Suspense fallback={<div style={{ padding: '1rem', color: darkMode ? '#7f93b3' : '#6b7280' }}>Loading section...</div>}>
      {renderView()}
    </Suspense>
  )
}
