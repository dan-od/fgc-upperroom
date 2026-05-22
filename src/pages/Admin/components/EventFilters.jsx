import { Search } from 'lucide-react'
import { DropdownSelect } from '../../../components/common'
import { ADMIN_DATE_FILTER_OPTIONS } from '../../../utils/adminDateFilters'
import { formatCategoryLabel, EVENT_WORKFLOW_STATUSES } from './eventManagerUtils'

export default function EventFilters({
  searchTerm,
  setSearchTerm,
  filterCategory,
  setFilterCategory,
  filterStatus,
  setFilterStatus,
  filterDate,
  setFilterDate,
  selectedEvents,
  setSelectedEvents,
  handleBulkDelete,
  handleBulkStatusChange,
  filteredCount,
  categories,
  canPublish,
  darkMode,
  ui
}) {
  return (
    <div style={{
      background: ui.panel,
      padding: '1.5rem',
      borderRadius: '0.75rem',
      border: `1px solid ${ui.border}`,
      marginBottom: '1.5rem'
    }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2.2fr) repeat(3, minmax(0, 1fr))', gap: '1rem', alignItems: 'stretch' }}>
        <div style={{ minWidth: 0, position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: ui.textFaint }} />
          <input
            type="text"
            placeholder="Search events..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem 0.75rem 0.75rem 2.5rem',
              border: `1px solid ${ui.borderSoft}`,
              borderRadius: '0.5rem',
              fontSize: '0.875rem'
            }}
          />
        </div>
        <DropdownSelect
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          style={{ padding: '0.75rem', border: `1px solid ${ui.borderSoft}`, borderRadius: '0.5rem', fontSize: '0.875rem', background: ui.panel }}
        >
          <option value="all">All Categories</option>
          {categories.map((category) => (
            <option key={category} value={category}>{formatCategoryLabel(category)}</option>
          ))}
        </DropdownSelect>
        <DropdownSelect
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={{ padding: '0.75rem', border: `1px solid ${ui.borderSoft}`, borderRadius: '0.5rem', fontSize: '0.875rem', background: ui.panel }}
        >
          <option value="all">All Status</option>
          {EVENT_WORKFLOW_STATUSES.map((status) => (
            <option key={status.value} value={status.value}>{status.label}</option>
          ))}
        </DropdownSelect>
        <DropdownSelect
          value={filterDate}
          onChange={(e) => setFilterDate(e.target.value)}
          style={{ padding: '0.75rem', border: `1px solid ${ui.borderSoft}`, borderRadius: '0.5rem', fontSize: '0.875rem', background: ui.panel }}
        >
          {ADMIN_DATE_FILTER_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </DropdownSelect>
      </div>

      {filteredCount > 0 && (
        <div style={{ marginTop: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: ui.textMuted, fontWeight: 600 }}>
            <input
              type="checkbox"
              checked={selectedEvents.length > 0 && selectedEvents.length === filteredCount}
              onChange={(e) => {
                if (!e.target.checked) { setSelectedEvents([]); return }
                // caller provides filteredEvents — signal via a custom handler
                setSelectedEvents('__select_all__')
              }}
            />
            Select all filtered events
          </label>
          {selectedEvents.length > 0 && (
            <div style={{ display: 'inline-flex', gap: '0.45rem', flexWrap: 'wrap' }}>
              <button type="button" onClick={() => handleBulkStatusChange('draft')} style={{ padding: '0.45rem 0.7rem', borderRadius: '0.4rem', border: `1px solid ${ui.borderSoft}`, background: ui.panel, color: ui.textMuted, fontWeight: 600, cursor: 'pointer' }}>Draft</button>
              <button type="button" onClick={() => handleBulkStatusChange('review')} style={{ padding: '0.45rem 0.7rem', borderRadius: '0.4rem', border: `1px solid ${ui.borderSoft}`, background: ui.panel, color: ui.textMuted, fontWeight: 600, cursor: 'pointer' }}>Review</button>
              {canPublish && (
                <button type="button" onClick={() => handleBulkStatusChange('publish')} style={{ padding: '0.45rem 0.7rem', borderRadius: '0.4rem', border: 'none', background: '#10b981', color: 'white', fontWeight: 700, cursor: 'pointer' }}>Publish</button>
              )}
              <button type="button" onClick={handleBulkDelete} style={{ padding: '0.45rem 0.7rem', borderRadius: '0.4rem', border: 'none', background: '#ef4444', color: 'white', fontWeight: 700, cursor: 'pointer' }}>Delete</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
