import { useCallback, useEffect, useState } from 'react'
import {
  AlertTriangle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Download,
  Filter,
  Loader2,
  RefreshCw,
  ScrollText
} from 'lucide-react'
import { DropdownSelect } from '../../../components/common'
import { useAdminTheme } from '../AdminThemeContext'
import { fetchAdminAuditLog } from '../../../utils/adminApi'

const ROLE_META = {
  super_admin: { label: 'Super Admin', color: '#7c3aed', bg: '#ede9fe', darkBg: '#2d1f5e', darkColor: '#c4b5fd' },
  editor: { label: 'Editor', color: '#0369a1', bg: '#e0f2fe', darkBg: '#0c2f4a', darkColor: '#7dd3fc' },
  reviewer: { label: 'Reviewer', color: '#065f46', bg: '#d1fae5', darkBg: '#083127', darkColor: '#6ee7b7' }
}

const ACTION_OPTIONS = [
  '', 'auth.login', 'auth.logout', 'auth.password_changed', 'auth.password_reset_requested',
  'auth.password_reset_confirmed', 'auth.2fa_setup_started', 'auth.2fa_enabled', 'auth.2fa_disabled',
  'admin.user_created', 'admin.user_updated', 'admin.user_deleted'
]

const RESOURCE_OPTIONS = ['', 'admin.auth', 'admin.users']

const DATE_PRESETS = [
  { label: 'All time', value: '' },
  { label: 'Today', value: () => new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() },
  { label: 'Last 7 days', value: () => new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() },
  { label: 'Last 30 days', value: () => new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() }
]

const PAGE_SIZE = 50

const RoleBadge = ({ role, darkMode }) => {
  if (!role) return null
  const meta = ROLE_META[role] || { label: role, color: '#6b7280', bg: '#f3f4f6', darkBg: '#1f2937', darkColor: '#d1d5db' }
  return (
    <span style={{
      fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.03em', textTransform: 'uppercase',
      padding: '0.15rem 0.45rem', borderRadius: '9999px',
      background: darkMode ? meta.darkBg : meta.bg,
      color: darkMode ? meta.darkColor : meta.color
    }}>
      {meta.label}
    </span>
  )
}

const ActionBadge = ({ action }) => {
  const isError = action.includes('failed') || action.includes('delete')
  const isAuth = action.startsWith('auth.')
  const color = isError ? '#dc2626' : isAuth ? '#0369a1' : '#059669'
  const bg = isError ? '#fef2f2' : isAuth ? '#eff6ff' : '#ecfdf5'
  return (
    <span style={{
      fontSize: '0.72rem', fontWeight: 600, padding: '0.2rem 0.55rem', borderRadius: '0.35rem',
      background: bg, color, fontFamily: 'monospace', whiteSpace: 'nowrap'
    }}>
      {action}
    </span>
  )
}

