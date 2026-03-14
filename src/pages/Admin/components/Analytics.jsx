import { TrendingUp, TrendingDown, Users, Eye, MessageCircle, Calendar } from 'lucide-react'

const Analytics = () => {
  const stats = [
    {
      label: 'Total Page Views',
      value: '12,543',
      change: '+12.5%',
      trend: 'up',
      icon: Eye,
      color: '#5a4494'
    },
    {
      label: 'Unique Visitors',
      value: '3,421',
      change: '+8.2%',
      trend: 'up',
      icon: Users,
      color: '#2d3a7a'
    },
    {
      label: 'WhatsApp Subscribers',
      value: '856',
      change: '+15.3%',
      trend: 'up',
      icon: MessageCircle,
      color: '#10b981'
    },
    {
      label: 'Event Registrations',
      value: '124',
      change: '-3.1%',
      trend: 'down',
      icon: Calendar,
      color: '#d4a82e'
    }
  ]

  const topPages = [
    { page: '/media', views: 3421, percentage: 27 },
    { page: '/', views: 2987, percentage: 24 },
    { page: '/events', views: 2145, percentage: 17 },
    { page: '/blog', views: 1876, percentage: 15 },
    { page: '/testimonies', views: 1234, percentage: 10 }
  ]

  const recentActivity = [
    { type: 'blog', title: 'New blog post published: "Walking in Faith"', time: '2 hours ago', color: '#d4a82e' },
    { type: 'event', title: 'Event "Youth Summit 2026" created', time: '5 hours ago', color: '#5a4494' },
    { type: 'media', title: '12 new media items uploaded', time: '1 day ago', color: '#2d3a7a' },
    { type: 'subscriber', title: '23 new WhatsApp subscribers', time: '1 day ago', color: '#10b981' },
    { type: 'event', title: 'Event "Prayer Night" completed', time: '2 days ago', color: '#6b7280' }
  ]

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ margin: '0 0 0.5rem', fontSize: '2rem', color: '#111827' }}>
          Analytics
        </h1>
        <p style={{ margin: 0, color: '#6b7280' }}>
          Track website performance and engagement metrics
        </p>
      </div>

      {/* Stats Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: '1.5rem',
        marginBottom: '2rem'
      }}>
        {stats.map((stat) => {
          const Icon = stat.icon
          const TrendIcon = stat.trend === 'up' ? TrendingUp : TrendingDown
          return (
            <div
              key={stat.label}
              style={{
                background: 'white',
                padding: '1.5rem',
                borderRadius: '0.75rem',
                border: '1px solid #e5e7eb'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '0.75rem',
                    background: `${stat.color}15`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: stat.color
                  }}
                >
                  <Icon size={24} />
                </div>
                <span
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    color: stat.trend === 'up' ? '#10b981' : '#ef4444'
                  }}
                >
                  <TrendIcon size={16} />
                  {stat.change}
                </span>
              </div>
              <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                {stat.label}
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: '#111827' }}>
                {stat.value}
              </div>
            </div>
          )
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
        {/* Top Pages */}
        <div style={{
          background: 'white',
          padding: '1.5rem',
          borderRadius: '0.75rem',
          border: '1px solid #e5e7eb'
        }}>
          <h2 style={{ margin: '0 0 1.5rem', fontSize: '1.25rem', color: '#111827' }}>
            Top Pages
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {topPages.map((page, index) => (
              <div key={page.page}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.875rem', color: '#374151', fontWeight: 500 }}>
                    {page.page}
                  </span>
                  <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                    {page.views.toLocaleString()} views
                  </span>
                </div>
                <div style={{ width: '100%', height: '8px', background: '#f3f4f6', borderRadius: '9999px', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${page.percentage}%`,
                      height: '100%',
                      background: `linear-gradient(90deg, #5a4494, #2d3a7a)`,
                      transition: 'width 0.3s'
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div style={{
          background: 'white',
          padding: '1.5rem',
          borderRadius: '0.75rem',
          border: '1px solid #e5e7eb'
        }}>
          <h2 style={{ margin: '0 0 1.5rem', fontSize: '1.25rem', color: '#111827' }}>
            Recent Activity
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {recentActivity.map((activity, index) => (
              <div key={index} style={{ display: 'flex', gap: '0.75rem' }}>
                <div
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: activity.color,
                    marginTop: '0.5rem',
                    flexShrink: 0
                  }}
                />
                <div>
                  <div style={{ fontSize: '0.875rem', color: '#111827', marginBottom: '0.25rem' }}>
                    {activity.title}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                    {activity.time}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Weekly Engagement Chart Placeholder */}
      <div style={{
        background: 'white',
        padding: '1.5rem',
        borderRadius: '0.75rem',
        border: '1px solid #e5e7eb',
        marginTop: '1.5rem'
      }}>
        <h2 style={{ margin: '0 0 1rem', fontSize: '1.25rem', color: '#111827' }}>
          Weekly Engagement
        </h2>
        <div style={{
          height: '300px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f9fafb',
          borderRadius: '0.5rem',
          color: '#6b7280'
        }}>
          <div style={{ textAlign: 'center' }}>
            <TrendingUp size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
            <p style={{ margin: 0 }}>Chart visualization placeholder</p>
            <p style={{ margin: '0.5rem 0 0', fontSize: '0.875rem' }}>
              Integrate with Chart.js or Recharts for full visualization
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Analytics
