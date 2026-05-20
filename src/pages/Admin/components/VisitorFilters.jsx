import { Search, UserPlus, UserX } from 'lucide-react'
import { DropdownSelect } from '../../../components/common'
import { ADMIN_DATE_FILTER_OPTIONS } from '../../../utils/adminDateFilters'

export default function VisitorFilters({
  searchTerm,
  setSearchTerm,
  filterStatus,
  setFilterStatus,
  filterDate,
  setFilterDate,
  selectedVisitors,
  onBulkSubscribe,
  onBulkUnsubscribe,
  isSaving,
  darkMode,
  ui
}) {
  return (
    <div style={{ background: ui.panel, padding: '1.5rem', borderRadius: '0.75rem', border: `1px solid ${ui.border}`, marginBottom: '1.5rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) repeat(2, minmax(0, 1fr))', gap: '1rem', marginBottom: '1rem', alignItems: 'stretch' }}>
        <div style={{ minWidth: 0, position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: ui.textFaint }} />
          <input
            type="text"
            placeholder="Search by name, phone, or email..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            style={{ width: '100%', padding: '0.75rem 0.75rem 0.75rem 2.5rem', border: `1px solid ${ui.borderSoft}`, borderRadius: '0.5rem', fontSize: '0.875rem' }}
          />
        </div>
        <DropdownSelect
          value={filterStatus}
          onChange={(event) => setFilterStatus(event.target.value)}
          style={{ padding: '0.75rem', border: `1px solid ${ui.borderSoft}`, borderRadius: '0.5rem', fontSize: '0.875rem', background: ui.panel }}
        >
          <option value="all">All Visitors</option>
          <option value="subscribed">Subscribed</option>
          <option value="unsubscribed">Unsubscribed</option>
        </DropdownSelect>
        <DropdownSelect
          value={filterDate}
          onChange={(event) => setFilterDate(event.target.value)}
          style={{ padding: '0.75rem', border: `1px solid ${ui.borderSoft}`, borderRadius: '0.5rem', fontSize: '0.875rem', background: ui.panel }}
        >
          {ADMIN_DATE_FILTER_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </DropdownSelect>
      </div>

      {selectedVisitors.length > 0 && (
        <div style={{ padding: '0.75rem 1rem', background: ui.panelSubtle, borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          <span style={{ fontSize: '0.875rem', color: ui.textMuted, fontWeight: 600 }}>
            {selectedVisitors.length} selected
          </span>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              onClick={() => void onBulkSubscribe()}
              disabled={isSaving}
              style={{ padding: '0.5rem 1rem', background: '#10b981', color: 'white', border: 'none', borderRadius: '0.375rem', fontSize: '0.75rem', fontWeight: 600, cursor: isSaving ? 'not-allowed' : 'pointer', opacity: isSaving ? 0.7 : 1 }}
            >
              <UserPlus size={14} style={{ display: 'inline', marginRight: '0.25rem' }} />
              Subscribe
            </button>
            <button
              onClick={() => void onBulkUnsubscribe()}
              disabled={isSaving}
              style={{ padding: '0.5rem 1rem', background: '#ef4444', color: 'white', border: 'none', borderRadius: '0.375rem', fontSize: '0.75rem', fontWeight: 600, cursor: isSaving ? 'not-allowed' : 'pointer', opacity: isSaving ? 0.7 : 1 }}
            >
              <UserX size={14} style={{ display: 'inline', marginRight: '0.25rem' }} />
              Unsubscribe
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
