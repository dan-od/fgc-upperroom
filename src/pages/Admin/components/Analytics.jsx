import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Activity, Eye, HandCoins, Mail, MessageCircle, MousePointerClick, RefreshCw } from 'lucide-react'
import { DropdownSelect } from '../../../components/common'
import { useAdminTheme } from '../AdminThemeContext'
import { fetchAdminAnalytics } from '../../../utils/adminApi'

const WINDOW_OPTIONS = [7, 14, 30, 90]

const formatTrend = (value) => {
  if (value == null || Number.isNaN(value)) {
    return { label: '— No baseline', direction: 'flat' }
  }
  if (value === 0) {
    return { label: '↗ 0.0%', direction: 'flat' }
  }
  if (value > 0) {
    return { label: `↗ +${value.toFixed(1)}%`, direction: 'up' }
  }
  return { label: `↘ ${value.toFixed(1)}%`, direction: 'down' }
}

const formatNumber = (value) => {
  if (!Number.isFinite(Number(value))) return '0'
  return Number(value).toLocaleString()
}

/* ─── SVG Sparkline / Line Chart ─── */
const LineChart = ({ data, darkMode }) => {
  const svgRef = useRef(null)
  const W = 860
  const H = 200
  const PAD = { top: 16, right: 16, bottom: 36, left: 44 }

  if (!data || data.length === 0) {
    const textColor = darkMode ? '#7f93b3' : '#6b7280'
    return (
      <p style={{ margin: 0, fontSize: '0.9rem', color: textColor }}>
        No timeline data yet.
      </p>
    )
  }

  const maxVal = Math.max(1, ...data.map((d) => Math.max(d.pageViews || 0, d.contacts || 0)))
  const innerW = W - PAD.left - PAD.right
  const innerH = H - PAD.top - PAD.bottom
  const xStep = data.length > 1 ? innerW / (data.length - 1) : innerW

  const toX = (i) => PAD.left + i * xStep
  const toY = (v) => PAD.top + innerH - (v / maxVal) * innerH

  const polyline = (key, color) => {
    const pts = data.map((d, i) => `${toX(i).toFixed(1)},${toY(d[key] || 0).toFixed(1)}`).join(' ')
    return pts
  }

  const gridLines = [0, 0.25, 0.5, 0.75, 1].map((f) => ({
    y: PAD.top + innerH * (1 - f),
    label: (maxVal * f % 1 === 0) ? String(Math.round(maxVal * f)) : (maxVal * f).toFixed(1)
  }))

  const axisColor = darkMode ? '#2a3550' : '#e5e7eb'
  const labelColor = darkMode ? '#5a7099' : '#9ca3af'
  const textColor = darkMode ? '#7f93b3' : '#6b7280'

  // show every Nth label to avoid crowding
  const labelEvery = data.length > 20 ? 5 : data.length > 10 ? 3 : 1

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${W} ${H}`}
      style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}
      aria-label="Analytics trend chart"
    >
      {/* Grid lines */}
      {gridLines.map((gl) => (
        <g key={gl.y}>
          <line x1={PAD.left} y1={gl.y} x2={W - PAD.right} y2={gl.y} stroke={axisColor} strokeWidth="1" />
          <text x={PAD.left - 6} y={gl.y + 4} textAnchor="end" fontSize="11" fill={labelColor}>{gl.label}</text>
        </g>
      ))}

      {/* Page views line */}
      <polyline
        points={polyline('pageViews', '#7c5cbf')}
        fill="none"
        stroke="#7c5cbf"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* Area fill under page views */}
      <polygon
        points={`${PAD.left},${PAD.top + innerH} ${polyline('pageViews', '#7c5cbf')} ${toX(data.length - 1)},${PAD.top + innerH}`}
        fill="url(#pvGrad)"
        opacity="0.18"
      />

      <defs>
        <linearGradient id="pvGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7c5cbf" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#7c5cbf" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* X-axis labels */}
      {data.map((d, i) => {
        if (i % labelEvery !== 0 && i !== data.length - 1) return null
        return (
          <text
            key={d.day}
            x={toX(i)}
            y={H - 6}
            textAnchor="middle"
            fontSize="10"
            fill={labelColor}
          >
            {d.day.slice(5)}
          </text>
        )
      })}
    </svg>
  )
}

/* ─── Stat Card ─── */
const StatCard = ({ stat, darkMode }) => {
  const surface = darkMode ? '#1a2235' : 'white'
  const borderColor = darkMode ? '#2a3550' : '#e5e7eb'
  const textPrimary = darkMode ? '#e2e8f0' : '#111827'
  const textSecondary = darkMode ? '#7f93b3' : '#6b7280'

  const Icon = stat.icon
  const trend = formatTrend(stat.trend)
  const trendColor =
    trend.direction === 'down' ? '#ef4444'
    : trend.direction === 'up' ? '#10b981'
    : textSecondary

  return (
    <article
      style={{
        background: surface,
        border: `1px solid ${borderColor}`,
        borderRadius: '0.75rem',
        padding: '1rem 1.1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.6rem'
      }}
    >
      {/* Top row: icon + trend */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '0.55rem',
            background: `${stat.color}22`,
            color: stat.color,
            display: 'grid',
            placeItems: 'center',
            flexShrink: 0
          }}
        >
          <Icon size={18} />
        </div>
        <span
          style={{
            fontSize: '0.75rem',
            fontWeight: 600,
            color: trendColor,
            whiteSpace: 'nowrap'
          }}
        >
          {trend.label}
        </span>
      </div>

      {/* Label + value */}
      <div>
        <p style={{ margin: '0 0 0.15rem', fontSize: '0.82rem', color: textSecondary }}>{stat.label}</p>
        <p style={{ margin: 0, fontSize: '1.75rem', fontWeight: 700, color: textPrimary, lineHeight: 1 }}>
          {formatNumber(stat.value)}
        </p>
      </div>
    </article>
  )
}

/* ─── Segment Card ─── */
const SegmentCard = ({ title, items, darkMode, emptyLabel }) => {
  const surface = darkMode ? '#1a2235' : 'white'
  const borderColor = darkMode ? '#2a3550' : '#e5e7eb'
  const textPrimary = darkMode ? '#e2e8f0' : '#111827'
  const textSecondary = darkMode ? '#7f93b3' : '#6b7280'
  const barTrack = darkMode ? '#2a3550' : '#e5e7eb'

  return (
    <section
      style={{
        background: surface,
        border: `1px solid ${borderColor}`,
        borderRadius: '0.75rem',
        padding: '1.1rem 1.2rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem'
      }}
    >
      <h2 style={{ margin: 0, fontSize: '0.93rem', fontWeight: 700, color: textPrimary }}>
        {title}
      </h2>

      {!items.length ? (
        <p style={{ margin: 0, fontSize: '0.82rem', color: textSecondary }}>{emptyLabel}</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          {items.map((item) => (
            <div key={item.label}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                <span style={{ fontSize: '0.83rem', color: textPrimary, fontWeight: 500 }}>{item.label}</span>
                <span style={{ fontSize: '0.78rem', color: textSecondary }}>
                  {formatNumber(item.count)} ({item.share.toFixed(1)}%)
                </span>
              </div>
              <div style={{ width: '100%', height: '6px', borderRadius: '999px', background: barTrack, overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${Math.max(2, Math.min(100, item.share))}%`,
                    height: '100%',
                    background: 'linear-gradient(90deg, #7c5cbf, #2d3a7a)',
                    borderRadius: '999px'
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

/* ─── Main Analytics Component ─── */
const Analytics = () => {
  const { darkMode } = useAdminTheme()
  const [windowDays, setWindowDays] = useState(30)
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async ({ silent = false } = {}) => {
    if (silent) setRefreshing(true)
    else setLoading(true)
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

  useEffect(() => { void load({ silent: false }) }, [load])

  const surface = darkMode ? '#1a2235' : 'white'
  const borderColor = darkMode ? '#2a3550' : '#e5e7eb'
  const textPrimary = darkMode ? '#e2e8f0' : '#111827'
  const textSecondary = darkMode ? '#7f93b3' : '#6b7280'
  const inputBg = darkMode ? '#151e2e' : '#f9fafb'

  const stats = useMemo(() => {
    if (!analytics?.overview) return []
    return [
      { label: 'Page Views',          value: analytics.overview.pageViews,                      trend: analytics?.trends?.pageViews,                      icon: Eye,              color: '#7c5cbf' },
      { label: 'Unique Routes',        value: analytics.overview.uniqueRoutes,                    trend: analytics?.trends?.uniqueRoutes,                    icon: Activity,         color: '#2d3a7a' },
      { label: 'Active Subscribers',   value: analytics.overview.activeSubscribers,               trend: analytics?.trends?.newSubscribers,                  icon: MessageCircle,    color: '#10b981' },
      { label: 'Contact Submissions',  value: analytics.overview.contactSubmissions,              trend: analytics?.trends?.contactSubmissions,              icon: Mail,             color: '#d4a82e' },
      { label: 'Giving (Success)',      value: analytics.overview.givingSuccessfulTransactions,    trend: analytics?.trends?.givingSuccessfulTransactions,    icon: HandCoins,        color: '#0ea5e9' },
      { label: 'Sunday CTA Clicks',    value: analytics.overview.sundayOfferingCtaClicks,         trend: analytics?.trends?.sundayOfferingCtaClicks,         icon: MousePointerClick, color: '#f97316' },
    ]
  }, [analytics])

  const timeline = Array.isArray(analytics?.timeline) ? analytics.timeline : []
  const lastUpdated = analytics?.generatedAt ? new Date(analytics.generatedAt).toLocaleString() : '--'

  const segmentCards = [
    { title: 'Traffic Segments by Route',  key: 'trafficByRoute',       empty: 'No route-level traffic data yet.' },
    { title: 'Performance Rating Mix',     key: 'performanceRatings',   empty: 'No performance samples yet.' },
    { title: 'Traffic Source Mix',         key: 'trafficSources',       empty: 'No source breakdown data yet.' },
    { title: 'Contact Intent Segments',    key: 'contactSubjects',      empty: 'No contact submissions in this window.' },
    { title: 'Subscriber Source Segments', key: 'subscriberSources',    empty: 'No active subscribers yet.' },
    { title: 'Giving by Fund',             key: 'givingByFund',         empty: 'No giving records in this window.' },
    { title: 'Giving Status Mix',          key: 'givingByStatus',       empty: 'No giving status breakdown yet.' },
    { title: 'Giving Sources',             key: 'givingBySource',       empty: 'No giving source data yet.' },
    { title: 'Sunday Offering Funnel',     key: 'sundayOfferingFunnel', empty: 'No Sunday offering funnel data yet.' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: '0 0 0.3rem', color: textPrimary }}>Analytics</h1>
          <p style={{ margin: '0 0 0.25rem', color: textSecondary, fontSize: '0.85rem' }}>
            Performance, engagement, and audience segmentation for{' '}
            <span style={{ color: '#7c5cbf' }}>admin operations.</span>
          </p>
          <p style={{ margin: 0, color: darkMode ? '#4a6080' : '#9ca3af', fontSize: '0.75rem' }}>
            Last updated: {lastUpdated}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexShrink: 0 }}>
          <label htmlFor="analytics-window" style={{ fontSize: '0.82rem', color: textSecondary }}>Window:</label>
          <DropdownSelect
            id="analytics-window"
            value={windowDays}
            onChange={(e) => setWindowDays(Number(e.target.value))}
            style={{
              background: inputBg,
              color: textPrimary,
              border: `1px solid ${borderColor}`,
              borderRadius: '0.45rem',
              padding: '0.42rem 0.6rem',
              fontSize: '0.82rem',
              cursor: 'pointer'
            }}
          >
            {WINDOW_OPTIONS.map((d) => <option key={d} value={d}>{d} days</option>)}
          </DropdownSelect>

          <button
            type="button"
            onClick={() => void load({ silent: true })}
            style={{
              border: `1px solid ${borderColor}`,
              background: inputBg,
              color: textPrimary,
              borderRadius: '0.45rem',
              padding: '0.42rem 0.75rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              fontSize: '0.82rem',
              cursor: 'pointer'
            }}
          >
            <RefreshCw size={13} style={refreshing ? { animation: 'spin 1s linear infinite' } : {}} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* ── Loading / Error ── */}
      {loading && (
        <section style={{ background: surface, border: `1px solid ${borderColor}`, borderRadius: '0.75rem', padding: '1.4rem', color: textSecondary, fontSize: '0.9rem' }}>
          Loading analytics…
        </section>
      )}

      {!loading && error && (
        <section style={{ background: surface, border: '1px solid #ef4444', borderRadius: '0.75rem', padding: '1.4rem', color: '#ef4444', fontSize: '0.9rem' }}>
          {error}
        </section>
      )}

      {/* ── Content ── */}
      {!loading && !error && (
        <>
          {/* Stat cards — all 6 in a single 1×6 row */}
          <div
            className="analytics-stat-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(6, 1fr)',
              gap: '0.9rem'
            }}
          >
            {stats.map((stat) => (
              <StatCard key={stat.label} stat={stat} darkMode={darkMode} />
            ))}
          </div>

          {/* Trend Timeline chart */}
          <section
            style={{
              background: surface,
              border: `1px solid ${borderColor}`,
              borderRadius: '0.75rem',
              padding: '1.25rem 1.4rem'
            }}
          >
            <h2 style={{ margin: '0 0 0.25rem', fontSize: '1rem', fontWeight: 700, color: textPrimary }}>
              Trend Timeline
            </h2>
            <p style={{ margin: '0 0 1rem', fontSize: '0.8rem', color: textSecondary }}>
              Daily page views and contact submissions in the selected window.
            </p>
            <LineChart data={timeline} darkMode={darkMode} />
          </section>

          {/* Segment cards — 4-col grid */}
          <div
            className="analytics-seg-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '0.9rem'
            }}
          >
            {segmentCards.map(({ title, key, empty }) => (
              <SegmentCard
                key={key}
                title={title}
                items={analytics?.segments?.[key] || []}
                darkMode={darkMode}
                emptyLabel={empty}
              />
            ))}
          </div>
        </>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
        @media (max-width: 1200px) {
          .analytics-stat-grid { grid-template-columns: repeat(3, 1fr) !important; }
          .analytics-seg-grid  { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 700px) {
          .analytics-stat-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .analytics-seg-grid  { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}

export default Analytics
