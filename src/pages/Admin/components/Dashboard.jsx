import { Calendar, Image, FileText, TrendingUp, Users, ArrowRight } from 'lucide-react'

const Dashboard = ({ onNavigate }) => {
  const stats = [
    { label: 'Total Events', value: '12', icon: Calendar, color: '#5a4494', link: 'events' },
    { label: 'Media Items', value: '156', icon: Image, color: '#2d3a7a', link: 'media' },
    { label: 'Blog Posts', value: '34', icon: FileText, color: '#d4a82e', link: 'blog' },
    { label: 'Visitors', value: '856', icon: Users, color: '#10b981', link: 'visitors' }
  ]

  const recentActivities = [
    { type: 'event', text: 'Event "Youth Summit 2026" created', time: '2 hours ago' },
    { type: 'media', text: '12 new media items uploaded', time: '5 hours ago' },
    { type: 'blog', text: 'New blog post published', time: '1 day ago' },
    { type: 'visitor', text: '23 new subscribers joined', time: '1 day ago' }
  ]

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ margin: '0 0 0.5rem', fontSize: '2rem', color: '#111827' }}>
          Dashboard
        </h1>
        <p style={{ margin: 0, color: '#6b7280' }}>
          Manage your website content and monitor activity
        </p>
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '1.5rem',
        marginBottom: '2rem'
      }}>
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <div
              key={stat.label}
              onClick={() => onNavigate(stat.link)}
              style={{
                background: 'white',
                padding: '1.5rem',
                borderRadius: '0.75rem',
                border: '1px solid #e5e7eb',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                cursor: 'pointer',
                transition: 'transform 0.2s, box-shadow 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0,0,0,0.1)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
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
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                  {stat.label}
                </div>
                <div style={{ fontSize: '1.875rem', fontWeight: 700, color: '#111827' }}>
                  {stat.value}
                </div>
              </div>
              <ArrowRight size={20} style={{ color: '#9ca3af' }} />
            </div>
          )
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
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
            {recentActivities.map((activity, index) => (
              <div key={index} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: '#f9fafb', borderRadius: '0.5rem' }}>
                <span style={{ fontSize: '0.875rem', color: '#374151' }}>{activity.text}</span>
                <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{activity.time}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ 
          background: 'white', 
          padding: '1.5rem', 
          borderRadius: '0.75rem',
          border: '1px solid #e5e7eb'
        }}>
          <h2 style={{ margin: '0 0 1rem', fontSize: '1.25rem', color: '#111827' }}>
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
              <Calendar size={16} />
            </button>
            <button
              onClick={() => onNavigate('media')}
              style={{
                padding: '0.75rem 1.5rem',
                background: '#2d3a7a',
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
              Upload Media
              <Image size={16} />
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
              onClick={() => onNavigate('analytics')}
              style={{
                padding: '0.75rem 1.5rem',
                background: 'white',
                color: '#374151',
                border: '1px solid #d1d5db',
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              View Analytics
              <TrendingUp size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
