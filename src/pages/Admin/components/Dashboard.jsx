import { Calendar, Image, FileText, TrendingUp } from 'lucide-react'

const Dashboard = () => {
  const stats = [
    { label: 'Total Events', value: '12', icon: Calendar, color: '#5a4494' },
    { label: 'Media Items', value: '156', icon: Image, color: '#2d3a7a' },
    { label: 'Blog Posts', value: '34', icon: FileText, color: '#d4a82e' },
    { label: 'Page Views', value: '2.4k', icon: TrendingUp, color: '#8a161e' }
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
              style={{
                background: 'white',
                padding: '1.5rem',
                borderRadius: '0.75rem',
                border: '1px solid #e5e7eb',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem'
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
              <div>
                <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                  {stat.label}
                </div>
                <div style={{ fontSize: '1.875rem', fontWeight: 700, color: '#111827' }}>
                  {stat.value}
                </div>
              </div>
            </div>
          )
        })}
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
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <button
            style={{
              padding: '0.75rem 1.5rem',
              background: '#5a4494',
              color: 'white',
              border: 'none',
              borderRadius: '0.5rem',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Create Event
          </button>
          <button
            style={{
              padding: '0.75rem 1.5rem',
              background: '#2d3a7a',
              color: 'white',
              border: 'none',
              borderRadius: '0.5rem',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Upload Media
          </button>
          <button
            style={{
              padding: '0.75rem 1.5rem',
              background: '#d4a82e',
              color: 'white',
              border: 'none',
              borderRadius: '0.5rem',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            New Blog Post
          </button>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
