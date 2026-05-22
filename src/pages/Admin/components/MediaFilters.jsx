import { Search } from 'lucide-react'
import { MEDIA_CATEGORIES } from '../../../utils/mediaStorage'
import { ADMIN_DATE_FILTER_OPTIONS } from '../../../utils/adminDateFilters'
import { DropdownSelect } from '../../../components/common'

export default function MediaFilters({
  searchTerm,
  setSearchTerm,
  filterCategory,
  setFilterCategory,
  filterType,
  setFilterType,
  filterDate,
  setFilterDate,
  selectedItems,
  filteredCount,
  onBulkDelete,
  onBulkCategoryChange,
  onSelectAll,
  darkMode,
  ui
}) {
  return (
    <div style={{ background: ui.panel, padding: '1rem', borderRadius: '0.75rem', border: `1px solid ${ui.border}`, marginBottom: '1rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2.2fr) repeat(3, minmax(0, 1fr))', gap: '0.75rem', alignItems: 'stretch' }}>
        <div style={{ position: 'relative', minWidth: 0 }}>
          <Search size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: ui.textFaint }} />
          <input
            type="text"
            placeholder="Search title, description, speaker..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            style={{ width: '100%', padding: '0.75rem 0.75rem 0.75rem 2.5rem', border: `1px solid ${ui.borderSoft}`, borderRadius: '0.5rem', fontSize: '0.875rem' }}
          />
        </div>

        <DropdownSelect value={filterType} onChange={(event) => setFilterType(event.target.value)}
          style={{ minWidth: 0, padding: '0.75rem', border: `1px solid ${ui.borderSoft}`, borderRadius: '0.5rem', fontSize: '0.875rem' }}>
          <option value="all">All Types</option>
          <option value="image">Image</option>
          <option value="video">Video</option>
          <option value="audio">Audio</option>
        </DropdownSelect>

        <DropdownSelect value={filterCategory} onChange={(event) => setFilterCategory(event.target.value)}
          style={{ minWidth: 0, padding: '0.75rem', border: `1px solid ${ui.borderSoft}`, borderRadius: '0.5rem', fontSize: '0.875rem' }}>
          <option value="all">All Categories</option>
          {MEDIA_CATEGORIES.map((category) => (
            <option key={category.value} value={category.value}>{category.label}</option>
          ))}
        </DropdownSelect>

        <DropdownSelect value={filterDate} onChange={(event) => setFilterDate(event.target.value)}
          style={{ minWidth: 0, padding: '0.75rem', border: `1px solid ${ui.borderSoft}`, borderRadius: '0.5rem', fontSize: '0.875rem' }}>
          {ADMIN_DATE_FILTER_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </DropdownSelect>
      </div>

      {filteredCount > 0 && (
        <div style={{ marginTop: '0.8rem', display: 'flex', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', fontWeight: 600, color: ui.textMuted }}>
            <input
              type="checkbox"
              checked={selectedItems.length > 0 && selectedItems.length === filteredCount}
              onChange={(event) => onSelectAll(event.target.checked)}
            />
            Select all filtered media
          </label>

          {selectedItems.length > 0 && (
            <div style={{ display: 'inline-flex', gap: '0.45rem', flexWrap: 'wrap' }}>
              <button type="button" onClick={onBulkCategoryChange}
                style={{ padding: '0.45rem 0.7rem', borderRadius: '0.4rem', border: `1px solid ${ui.borderSoft}`, background: ui.panel, color: ui.textMuted, fontWeight: 600, cursor: 'pointer' }}>
                Set Category
              </button>
              <button type="button" onClick={onBulkDelete}
                style={{ padding: '0.45rem 0.7rem', borderRadius: '0.4rem', border: 'none', background: '#ef4444', color: 'white', fontWeight: 700, cursor: 'pointer' }}>
                Delete
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
