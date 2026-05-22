const adminPreloaders = {
  events: () => import('./components/EventManager'),
  media: () => import('./components/MediaManager'),
  blog: () => import('./components/BlogManager'),
  testimonies: () => import('./components/TestimonyManager'),
  visitors: () => import('./components/VisitorManager'),
  botOps: () => import('./components/BotOpsManager'),
  attendance: () => import('./components/AttendanceManager'),
  analytics: () => import('./components/Analytics'),
  giving: () => import('./components/GivingManager'),
  settings: () => import('./components/Settings'),
  adminUsers: () => import('./components/AdminUsers'),
  auditLog: () => import('./components/AuditLog')
}

export default adminPreloaders
