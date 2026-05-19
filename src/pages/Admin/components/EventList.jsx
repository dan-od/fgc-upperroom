import { Plus, Calendar, Clock, MapPin, Users, Edit2, Trash2 } from 'lucide-react'
import { formatCategoryLabel, normalizeCategory } from './eventManagerUtils'
import EventFilters from './EventFilters'

const formatStamp = (value) => {
  if (!value) return 'Not updated yet'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Unknown' : date.toLocaleString()
}

const getCategoryColor = (category, ui) => {
  const colors = { general: ui.textSecondary, youth: '#5a4494', worship: '#d4a82e', outreach: '#10b981', conference: '#2d3a7a' }
  return colors[category] || colors.general
}

const btnStyle = (bg, color, enabled) => ({
  flex: 1, padding: '0.5rem', background: bg, color, border: 'none', borderRadius: '0.375rem',
  fontSize: '0.875rem', fontWeight: 600, cursor: enabled ? 'pointer' : 'not-allowed', opacity: enabled ? 1 : 0.6
})
const btnStyleCentered = (bg, color, enabled) => ({ ...btnStyle(bg, color, enabled), display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem' })

export default function EventList({
  events,
  filteredEvents,
  selectedEvents,
  setSelectedEvents,
  onEdit,
  onDelete,
  onSubmitForReview,
  onApprove,
  onPublish,
  onSchedule,
  onRollback,
  onBulkDelete,
  onBulkStatusChange,
  searchTerm,
  setSearchTerm,
  filterCategory,
  setFilterCategory,
  filterStatus,
  setFilterStatus,
  filterDate,
  setFilterDate,
  categories,
  notice,
  isLoading,
  canWrite,
  canPublish,
  canApprove,
  onCreateNew,
  darkMode,
  ui
}) {
  const handleSelectEvent = (id) => {
    setSelectedEvents((prev) => prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id])
  }

  const handleSelectAllChange = (value) => {
    if (value === '__select_all__') {
      setSelectedEvents(filteredEvents.map((event) => String(event.id)))
    } else {
      setSelectedEvents(value)
    }
  }

  return (
    <div>
      {notice && (
        <div style={{ marginBottom: '1rem', padding: '0.75rem 1rem', borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: 600, border: `1px solid ${notice.tone === 'error' ? '#fecaca' : '#86efac'}`, background: notice.tone === 'error' ? '#fef2f2' : '#ecfdf3', color: notice.tone === 'error' ? '#991b1b' : '#166534' }}>
          {notice.text}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ margin: '0 0 0.5rem', fontSize: '2rem', color: ui.textPrimary }}>Event Management</h1>
          <p style={{ margin: 0, color: ui.textSecondary }}>{isLoading ? 'Loading events...' : `${events.length} total events`}</p>
        </div>
        <button onClick={onCreateNew} disabled={!canWrite}
          style={{ padding: '0.75rem 1.5rem', background: '#5a4494', color: 'white', border: 'none', borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: 600, cursor: canWrite ? 'pointer' : 'not-allowed', opacity: canWrite ? 1 : 0.6, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Plus size={18} />
          New Event
        </button>
      </div>

      <EventFilters
        searchTerm={searchTerm} setSearchTerm={setSearchTerm}
        filterCategory={filterCategory} setFilterCategory={setFilterCategory}
        filterStatus={filterStatus} setFilterStatus={setFilterStatus}
        filterDate={filterDate} setFilterDate={setFilterDate}
        selectedEvents={selectedEvents} setSelectedEvents={handleSelectAllChange}
        handleBulkDelete={() => onBulkDelete(selectedEvents, setSelectedEvents)}
        handleBulkStatusChange={(action) => onBulkStatusChange(action, selectedEvents, setSelectedEvents)}
        filteredCount={filteredEvents.length}
        categories={categories}
        canPublish={canPublish}
        darkMode={darkMode}
        ui={ui}
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem' }}>
        {filteredEvents.map((event) => (
          <div key={event.id} style={{ background: ui.panel, borderRadius: '0.75rem', border: `1px solid ${ui.border}`, overflow: 'hidden' }}>
            {event.imageUrl && (
              <img src={event.imageUrl} alt={event.title} style={{ width: '100%', height: '180px', objectFit: 'cover' }} />
            )}
            <div style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.75rem', gap: '0.6rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.25rem', color: ui.textPrimary, flex: 1 }}>{event.title}</h3>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                  <input type="checkbox" checked={selectedEvents.includes(String(event.id))} onChange={() => handleSelectEvent(String(event.id))} />
                  <span style={{ padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600, background: `${getCategoryColor(event.category, ui)}20`, color: getCategoryColor(event.category, ui) }}>
                    {formatCategoryLabel(event.category)}
                  </span>
                </div>
              </div>

              <div style={{ marginBottom: '0.6rem' }}>
                <span style={{ display: 'inline-block', padding: '0.2rem 0.55rem', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em', background: event.status === 'published' ? '#dcfce7' : event.status === 'pending_review' ? '#fef3c7' : event.status === 'approved' ? '#dbeafe' : event.status === 'scheduled' ? '#ede9fe' : '#e5e7eb', color: event.status === 'published' ? '#166534' : event.status === 'pending_review' ? '#92400e' : event.status === 'approved' ? '#1e3a8a' : event.status === 'scheduled' ? '#5b21b6' : '#374151' }}>
                  {String(event.status || 'draft').replace('_', ' ')}
                </span>
              </div>

              <p style={{ margin: '0 0 1rem', fontSize: '0.875rem', color: ui.textSecondary, lineHeight: '1.5' }}>
                {event.description.substring(0, 100)}...
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: ui.textSecondary }}>
                  <Calendar size={16} />
                  {new Date(event.date).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: ui.textSecondary }}>
                  <Clock size={16} />{event.time}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: ui.textSecondary }}>
                  <MapPin size={16} />{event.location}
                </div>
                {event.capacity && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: ui.textSecondary }}>
                    <Users size={16} />Max {event.capacity} attendees
                  </div>
                )}
                {Array.isArray(event.whatToExpect) && event.whatToExpect.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                    {event.whatToExpect.map((tag) => (
                      <code key={`${event.id}-${tag}`} style={{ background: ui.panelSubtle, color: ui.textMuted, borderRadius: '0.3rem', padding: '0.2rem 0.45rem', fontSize: '0.72rem' }}>
                        {tag}
                      </code>
                    ))}
                  </div>
                )}
                <div style={{ fontSize: '0.75rem', color: ui.textFaint }}>Last updated: {formatStamp(event.updatedAt || event.createdAt)}</div>
                {event.scheduledPublishAt ? (
                  <div style={{ fontSize: '0.75rem', color: ui.textFaint }}>Scheduled publish: {formatStamp(event.scheduledPublishAt)}</div>
                ) : null}
              </div>

              {(() => { const rb = canWrite && Array.isArray(event.versions) && event.versions.length > 0; return (
              <div style={{ display: 'flex', gap: '0.5rem', borderTop: `1px solid ${ui.border}`, paddingTop: '1rem', flexWrap: 'wrap' }}>
                <button onClick={() => onEdit(event)} disabled={!canWrite} style={btnStyleCentered(ui.panelSubtle, ui.textMuted, canWrite)}><Edit2 size={14} />Edit</button>
                {event.status === 'draft' && <button onClick={() => onSubmitForReview(event)} disabled={!canWrite} style={btnStyle(ui.panelSubtle, ui.textMuted, canWrite)}>Review</button>}
                {event.status === 'pending_review' && canApprove && <button onClick={() => onApprove(event)} style={btnStyle('#dbeafe', '#1d4ed8', true)}>Approve</button>}
                {canPublish && <><button onClick={() => onPublish(event)} style={btnStyle('#dcfce7', '#166534', true)}>Publish</button><button onClick={() => onSchedule(event)} style={btnStyle('#ede9fe', '#5b21b6', true)}>Schedule</button></>}
                <button onClick={() => onRollback(event)} disabled={!rb} style={{ ...btnStyle(ui.panelSubtle, ui.textMuted, rb), opacity: rb ? 1 : 0.55 }}>Rollback</button>
                <button onClick={() => onDelete(event.id)} disabled={!canWrite} style={btnStyleCentered('#fee2e2', '#991b1b', canWrite)}><Trash2 size={14} />Delete</button>
              </div>); })()}
            </div>
          </div>
        ))}
      </div>

      {filteredEvents.length === 0 && (
        <div style={{ background: ui.panel, padding: '3rem', borderRadius: '0.75rem', border: `1px solid ${ui.border}`, textAlign: 'center' }}>
          <Calendar size={48} style={{ margin: '0 auto 1rem', color: ui.borderSoft }} />
          <p style={{ margin: 0, color: ui.textFaint }}>
            {isLoading
              ? 'Loading events from the shared bot service...'
              : searchTerm || filterCategory !== 'all' || filterStatus !== 'all' || filterDate !== 'all'
              ? 'No events match your current filters'
              : 'No events yet. Create your first event!'}
          </p>
        </div>
      )}
    </div>
  )
}
