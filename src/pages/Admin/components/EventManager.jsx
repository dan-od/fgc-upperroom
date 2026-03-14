import { useState, useEffect } from 'react'
import { Plus, Calendar, Clock, MapPin, Users, Search, Edit2, Trash2 } from 'lucide-react'

const EventManager = () => {
  const [view, setView] = useState('list') // list, create, edit
  const [events, setEvents] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategory, setFilterCategory] = useState('all')
  const [formData, setFormData] = useState({
    id: Date.now(),
    title: '',
    description: '',
    date: '',
    time: '',
    location: '',
    category: 'general',
    capacity: '',
    registrationRequired: false,
    status: 'upcoming',
    imageUrl: ''
  })

  // Load events from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('admin_events')
    if (stored) {
      setEvents(JSON.parse(stored))
    } else {
      // Demo data
      const demoEvents = [
        {
          id: 1,
          title: 'Youth Sunday Service',
          description: 'Weekly youth fellowship gathering with worship and word',
          date: '2026-04-12',
          time: '09:00',
          location: 'Main Auditorium',
          category: 'youth',
          capacity: '200',
          registrationRequired: false,
          status: 'upcoming',
          imageUrl: ''
        },
        {
          id: 2,
          title: 'Worship Night',
          description: 'An evening of powerful worship and praise',
          date: '2026-04-18',
          time: '18:00',
          location: 'Church Grounds',
          category: 'worship',
          capacity: '500',
          registrationRequired: true,
          status: 'upcoming',
          imageUrl: ''
        }
      ]
      setEvents(demoEvents)
      localStorage.setItem('admin_events', JSON.stringify(demoEvents))
    }
  }, [])

  const saveEvents = (updatedEvents) => {
    setEvents(updatedEvents)
    localStorage.setItem('admin_events', JSON.stringify(updatedEvents))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (view === 'create') {
      const newEvent = { ...formData, id: Date.now() }
      saveEvents([...events, newEvent])
      alert('Event created successfully!')
    } else if (view === 'edit') {
      const updated = events.map(evt => evt.id === formData.id ? formData : evt)
      saveEvents(updated)
      alert('Event updated successfully!')
    }
    resetForm()
  }

  const resetForm = () => {
    setFormData({
      id: Date.now(),
      title: '',
      description: '',
      date: '',
      time: '',
      location: '',
      category: 'general',
      capacity: '',
      registrationRequired: false,
      status: 'upcoming',
      imageUrl: ''
    })
    setView('list')
  }

  const handleEdit = (event) => {
    setFormData(event)
    setView('edit')
  }

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this event?')) {
      saveEvents(events.filter(evt => evt.id !== id))
      alert('Event deleted successfully!')
    }
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const filteredEvents = events.filter(event => {
    const matchesSearch = event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = filterCategory === 'all' || event.category === filterCategory
    return matchesSearch && matchesCategory
  })

  const getCategoryColor = (category) => {
    const colors = {
      general: '#6b7280',
      youth: '#5a4494',
      worship: '#d4a82e',
      outreach: '#10b981',
      conference: '#2d3a7a'
    }
    return colors[category] || colors.general
  }

  if (view === 'create' || view === 'edit') {
    return (
      <div>
        <div style={{ marginBottom: '2rem' }}>
          <button
            onClick={resetForm}
            style={{
              padding: '0.5rem 1rem',
              background: 'white',
              color: '#374151',
              border: '1px solid #d1d5db',
              borderRadius: '0.5rem',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: 'pointer',
              marginBottom: '1rem'
            }}
          >
            ← Back to Events
          </button>
          <h1 style={{ margin: '0 0 0.5rem', fontSize: '2rem', color: '#111827' }}>
            {view === 'create' ? 'Create New Event' : 'Edit Event'}
          </h1>
        </div>

        <div style={{ 
          background: 'white', 
          padding: '2rem', 
          borderRadius: '0.75rem',
          border: '1px solid #e5e7eb'
        }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>
                  Event Title *
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  required
                  style={{
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.5rem',
                    fontSize: '1rem'
                  }}
                  placeholder="e.g., Youth Sunday Service"
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>
                  Category *
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  style={{
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.5rem',
                    fontSize: '1rem'
                  }}
                >
                  <option value="general">General</option>
                  <option value="youth">Youth</option>
                  <option value="worship">Worship</option>
                  <option value="outreach">Outreach</option>
                  <option value="conference">Conference</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>
                Description *
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                required
                rows={4}
                style={{
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.5rem',
                  fontSize: '1rem',
                  resize: 'vertical'
                }}
                placeholder="Event description, schedule, and details..."
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>
                  Date *
                </label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  required
                  style={{
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.5rem',
                    fontSize: '1rem'
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>
                  Time *
                </label>
                <input
                  type="time"
                  name="time"
                  value={formData.time}
                  onChange={handleChange}
                  required
                  style={{
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.5rem',
                    fontSize: '1rem'
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>
                  Capacity
                </label>
                <input
                  type="number"
                  name="capacity"
                  value={formData.capacity}
                  onChange={handleChange}
                  style={{
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.5rem',
                    fontSize: '1rem'
                  }}
                  placeholder="Max attendees"
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>
                  Location *
                </label>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  required
                  style={{
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.5rem',
                    fontSize: '1rem'
                  }}
                  placeholder="e.g., Main Auditorium"
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>
                  Status
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  style={{
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.5rem',
                    fontSize: '1rem'
                  }}
                >
                  <option value="upcoming">Upcoming</option>
                  <option value="ongoing">Ongoing</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>
                Event Image URL (Optional)
              </label>
              <input
                type="url"
                name="imageUrl"
                value={formData.imageUrl}
                onChange={handleChange}
                style={{
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.5rem',
                  fontSize: '1rem'
                }}
                placeholder="https://example.com/event-image.jpg"
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <input
                type="checkbox"
                id="registrationRequired"
                name="registrationRequired"
                checked={formData.registrationRequired}
                onChange={handleChange}
                style={{ width: '20px', height: '20px', cursor: 'pointer' }}
              />
              <label htmlFor="registrationRequired" style={{ fontSize: '0.875rem', fontWeight: 500, color: '#374151', cursor: 'pointer' }}>
                Require registration for this event
              </label>
            </div>

            <div style={{ display: 'flex', gap: '1rem', paddingTop: '1rem', borderTop: '1px solid #e5e7eb' }}>
              <button
                type="submit"
                style={{
                  padding: '0.75rem 2rem',
                  background: '#5a4494',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.5rem',
                  fontSize: '1rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                {view === 'create' ? 'Create Event' : 'Update Event'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                style={{
                  padding: '0.75rem 2rem',
                  background: 'white',
                  color: '#374151',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.5rem',
                  fontSize: '1rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ margin: '0 0 0.5rem', fontSize: '2rem', color: '#111827' }}>
            Event Management
          </h1>
          <p style={{ margin: 0, color: '#6b7280' }}>
            {events.length} total events
          </p>
        </div>
        <button
          onClick={() => setView('create')}
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
            gap: '0.5rem'
          }}
        >
          <Plus size={18} />
          New Event
        </button>
      </div>

      {/* Search and Filters */}
      <div style={{ 
        background: 'white', 
        padding: '1.5rem', 
        borderRadius: '0.75rem',
        border: '1px solid #e5e7eb',
        marginBottom: '1.5rem'
      }}>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
            <input
              type="text"
              placeholder="Search events..."
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
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            style={{
              padding: '0.75rem',
              border: '1px solid #d1d5db',
              borderRadius: '0.5rem',
              fontSize: '0.875rem',
              background: 'white'
            }}
          >
            <option value="all">All Categories</option>
            <option value="general">General</option>
            <option value="youth">Youth</option>
            <option value="worship">Worship</option>
            <option value="outreach">Outreach</option>
            <option value="conference">Conference</option>
          </select>
        </div>
      </div>

      {/* Events Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem' }}>
        {filteredEvents.map((event) => (
          <div
            key={event.id}
            style={{
              background: 'white',
              borderRadius: '0.75rem',
              border: '1px solid #e5e7eb',
              overflow: 'hidden'
            }}
          >
            {event.imageUrl && (
              <img
                src={event.imageUrl}
                alt={event.title}
                style={{ width: '100%', height: '180px', objectFit: 'cover' }}
              />
            )}
            <div style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.75rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#111827', flex: 1 }}>
                  {event.title}
                </h3>
                <span
                  style={{
                    padding: '0.25rem 0.75rem',
                    borderRadius: '9999px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    background: `${getCategoryColor(event.category)}20`,
                    color: getCategoryColor(event.category)
                  }}
                >
                  {event.category}
                </span>
              </div>
              
              <p style={{ margin: '0 0 1rem', fontSize: '0.875rem', color: '#6b7280', lineHeight: '1.5' }}>
                {event.description.substring(0, 100)}...
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#6b7280' }}>
                  <Calendar size={16} />
                  {new Date(event.date).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#6b7280' }}>
                  <Clock size={16} />
                  {event.time}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#6b7280' }}>
                  <MapPin size={16} />
                  {event.location}
                </div>
                {event.capacity && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#6b7280' }}>
                    <Users size={16} />
                    Max {event.capacity} attendees
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', borderTop: '1px solid #e5e7eb', paddingTop: '1rem' }}>
                <button
                  onClick={() => handleEdit(event)}
                  style={{
                    flex: 1,
                    padding: '0.5rem',
                    background: '#f3f4f6',
                    color: '#374151',
                    border: 'none',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.375rem'
                  }}
                >
                  <Edit2 size={14} />
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(event.id)}
                  style={{
                    flex: 1,
                    padding: '0.5rem',
                    background: '#fee2e2',
                    color: '#991b1b',
                    border: 'none',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.375rem'
                  }}
                >
                  <Trash2 size={14} />
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredEvents.length === 0 && (
        <div style={{ 
          background: 'white', 
          padding: '3rem', 
          borderRadius: '0.75rem',
          border: '1px solid #e5e7eb',
          textAlign: 'center'
        }}>
          <Calendar size={48} style={{ margin: '0 auto 1rem', color: '#d1d5db' }} />
          <p style={{ margin: 0, color: '#9ca3af' }}>
            {searchTerm || filterCategory !== 'all' ? 'No events match your search' : 'No events yet. Create your first event!'}
          </p>
        </div>
      )}
    </div>
  )
}

export default EventManager
