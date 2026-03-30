import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, BarChart3, FileText, HandCoins, MessageSquare, TrendingUp, Users } from 'lucide-react'
import { fetchAdminAnalytics, fetchAdminAuditLog } from '../../../utils/adminApi'
import { useAdminTheme } from '../AdminThemeContext'

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

const titleize = (value = '') => {
  return String(value || '')
    .replace(/[._-]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

const summarizeAuditEntry = (entry) => {
  const action = titleize(entry?.action || 'activity')
  const resource = titleize(entry?.resource || '')
  const actor = String(entry?.actorEmail || 'System').trim()
  return resource ? `${actor} • ${action} on ${resource}` : `${actor} • ${action}`
}

const Dashboard = ({ onNavigate }) => {
  const { darkMode } = useAdminTheme()
  const [overview, setOverview] = useState(null)
  const [activities, setActivities] = useState([])
  const [isLoadingSummary, setIsLoadingSummary] = useState(true)
  const [isLoadingActivity, setIsLoadingActivity] = useState(true)
  const [summaryError, setSummaryError] = useState('')
  const [activityError, setActivityError] = useState('')

  useEffect(() => {
    let isMounted = true

    const loadDashboard = async () => {
      setIsLoadingSummary(true)
      setIsLoadingActivity(true)
      setSummaryError('')
      setActivityError('')

      const [analyticsResult, auditResult] = await Promise.allSettled([
        fetchAdminAnalytics({ windowDays: 30 }),
        fetchAdminAuditLog({ limit: 6, offset: 0 })
      ])

      if (!isMounted) {
        return
      }

      if (analyticsResult.status === 'fulfilled') {
        setOverview(analyticsResult.value?.overview || null)
      } else {
        setOverview(null)
        setSummaryError(analyticsResult.reason?.message || 'Unable to load analytics summary.')
      }

      if (auditResult.status === 'fulfilled') {
        setActivities(Array.isArray(auditResult.value?.data) ? auditResult.value.data : [])
      } else {
        setActivities([])
        setActivityError(auditResult.reason?.message || 'Unable to load recent activity.')
      }

      setIsLoadingSummary(false)
      setIsLoadingActivity(false)
    }

    void loadDashboard()

    return () => {
      isMounted = false
    }
  }, [])

  const stats = useMemo(() => ([
    {
      label: 'Page Views',
      value: overview ? String(overview.pageViews ?? 0) : '--',
      icon: TrendingUp,
      color: '#5a4494',
      link: 'analytics'
    },
    {
      label: 'Active Subscribers',
      value: overview ? String(overview.activeSubscribers ?? 0) : '--',
      icon: Users,
      color: '#10b981',
      link: 'visitors'
    },
    {
      label: 'Contact Submissions',
      value: overview ? String(overview.contactSubmissions ?? 0) : '--',
      icon: MessageSquare,
      color: '#2d3a7a',
      link: 'analytics'
    },
    {
      label: 'Successful Giving',
      value: overview ? String(overview.givingSuccessfulTransactions ?? 0) : '--',
      icon: HandCoins,
      color: '#d4a82e',
      link: 'giving'
    },
    {
      label: 'Published Blog Posts',
      value: overview ? String(overview.publishedBlogPosts ?? 0) : '--',
      icon: FileText,
      color: '#e11d48',
      link: 'blog'
    },
    {
      label: 'Audit Events',
      value: overview ? String(overview.auditEvents ?? 0) : '--',
      icon: BarChart3,
      color: '#0ea5e9',
      link: 'auditLog'
    }
  ]), [overview])

  const surface = darkMode ? '#1a2235' : 'white'
  const borderColor = darkMode ? '#2a3550' : '#e5e7eb'
  const textPrimary = darkMode ? '#e2e8f0' : '#111827'
  const textSecondary = darkMode ? '#7f93b3' : '#6b7280'
  const textLabel = darkMode ? '#94afd4' : '#374151'
  const rowBg = darkMode ? '#222c40' : '#f9fafb'

  return (
    <>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ margin: '0 0 0.5rem', fontSize: '2rem', color: textPrimary }}>
          Dashboard
        </h1>
        <p style={{ margin: 0, color: textSecondary }}>
          Monitor live ministry operations from analytics and audit activity instead of browser-local counts.
        </p>
      </div>

      {summaryError && (
        <div style={{
          marginBottom: '1rem',
          padding: '0.85rem 1rem',
          borderRadius: '0.6rem',
          background: darkMode ? '#3b1f28' : '#fef2f2',
          border: `1px solid ${darkMode ? '#6b2336' : '#fecaca'}`,
          color: darkMode ? '#fecdd3' : '#991b1b',
          fontSize: '0.875rem',
          fontWeight: 600
        }}>
          {summaryError}
        </div>
      )}

      <div className="admin-dashboard-stats-wrapper">
        <div className="admin-dashboard-stats-container">
          <div className="admin-dashboard-stats-grid">
            {stats.map((stat) => {
              const Icon = stat.icon
              return (
                <button
                  key={stat.label}
                  type="button"
                  className="admin-dashboard-stat-card"
                  onClick={() => onNavigate(stat.link)}
                  style={{
                    '--stat-surface': surface,
                    '--stat-border': borderColor,
                    '--stat-color': stat.color,
                    '--stat-accent-bg': `${stat.color}15`,
                    '--stat-label-color': textSecondary,
                    '--stat-value-color': textPrimary,
                    '--stat-arrow-color': darkMode ? '#5a7099' : '#9ca3af',
                    opacity: isLoadingSummary ? 0.85 : 1
                  }}
                >
                  <div
                    className="admin-dashboard-stat-card__icon"
                  >
                    <Icon size={20} />
                  </div>
                  <div className="admin-dashboard-stat-card__content">
                    <div className="admin-dashboard-stat-card__label">
                      {stat.label}
                    </div>
                    <div className="admin-dashboard-stat-card__value">
                      {isLoadingSummary ? '...' : stat.value}
                    </div>
                  </div>
                  <ArrowRight size={16} className="admin-dashboard-stat-card__arrow" />
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <div className="admin-dashboard-content-grid">
        <div style={{
          background: surface,
          padding: '1.5rem',
          borderRadius: '0.75rem',
          border: `1px solid ${borderColor}`
        }}>
          <h2 style={{ margin: '0 0 1.5rem', fontSize: '1.25rem', color: textPrimary }}>
            Recent Activity
          </h2>

          {activityError && (
            <div style={{
              marginBottom: '1rem',
              padding: '0.85rem 1rem',
              borderRadius: '0.6rem',
              background: darkMode ? '#3b1f28' : '#fef2f2',
              border: `1px solid ${darkMode ? '#6b2336' : '#fecaca'}`,
              color: darkMode ? '#fecdd3' : '#991b1b',
              fontSize: '0.875rem',
              fontWeight: 600
            }}>
              {activityError}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {isLoadingActivity && (
              <div style={{ padding: '0.75rem', background: rowBg, borderRadius: '0.5rem', color: textSecondary }}>
                Loading recent activity...
              </div>
            )}

            {!isLoadingActivity && !activities.length && !activityError && (
              <div style={{ padding: '0.75rem', background: rowBg, borderRadius: '0.5rem', color: textSecondary }}>
                No audit activity yet.
              </div>
            )}

            {!isLoadingActivity && activities.map((activity) => (
              <div key={activity.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', padding: '0.75rem', background: rowBg, borderRadius: '0.5rem' }}>
                <span style={{ fontSize: '0.875rem', color: textLabel }}>{summarizeAuditEntry(activity)}</span>
                <span style={{ fontSize: '0.75rem', color: darkMode ? '#5a7099' : '#9ca3af', whiteSpace: 'nowrap' }}>
                  {formatRelativeTime(activity.createdAt)}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div style={{
          background: surface,
          padding: '1.5rem',
          borderRadius: '0.75rem',
          border: `1px solid ${borderColor}`
        }}>
          <h2 style={{ margin: '0 0 1rem', fontSize: '1.25rem', color: textPrimary }}>
            Quick Actions
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <button
              onClick={() => onNavigate('events')}
              style={{
                padding: '0.75rem 1.5rem',
                background: '#5a4494',
                color: 'white',
                border: 'none',
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              Create Event
              <BarChart3 size={16} />
            </button>
            <button
              onClick={() => onNavigate('visitors')}
              style={{
                padding: '0.75rem 1.5rem',
                background: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              Review Visitors
              <Users size={16} />
            </button>
            <button
              onClick={() => onNavigate('blog')}
              style={{
                padding: '0.75rem 1.5rem',
                background: '#d4a82e',
                color: 'white',
                border: 'none',
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              New Blog Post
              <FileText size={16} />
            </button>
            <button
              onClick={() => onNavigate('auditLog')}
              style={{
                padding: '0.75rem 1.5rem',
                background: darkMode ? '#1e2840' : 'white',
                color: darkMode ? '#94afd4' : '#374151',
                border: `1px solid ${darkMode ? '#2a3550' : '#d1d5db'}`,
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              Open Audit Log
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

export default Dashboard