const csvEscape = (val) => {
  const raw = String(val ?? '')
  if (!/[",\n\r]/.test(raw)) return raw
  return `"${raw.replace(/"/g, '""')}"`
}

const exportCsv = (records) => {
  const headers = ['timestamp', 'actor', 'role', 'action', 'resource', 'ip', 'details']
  const rows = records.map((r) => [
    r.createdAt,
    r.actorEmail || '',
    r.actorRole || '',
    r.action,
    r.resource,
    r.ip || '',
    JSON.stringify(r.details || {})
  ].map(csvEscape).join(','))

  const csv = [headers.join(','), ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

const AuditLog = ({ hasPermission = () => false }) => {
  const { darkMode } = useAdminTheme()

  const panelBg = darkMode ? '#1a2235' : '#ffffff'
  const panelBorder = darkMode ? '#2a3550' : '#e5e7eb'
  const inputBg = darkMode ? '#131b2e' : '#ffffff'
  const textPrimary = darkMode ? '#e2e8f0' : '#111827'
  const textSecondary = darkMode ? '#7f93b3' : '#6b7280'
  const subtleSurface = darkMode ? '#222c40' : '#f9fafb'
  const codeBlockBg = darkMode ? '#101828' : '#f0f4ff'
  const canDownload = hasPermission('audit:export') // Audit CSV is super_admin only

  const [records, setRecords] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(0)
  const [expandedId, setExpandedId] = useState(null)
  const [filters, setFilters] = useState({
    action: '',
    resource: '',
    actorEmail: '',
    datePreset: ''
  })

  const load = useCallback(async (currentFilters = filters, currentPage = page) => {
    setLoading(true)
    setError('')
    try {
      const since = currentFilters.datePreset
        ? (typeof currentFilters.datePreset === 'function' ? currentFilters.datePreset() : currentFilters.datePreset)
        : ''

      const result = await fetchAdminAuditLog({
        action: currentFilters.action,
        resource: currentFilters.resource,
        actorEmail: currentFilters.actorEmail,
        since,
        limit: PAGE_SIZE,
        offset: currentPage * PAGE_SIZE
      })
      setRecords(result?.records || [])
      setTotal(result?.total ?? result?.count ?? 0)
    } catch (err) {
      setError(err?.message || 'Failed to load audit log.')
    } finally {
      setLoading(false)
    }
  }, [filters, page])

  useEffect(() => { void load() }, [])

  const applyFilters = () => {
    setPage(0)
    void load(filters, 0)
  }

  const handleReset = () => {
    const reset = { action: '', resource: '', actorEmail: '', datePreset: '' }
    setFilters(reset)
    setPage(0)
    void load(reset, 0)
  }

  const handlePageChange = (newPage) => {
    setPage(newPage)
    void load(filters, newPage)
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const formatTs = (iso) => {
    if (!iso) return '—'
    return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'medium' })
  }

  const inputStyle = {
    padding: '0.55rem 0.75rem', border: `1px solid ${panelBorder}`, borderRadius: '0.5rem',
    fontSize: '0.875rem', background: inputBg, color: textPrimary, minWidth: '0', width: '100%'
  }

  const btnBase = {
    display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
    padding: '0.55rem 0.9rem', borderRadius: '0.5rem', fontSize: '0.875rem',
    fontWeight: 600, border: 'none', cursor: 'pointer'
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700, color: textPrimary, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ScrollText size={20} style={{ color: '#5a4494' }} /> Audit Log
          </h2>
          <p style={{ margin: '0.2rem 0 0', fontSize: '0.875rem', color: textSecondary }}>
            {loading ? 'Loading…' : `${total} matching entr${total !== 1 ? 'ies' : 'y'}`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => void load()}
            style={{ ...btnBase, background: subtleSurface, color: textSecondary }}
            disabled={loading}
          >
            <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => exportCsv(records)}
            disabled={records.length === 0 || !canDownload}
            style={{ 
              ...btnBase, 
              background: '#10b981', 
              color: '#fff', 
              opacity: (records.length === 0 || !canDownload) ? 0.5 : 1,
              cursor: canDownload ? 'pointer' : 'not-allowed'
            }}
          >
            <Download size={14} />
            Export CSV
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div style={{ background: panelBg, border: `1px solid ${panelBorder}`, borderRadius: '0.75rem', padding: '1rem 1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', fontSize: '0.875rem', fontWeight: 700, color: textPrimary }}>
          <Filter size={15} style={{ color: '#5a4494' }} /> Filters
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.65rem' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: textSecondary }}>Action</span>
            <DropdownSelect
              value={filters.action}
              onChange={(e) => setFilters((p) => ({ ...p, action: e.target.value }))}
              style={inputStyle}
            >
              {ACTION_OPTIONS.map((a) => (
                <option key={a} value={a}>{a || 'All actions'}</option>
              ))}
            </DropdownSelect>
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: textSecondary }}>Resource</span>
            <DropdownSelect
              value={filters.resource}
              onChange={(e) => setFilters((p) => ({ ...p, resource: e.target.value }))}
              style={inputStyle}
            >
              {RESOURCE_OPTIONS.map((r) => (
                <option key={r} value={r}>{r || 'All resources'}</option>
              ))}
            </DropdownSelect>
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: textSecondary }}>Actor email</span>
            <input
              type="text"
              placeholder="Search email…"
              value={filters.actorEmail}
              onChange={(e) => setFilters((p) => ({ ...p, actorEmail: e.target.value }))}
              style={inputStyle}
            />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: textSecondary }}>Time range</span>
            <DropdownSelect
              value={typeof filters.datePreset === 'function' ? filters.datePreset() : (filters.datePreset || '')}
              onChange={(e) => {
                const preset = DATE_PRESETS.find((p) => {
                  const v = typeof p.value === 'function' ? p.value() : p.value
                  return v === e.target.value
                })
                setFilters((prev) => ({ ...prev, datePreset: preset?.value ?? '' }))
              }}
              style={inputStyle}
            >
              {DATE_PRESETS.map((p) => {
                const v = typeof p.value === 'function' ? p.value() : p.value
                return <option key={p.label} value={v}>{p.label}</option>
              })}
            </DropdownSelect>
          </label>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', justifyContent: 'flex-end' }}>
          <button type="button" onClick={handleReset} style={{ ...btnBase, background: subtleSurface, color: textSecondary, fontSize: '0.8rem' }}>
            Reset
          </button>
          <button type="button" onClick={applyFilters} style={{ ...btnBase, background: '#5a4494', color: '#fff', fontSize: '0.8rem' }}>
            Apply Filters
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1rem', borderRadius: '0.5rem', background: darkMode ? '#3b0c0c' : '#fef2f2', color: darkMode ? '#fca5a5' : '#991b1b', fontSize: '0.875rem' }}>
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      {/* Table */}
      <div style={{ background: panelBg, border: `1px solid ${panelBorder}`, borderRadius: '0.75rem', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '2rem', color: textSecondary }}>
            <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
            Loading audit entries…
          </div>
        ) : records.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: textSecondary, fontSize: '0.9rem' }}>
            No audit log entries match your filters.
          </div>
        ) : (
          records.map((entry, idx) => {
            const isExpanded = expandedId === entry.id
            const hasDetails = entry.details && Object.keys(entry.details).length > 0

            return (
              <div
                key={entry.id}
                style={{
                  borderBottom: idx < records.length - 1 ? `1px solid ${panelBorder}` : 'none',
                  background: idx % 2 === 0 ? 'transparent' : subtleSurface
                }}
              >
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '180px 1fr auto auto auto auto',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.7rem 1rem',
                    cursor: hasDetails ? 'pointer' : 'default',
                    transition: 'background 0.1s'
                  }}
                  onClick={() => hasDetails && setExpandedId((v) => v === entry.id ? null : entry.id)}
                >
                  {/* Timestamp */}
                  <span style={{ fontSize: '0.75rem', color: textSecondary, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                    {formatTs(entry.createdAt)}
                  </span>

                  {/* Actor */}
                  <div style={{ minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: '0.82rem', fontWeight: 600, color: textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {entry.actorEmail || <span style={{ color: textSecondary, fontStyle: 'italic' }}>system</span>}
                    </p>
                    {entry.actorRole && <RoleBadge role={entry.actorRole} darkMode={darkMode} />}
                  </div>

                  {/* Action */}
                  <ActionBadge action={entry.action} />

                  {/* Resource */}
                  <span style={{ fontSize: '0.72rem', color: textSecondary, fontFamily: 'monospace' }}>
                    {entry.resource}
                  </span>

                  {/* IP */}
                  <span style={{ fontSize: '0.7rem', color: textSecondary, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                    {entry.ip || '—'}
                  </span>

                  {/* Expand toggle */}
                  {hasDetails ? (
                    isExpanded ? <ChevronUp size={14} style={{ color: textSecondary, flexShrink: 0 }} /> : <ChevronDown size={14} style={{ color: textSecondary, flexShrink: 0 }} />
                  ) : <span style={{ width: 14 }} />}
                </div>

                {/* Expanded details */}
                {isExpanded && hasDetails && (
                  <div style={{ padding: '0 1rem 0.75rem 1rem' }}>
                    <pre style={{
                      margin: 0, padding: '0.75rem 1rem', borderRadius: '0.5rem',
                      background: codeBlockBg, color: textPrimary,
                      fontSize: '0.75rem', overflowX: 'auto', whiteSpace: 'pre-wrap',
                      wordBreak: 'break-all', fontFamily: 'monospace',
                      border: `1px solid ${panelBorder}`
                    }}>
                      {JSON.stringify(entry.details, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => handlePageChange(page - 1)}
            disabled={page <= 0}
            style={{ ...btnBase, padding: '0.45rem 0.75rem', background: subtleSurface, color: textSecondary, opacity: page <= 0 ? 0.4 : 1 }}
          >
            <ChevronLeft size={15} />
          </button>
          <span style={{ fontSize: '0.875rem', color: textSecondary }}>
            Page {page + 1} of {totalPages} &nbsp;·&nbsp; {total} entries
          </span>
          <button
            type="button"
            onClick={() => handlePageChange(page + 1)}
            disabled={page >= totalPages - 1}
            style={{ ...btnBase, padding: '0.45rem 0.75rem', background: subtleSurface, color: textSecondary, opacity: page >= totalPages - 1 ? 0.4 : 1 }}
          >
            <ChevronRight size={15} />
          </button>
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

export default AuditLog
