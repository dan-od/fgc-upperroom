import { useEffect, useState } from 'react'
import { Search, Download, UserPlus, UserX } from 'lucide-react'

const VisitorManager = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [selectedVisitors, setSelectedVisitors] = useState([])
  const [visitors, setVisitors] = useState([])

  useEffect(() => {
    const stored = localStorage.getItem('admin_visitors')
    if (stored) {
      setVisitors(JSON.parse(stored))
      return
    }

    const demoVisitors = [
      {
        id: 1,
        name: 'John Doe',
        phone: '+2348012345678',
        firstVisit: '2026-01-15',
        subscribed: true,
        tags: ['regular', 'tithes'],
        lastContact: '2026-03-01'
      },
      {
        id: 2,
        name: 'Jane Smith',
        phone: '+2348087654321',
        firstVisit: '2026-02-20',
        subscribed: true,
        tags: ['youth'],
        lastContact: '2026-03-05'
      },
      {
        id: 3,
        name: 'Mike Johnson',
        phone: '+2348123456789',
        firstVisit: '2025-12-10',
        subscribed: false,
        tags: ['stopped'],
        lastContact: '2026-02-10'
      }
    ]

    setVisitors(demoVisitors)
    localStorage.setItem('admin_visitors', JSON.stringify(demoVisitors))
  }, [])

  const persistVisitors = (updatedVisitors) => {
    setVisitors(updatedVisitors)
    localStorage.setItem('admin_visitors', JSON.stringify(updatedVisitors))
  }

  const filteredVisitors = visitors.filter(visitor => {
    const matchesSearch = visitor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         visitor.phone.includes(searchTerm)
    const matchesStatus = filterStatus === 'all' ||
                         (filterStatus === 'subscribed' && visitor.subscribed) ||
                         (filterStatus === 'unsubscribed' && !visitor.subscribed)
    return matchesSearch && matchesStatus
  })

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedVisitors(filteredVisitors.map(v => v.id))
    } else {
      setSelectedVisitors([])
    }
  }

  const handleSelectVisitor = (id) => {
    setSelectedVisitors(prev =>
      prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id]
    )
  }

  const handleExport = () => {
    const csv = [
      ['Name', 'Phone', 'First Visit', 'Subscribed', 'Tags', 'Last Contact'].join(','),
      ...filteredVisitors.map(v => 
        [v.name, v.phone, v.firstVisit, v.subscribed, v.tags.join(';'), v.lastContact].join(',')
      )
    ].join('\n')
    
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `visitors-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  const handleBulkSubscribe = () => {
    const updated = visitors.map((visitor) =>
      selectedVisitors.includes(visitor.id)
        ? { ...visitor, subscribed: true, lastContact: new Date().toISOString().split('T')[0] }
        : visitor
    )
    persistVisitors(updated)
    alert(`${selectedVisitors.length} visitors subscribed`)
    setSelectedVisitors([])
  }

  const handleBulkUnsubscribe = () => {
    const updated = visitors.map((visitor) =>
      selectedVisitors.includes(visitor.id)
        ? { ...visitor, subscribed: false, lastContact: new Date().toISOString().split('T')[0] }
        : visitor
    )
    persistVisitors(updated)
    alert(`${selectedVisitors.length} visitors unsubscribed`)
    setSelectedVisitors([])
  }

  const handleAddVisitor = () => {
    const name = window.prompt('Visitor name')
    const phone = window.prompt('Phone number')
    if (!name || !phone) return

    const newVisitor = {
      id: Date.now(),
      name,
      phone,
      firstVisit: new Date().toISOString().split('T')[0],
      subscribed: true,
      tags: ['new'],
      lastContact: new Date().toISOString().split('T')[0]
    }

    persistVisitors([newVisitor, ...visitors])
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ margin: '0 0 0.5rem', fontSize: '2rem', color: '#111827' }}>
            Visitor Management
          </h1>
          <p style={{ margin: 0, color: '#6b7280' }}>
            Manage WhatsApp subscribers and contacts
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={handleExport}
            style={{
              padding: '0.75rem 1.25rem',
              background: 'white',
              color: '#374151',
              border: '1px solid #d1d5db',
              borderRadius: '0.5rem',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <Download size={16} />
            Export CSV
          </button>
          <button
            onClick={handleAddVisitor}
            style={{
              padding: '0.75rem 1.25rem',
              background: '#5a4494',
              color: 'white',
              border: 'none',
              borderRadius: '0.5rem',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <UserPlus size={16} />
            Add Visitor
          </button>
        </div>
      </div>

      <div style={{ 
        background: 'white',
        padding: '1.5rem',
        borderRadius: '0.75rem',
        border: '1px solid #e5e7eb',
        marginBottom: '1.5rem'
      }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          <div style={{ flex: '1', minWidth: '300px', position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
            <input
              type="text"
              placeholder="Search by name or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem 0.75rem 0.75rem 2.5rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.5rem',
                fontSize: '0.875rem'
              }}
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{
              padding: '0.75rem',
              border: '1px solid #d1d5db',
              borderRadius: '0.5rem',
              fontSize: '0.875rem',
              background: 'white'
            }}
          >
            <option value="all">All Visitors</option>
            <option value="subscribed">Subscribed</option>
            <option value="unsubscribed">Unsubscribed</option>
          </select>
        </div>

        {selectedVisitors.length > 0 && (
          <div style={{ 
            padding: '0.75rem 1rem',
            background: '#f3f4f6',
            borderRadius: '0.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1rem'
          }}>
            <span style={{ fontSize: '0.875rem', color: '#374151', fontWeight: 600 }}>
              {selectedVisitors.length} selected
            </span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={handleBulkSubscribe}
                style={{
                  padding: '0.5rem 1rem',
                  background: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.375rem',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                <UserPlus size={14} style={{ display: 'inline', marginRight: '0.25rem' }} />
                Subscribe
              </button>
              <button
                onClick={handleBulkUnsubscribe}
                style={{
                  padding: '0.5rem 1rem',
                  background: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.375rem',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                <UserX size={14} style={{ display: 'inline', marginRight: '0.25rem' }} />
                Unsubscribe
              </button>
            </div>
          </div>
        )}

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                <th style={{ padding: '0.75rem', textAlign: 'left' }}>
                  <input
                    type="checkbox"
                    onChange={handleSelectAll}
                    checked={selectedVisitors.length === filteredVisitors.length && filteredVisitors.length > 0}
                    style={{ cursor: 'pointer' }}
                  />
                </th>
                <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>
                  Name
                </th>
                <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>
                  Phone
                </th>
                <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>
                  First Visit
                </th>
                <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>
                  Status
                </th>
                <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>
                  Tags
                </th>
                <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>
                  Last Contact
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredVisitors.map((visitor) => (
                <tr key={visitor.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '1rem' }}>
                    <input
                      type="checkbox"
                      checked={selectedVisitors.includes(visitor.id)}
                      onChange={() => handleSelectVisitor(visitor.id)}
                      style={{ cursor: 'pointer' }}
                    />
                  </td>
                  <td style={{ padding: '1rem', fontSize: '0.875rem', fontWeight: 500, color: '#111827' }}>
                    {visitor.name}
                  </td>
                  <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#6b7280' }}>
                    {visitor.phone}
                  </td>
                  <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#6b7280' }}>
                    {visitor.firstVisit}
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{
                      padding: '0.25rem 0.75rem',
                      borderRadius: '9999px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      background: visitor.subscribed ? '#d1fae5' : '#fee2e2',
                      color: visitor.subscribed ? '#065f46' : '#991b1b'
                    }}>
                      {visitor.subscribed ? 'Subscribed' : 'Unsubscribed'}
                    </span>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                      {visitor.tags.map((tag) => (
                        <span
                          key={tag}
                          style={{
                            padding: '0.125rem 0.5rem',
                            borderRadius: '0.25rem',
                            fontSize: '0.75rem',
                            background: '#f3f4f6',
                            color: '#374151'
                          }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#6b7280' }}>
                    {visitor.lastContact}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: '1rem', fontSize: '0.875rem', color: '#6b7280', textAlign: 'center' }}>
          Showing {filteredVisitors.length} of {visitors.length} visitors
        </div>
      </div>
    </div>
  )
}

export default VisitorManager
