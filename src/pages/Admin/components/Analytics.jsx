import { useCallback, useEffect, useMemo, useState } from 'react'
import { Activity, Eye, Mail, MessageCircle, RefreshCw, TrendingDown, TrendingUp, Users } from 'lucide-react'
import { useAdminTheme } from '../AdminThemeContext'
import { fetchAdminAnalytics } from '../../../utils/adminApi'

const WINDOW_OPTIONS = [7, 14, 30, 90]

const formatTrend = (value) => {
  if (value == null || Number.isNaN(value)) {
    return { label: 'No baseline', direction: 'flat' }
  }
  if (value === 0) {
    return { label: '0.0%', direction: 'flat' }
  }
  if (value > 0) {
    return { label: `+${value.toFixed(1)}%`, direction: 'up' }
  }
  return { label: `${value.toFixed(1)}%`, direction: 'down' }
}

const formatNumber = (value) => {
  if (!Number.isFinite(Number(value))) return '0'
  return Number(value).toLocaleString()
}

const SegmentCard = ({ title, items, darkMode, emptyLabel }) => {
  const surface = darkMode ? '#1a2235' : 'white'
  const borderColor = darkMode ? '#2a3550' : '#e5e7eb'
  const textPrimary = darkMode ? '#e2e8f0' : '#111827'
  const textSecondary = darkMode ? '#7f93b3' : '#6b7280'
  const rowBg = darkMode ? '#151e2e' : '#f9fafb'
  const barTrack = darkMode ? '#2a3550' : '#e5e7eb'

  return (
    <section
      style={{
        background: surface,
        border: `1px solid ${borderColor}`,
        borderRadius: '0.75rem',
        padding: '1.25rem'
      }}
    >
      <h2 style={{ margin: '0 0 1rem', fontSize: '1.05rem', color: textPrimary }}>
        {title}
      </h2>
      {!items.length ? (
        <p style={{ margin: 0, fontSize: '0.9rem', color: textSecondary }}>{emptyLabel}</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {items.map((item) => (
            <div key={item.label} style={{ background: rowBg, borderRadius: '0.5rem', padding: '0.65rem 0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.4rem' }}>
                <span style={{ fontSize: '0.85rem', color: textPrimary, fontWeight: 600 }}>{item.label}</span>
                <span style={{ fontSize: '0.8rem', color: textSecondary }}>
                  {formatNumber(item.count)} ({item.share.toFixed(1)}%)
                </span>
              </div>
              <div style={{ width: '100%', height: '7px', borderRadius: '999px', background: barTrack, overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${Math.max(2, Math.min(100, item.share))}%`,
                    height: '100%',
                    background: 'linear-gradient(90deg, #5a4494, #2d3a7a)'
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

const Analytics = () => {
  const { darkMode } = useAdminTheme()
  const [windowDays, setWindowDays] = useState(30)
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async ({ silent = false } = {}) => {
    if (silent) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }
    setError('')

    try {
      const payload = await fetchAdminAnalytics({ windowDays })
      setAnalytics(payload || null)
    } catch (err) {
      setError(err?.message || 'Unable to load analytics data.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [windowDays])

  useEffect(() => {
    void load({ silent: false })
  }, [load])

  const surface = darkMode ? '#1a2235' : 'white'
  const borderColor = darkMode ? '#2a3550' : '#e5e7eb'
  const textPrimary = darkMode ? '#e2e8f0' : '#111827'
  const textSecondary = darkMode ? '#7f93b3' : '#6b7280'
  const textLabel = darkMode ? '#94afd4' : '#374151'
  const inputBg = darkMode ? '#151e2e' : '#f9fafb'

  const stats = useMemo(() => {
    if (!analytics?.overview) return []
    return [
      {
        label: 'Page Views',
        value: analytics.overview.pageViews,
        trend: analytics?.trends?.pageViews,
        icon: Eye,
        color: '#5a4494'
      },
      {
        label: 'Unique Routes',
        value: analytics.overview.uniqueRoutes,
        trend: analytics?.trends?.uniqueRoutes,
        icon: Activity,
        color: '#2d3a7a'
      },
      {
        label: 'Active Subscribers',
        value: analytics.overview.activeSubscribers,
        trend: analytics?.trends?.newSubscribers,
        icon: MessageCircle,
        color: '#10b981'
      },
      {
        label: 'Contact Submissions',
        value: analytics.overview.contactSubmissions,
        trend: analytics?.trends?.contactSubmissions,
        icon: Mail,
        color: '#d4a82e'
      }
    ]
  }, [analytics])

  const timeline = Array.isArray(analytics?.timeline) ? analytics.timeline : []
  const timelineMax = Math.max(1, ...timeline.map((item) => Math.max(item.pageViews || 0, item.contacts || 0)))

  const lastUpdated = analytics?.generatedAt ? new Date(analytics.generatedAt).toLocaleString() : '--'

  return (
    <div>
      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: '0 0 0.45rem', fontSize: '2rem', color: textPrimary }}>
            Analytics
          </h1>
          <p style={{ margin: 0, color: textSecondary }}>
            Performance, engagement, and audience segmentation for admin operations.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <label htmlFor="analytics-window" style={{ fontSize: '0.82rem', color: textSecondary }}>Window</label>
          <select
            id="analytics-window"
            value={windowDays}
            onChange={(event) => setWindowDays(Number(event.target.value))}
            style={{
              background: inputBg,
              color: textPrimary,
              border: `1px solid ${borderColor}`,
              borderRadius: '0.5rem',
              padding: '0.5rem 0.6rem',
              fontSize: '0.85rem'
            }}
          >
            {WINDOW_OPTIONS.map((days) => (
              <option key={days} value={days}>{days} days</option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => void load({ silent: true })}
            style={{
              border: `1px solid ${borderColor}`,
              background: inputBg,
              color: textPrimary,
              borderRadius: '0.5rem',
              padding: '0.5rem 0.65rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              fontSize: '0.82rem',
              cursor: 'pointer'
            }}
          >
            <RefreshCw size={14} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      <div style={{ marginBottom: '1.2rem', color: textSecondary, fontSize: '0.8rem' }}>
        Last updated: {lastUpdated}
      </div>

      {loading ? (
        <section
          style={{
            background: surface,
            border: `1px solid ${borderColor}`,
            borderRadius: '0.75rem',
            padding: '1.4rem',
            color: textSecondary
          }}
        >
          Loading analytics...
        </section>
      ) : null}

      {!loading && error ? (
        <section
          style={{
            background: surface,
            border: `1px solid #ef4444`,
            borderRadius: '0.75rem',
            padding: '1.4rem',
            color: '#ef4444',
            marginBottom: '1.5rem'
          }}
        >
          {error}
        </section>
      ) : null}

      {!loading && !error ? (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '1rem',
              marginBottom: '1.5rem'
            }}
          >
            {stats.map((stat) => {
              const Icon = stat.icon
              const trend = formatTrend(stat.trend)
              const TrendIcon = trend.direction === 'down' ? TrendingDown : trend.direction === 'up' ? TrendingUp : Users
              return (
                <article
                  key={stat.label}
                  style={{
                    background: surface,
                    border: `1px solid ${borderColor}`,
                    borderRadius: '0.75rem',
                    padding: '1rem'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.9rem' }}>
                    <div
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '0.65rem',
                        background: `${stat.color}1f`,
                        color: stat.color,
                        display: 'grid',
                        placeItems: 'center'
                      }}
                    >
                      <Icon size={20} />
                    </div>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        color: trend.direction === 'down' ? '#ef4444' : trend.direction === 'up' ? '#10b981' : textSecondary
                      }}
                    >
                      <TrendIcon size={14} />
                      {trend.label}
                    </span>
                  </div>
                  <p style={{ margin: '0 0 0.2rem', color: textSecondary, fontSize: '0.83rem' }}>{stat.label}</p>
                  <p style={{ margin: 0, color: textPrimary, fontSize: '1.7rem', fontWeight: 700 }}>{formatNumber(stat.value)}</p>
                </article>
              )
            })}
          </div>

          <section
            style={{
              background: surface,
              border: `1px solid ${borderColor}`,
              borderRadius: '0.75rem',
              padding: '1.25rem',
              marginBottom: '1.5rem'
            }}
          >
            <h2 style={{ margin: '0 0 0.8rem', color: textPrimary, fontSize: '1.08rem' }}>Trend Timeline</h2>
            <p style={{ margin: '0 0 1rem', color: textSecondary, fontSize: '0.83rem' }}>
              Daily page views and contact submissions in the selected window.
            </p>
            {!timeline.length ? (
              <p style={{ margin: 0, color: textSecondary }}>No timeline data yet.</p>
            ) : (
              <div style={{ display: 'grid', gap: '0.5rem' }}>
                {timeline.map((item) => (
                  <div key={item.day} style={{ display: 'grid', gridTemplateColumns: '100px 1fr 1fr auto', gap: '0.55rem', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.78rem', color: textSecondary }}>{item.day.slice(5)}</span>
                    <div style={{ background: inputBg, borderRadius: '999px', overflow: 'hidden', height: '8px' }}>
                      <div style={{ width: `${(Math.max(0, item.pageViews || 0) / timelineMax) * 100}%`, height: '100%', background: '#5a4494' }} />
                    </div>
                    <div style={{ background: inputBg, borderRadius: '999px', overflow: 'hidden', height: '8px' }}>
                      <div style={{ width: `${(Math.max(0, item.contacts || 0) / timelineMax) * 100}%`, height: '100%', background: '#d4a82e' }} />
                    </div>
                    <span style={{ fontSize: '0.75rem', color: textLabel }}>
                      {formatNumber(item.pageViews)} pv / {formatNumber(item.contacts)} c
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
            <SegmentCard
              title="Traffic Segments by Route"
              items={analytics?.segments?.trafficByRoute || []}
              darkMode={darkMode}
              emptyLabel="No route-level traffic data yet."
            />
            <SegmentCard
              title="Performance Rating Mix"
              items={analytics?.segments?.performanceRatings || []}
              darkMode={darkMode}
              emptyLabel="No performance samples yet."
            />
            <SegmentCard
              title="Traffic Source Mix"
              items={analytics?.segments?.trafficSources || []}
              darkMode={darkMode}
              emptyLabel="No source breakdown data yet."
            />
            <SegmentCard
              title="Contact Intent Segments"
              items={analytics?.segments?.contactSubjects || []}
              darkMode={darkMode}
              emptyLabel="No contact submissions in this window."
            />
            <SegmentCard
              title="Subscriber Source Segments"
              items={analytics?.segments?.subscriberSources || []}
              darkMode={darkMode}
              emptyLabel="No active subscribers yet."
            />
          </div>
        </>
      ) : null}
    </div>
  )
}

export default Analytics
