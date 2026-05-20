import {
  BarChart3, Calendar, FileText, HandCoins, Heart, Image,
  LayoutDashboard, MessageSquare, QrCode, ScrollText,
  Settings as SettingsIcon, UserCog, Users
} from 'lucide-react'

const ADMIN_TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, description: 'High-level ministry performance, publishing velocity, and activity snapshots.', permission: null },
  { id: 'events', label: 'Events', icon: Calendar, description: 'Organize event schedules, service timelines, and communication plans.', permission: 'content:event:read' },
  { id: 'media', label: 'Media', icon: Image, description: 'Upload and curate visual assets used across pages and announcements.', permission: 'content:media:read' },
  { id: 'blog', label: 'Blog', icon: FileText, description: 'Create polished posts and manage publishing quality from one workspace.', permission: 'content:blog:read' },
  { id: 'testimonies', label: 'Testimonies', icon: Heart, description: 'Upload and manage member testimonies shown publicly.', permission: 'content:testimonies:read' },
  { id: 'visitors', label: 'Visitors', icon: Users, description: 'Track visitor records and follow-up engagement data in one view.', permission: 'content:visitors:read' },
  { id: 'botOps', label: 'Bot Ops', icon: MessageSquare, description: 'Preview reminders, import visitors, and review message delivery.', permission: 'content:visitors:read' },
  { id: 'attendance', label: 'Attendance', icon: QrCode, description: 'Generate Sunday attendance code and QR for service sharing.', permission: 'content:attendance:read' },
  { id: 'giving', label: 'Giving', icon: HandCoins, description: 'Review donation transactions, filter records, inspect timeline, and export reconciliation CSV.', permission: 'giving:read' },
  { id: 'analytics', label: 'Analytics', icon: BarChart3, description: 'Review trends, channel performance, and audience engagement metrics.', permission: 'analytics:read' },
  { id: 'settings', label: 'Settings', icon: SettingsIcon, description: 'Configure admin defaults, security options, and operational preferences.', permission: 'admin:settings:manage' },
  { id: 'adminUsers', label: 'Admin Users', icon: UserCog, description: 'Manage admin accounts, roles, and access — create, edit, or remove users.', permission: 'admin:users:manage' },
  { id: 'auditLog', label: 'Audit Log', icon: ScrollText, description: 'Full history of who changed what and when — filterable and exportable.', permission: 'audit:read' }
]

export default ADMIN_TABS
