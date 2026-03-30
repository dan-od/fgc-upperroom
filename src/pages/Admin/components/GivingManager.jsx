import { useCallback, useEffect, useMemo, useState } from 'react'
import { Download, Search, RefreshCw, Clock, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react'
import { DropdownSelect } from '../../../components/common'
import { ADMIN_DATE_FILTER_OPTIONS, resolveAdminDateFilterSince } from '../../../utils/adminDateFilters'
import { useAdminTheme } from '../AdminThemeContext'
import { downloadAdminGivingCsv, fetchAdminGiving, fetchAdminGivingByReference } from '../../../utils/adminApi'

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'success', label: 'Success' },
  { value: 'failed', label: 'Failed' },
  { value: 'abandoned', label: 'Abandoned' }
]

const FUND_OPTIONS = [
  { value: '', label: 'All funds' },
  { value: 'general', label: 'General Giving' },
  { value: 'tithe', label: 'Tithe' },
  { value: 'sunday-offering', label: 'Sunday Offering' },
  { value: 'building', label: 'Building Project' },
  { value: 'welfare', label: 'Welfare' }
]

const statusTone = (status) => {
  const normalized = String(status || '').toLowerCase()
  if (normalized === 'success') return { color: '#166534', background: '#dcfce7', border: '#86efac', icon: CheckCircle2 }
  if (normalized === 'failed') return { color: '#991b1b', background: '#fee2e2', border: '#fca5a5', icon: XCircle }
  if (normalized === 'abandoned') return { color: '#92400e', background: '#fef3c7', border: '#fcd34d', icon: AlertTriangle }
  return { color: '#1e3a8a', background: '#dbeafe', border: '#93c5fd', icon: Clock }
}

const formatCurrency = (amountNaira, currency = 'NGN') => {
  const value = Number(amountNaira)
  if (!Number.isFinite(value)) return '--'
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: String(currency || 'NGN').toUpperCase(),
    maximumFractionDigits: 2
  }).format(value)
}

const formatDateTime = (value) => {
  const date = new Date(String(value || ''))
  if (Number.isNaN(date.getTime())) return '--'
  return date.toLocaleString()
}

const GivingManager = ({ hasPermission = () => false }) => {
  const { darkMode } = useAdminTheme()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [rows, setRows] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState({ status: '', fund: '', q: '', dateRange: 'all' })
  const [selected, setSelected] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const limit = 25
  const canDownload = hasPermission('giving:export')

  const load = useCallback(async ({ silent = false } = {}) => {
    if (silent) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }
    setError('')

    try {
      const payload = await fetchAdminGiving({ ...filters, since: resolveAdminDateFilterSince(filters.dateRange), page, limit })
      setRows(Array.isArray(payload?.data) ? payload.data : [])
      setTotal(Number(payload?.total) || 0)
    } catch (err) {
      setError(err?.message || 'Unable to load giving records.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [filters, page])

  useEffect(() => {
    void load({ silent: false })
  }, [load])

  const openDetails = async (reference) => {
    setDetailLoading(true)
    try {
      const payload = await fetchAdminGivingByReference(reference)
      setSelected(payload?.data || null)
    } catch {
      setSelected(null)
    } finally {
      setDetailLoading(false)
    }
  }

  const handleDownload = async () => {
    try {
      const exported = await downloadAdminGivingCsv({ ...filters, since: resolveAdminDateFilterSince(filters.dateRange) })
      const blob = new Blob([exported.content], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = exported.fileName
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err?.message || 'Unable to export CSV right now.')
    }
  }

  const maxPage = useMemo(() => Math.max(1, Math.ceil(total / limit)), [total])
  const surface = darkMode ? '#151e2e' : '#ffffff'
  const panel = darkMode ? '#1a2235' : '#f9fafb'
  const border = darkMode ? '#2a3550' : '#dbe2ea'
  const text = darkMode ? '#e2e8f0' : '#0f172a'
  const subtext = darkMode ? '#94a3b8' : '#475569'

  return (
    <div style={{ display: 'grid', gap: '1rem' }}>
      <section
        style={{
          display: 'grid',
          gap: '0.85rem',
          gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
          padding: '1rem',
          border: `1px solid ${border}`,
          borderRadius: '0.75rem',
          background: surface
        }}
      >
        <label style={{ display: 'grid', gap: '0.35rem', color: subtext, fontSize: '0.82rem', minWidth: 0 }}>
          Status
          <DropdownSelect
            value={filters.status}
            onChange={(event) => {
              setPage(1)
              setFilters((prev) => ({ ...prev, status: event.target.value }))
            }}
            style={{ border: `1px solid ${border}`, borderRadius: '0.55rem', padding: '0.55rem', background: panel, color: text }}
          >
            {STATUS_OPTIONS.map((item) => (
              <option key={item.value || 'all'} value={item.value}>{item.label}</option>
            ))}
          </DropdownSelect>
        </label>

        <label style={{ display: 'grid', gap: '0.35rem', color: subtext, fontSize: '0.82rem', minWidth: 0 }}>
          Fund
          <DropdownSelect
            value={filters.fund}
            onChange={(event) => {
              setPage(1)
              setFilters((prev) => ({ ...prev, fund: event.target.value }))
            }}
            style={{ border: `1px solid ${border}`, borderRadius: '0.55rem', padding: '0.55rem', background: panel, color: text }}
          >
            {FUND_OPTIONS.map((item) => (
              <option key={item.value || 'all'} value={item.value}>{item.label}</option>
            ))}
          </DropdownSelect>
        </label>

        <label style={{ display: 'grid', gap: '0.35rem', color: subtext, fontSize: '0.82rem', minWidth: 0 }}>
          Search
          <span style={{ display: 'flex', alignItems: 'center', border: `1px solid ${border}`, borderRadius: '0.55rem', background: panel, padding: '0 0.55rem' }}>
            <Search size={14} color={subtext} />
            <input
              type="text"
              value={filters.q}
              onChange={(event) => {
                setPage(1)
                setFilters((prev) => ({ ...prev, q: event.target.value }))
              }}
              placeholder="Reference, donor, email"
              style={{ border: 0, outline: 'none', background: 'transparent', color: text, width: '100%', minWidth: 0, padding: '0.55rem' }}
            />
          </span>
        </label>

        <label style={{ display: 'grid', gap: '0.35rem', color: subtext, fontSize: '0.82rem', minWidth: 0 }}>
          Date range
          <DropdownSelect
            value={filters.dateRange}
            onChange={(event) => {
              setPage(1)
              setFilters((prev) => ({ ...prev, dateRange: event.target.value }))
            }}
            style={{ border: `1px solid ${border}`, borderRadius: '0.55rem', padding: '0.55rem', background: panel, color: text }}
          >
            {ADMIN_DATE_FILTER_OPTIONS.map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </DropdownSelect>
        </label>

        <div style={{ display: 'flex', alignItems: 'end', gap: '0.6rem', flexWrap: 'nowrap', minWidth: 'fit-content' }}>
          <button
            type="button"
            onClick={() => void load({ silent: true })}
            style={{
              border: `1px solid ${border}`,
              background: panel,
              color: text,
              borderRadius: '0.55rem',
              padding: '0.55rem 0.7rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              whiteSpace: 'nowrap'
            }}
          >
            <RefreshCw size={14} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
          <button
            type="button"
            onClick={handleDownload}
            disabled={!canDownload}
            style={{
              border: `1px solid ${border}`,
              background: '#0f172a',
              color: '#f8fafc',
              borderRadius: '0.55rem',
              padding: '0.55rem 0.7rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              whiteSpace: 'nowrap',
              cursor: canDownload ? 'pointer' : 'not-allowed',
              opacity: canDownload ? 1 : 0.6
            }}
          >
            <Download size={14} />
            Export CSV
          </button>
        </div>
      </section>

      {error ? (
        <section style={{ border: '1px solid #fca5a5', borderRadius: '0.75rem', background: '#fef2f2', color: '#991b1b', padding: '0.9rem 1rem' }}>
          {error}
        </section>
      ) : null}

      <section style={{ border: `1px solid ${border}`, borderRadius: '0.75rem', background: surface, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '920px' }}>
            <thead>
              <tr style={{ background: panel, color: subtext, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                <th style={{ textAlign: 'left', padding: '0.8rem' }}>S/N</th>
                <th style={{ textAlign: 'left', padding: '0.8rem' }}>Reference</th>
                <th style={{ textAlign: 'left', padding: '0.8rem' }}>Donor</th>
                <th style={{ textAlign: 'left', padding: '0.8rem' }}>Fund</th>
                <th style={{ textAlign: 'left', padding: '0.8rem' }}>Amount</th>
                <th style={{ textAlign: 'left', padding: '0.8rem' }}>Status</th>
                <th style={{ textAlign: 'left', padding: '0.8rem' }}>Updated</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ padding: '1rem', color: subtext }}>Loading giving records...</td>
                </tr>
              ) : null}

              {!loading && rows.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '1rem', color: subtext }}>No transactions found for current filters.</td>
                </tr>
              ) : null}

              {!loading && rows.map((item, index) => {
                const tone = statusTone(item.status)
                const StatusIcon = tone.icon
                return (
                  <tr key={item.reference} onClick={() => void openDetails(item.reference)} style={{ borderTop: `1px solid ${border}`, cursor: 'pointer' }}>
                    <td style={{ padding: '0.85rem', color: subtext, fontSize: '0.82rem', fontWeight: 700 }}>
                      {(page - 1) * limit + index + 1}
                    </td>
                    <td style={{ padding: '0.85rem', color: text, fontFamily: 'monospace', fontSize: '0.8rem' }}>{item.reference}</td>
                    <td style={{ padding: '0.85rem', color: text }}>
                      <div style={{ fontWeight: 600 }}>{item.donorName || '--'}</div>
                      <small style={{ color: subtext }}>{item.donorEmail || '--'}</small>
                    </td>
                    <td style={{ padding: '0.85rem', color: text }}>{String(item.fund || '--').replace(/-/g, ' ')}</td>
                    <td style={{ padding: '0.85rem', color: text, fontWeight: 600 }}>{formatCurrency(item.amountNaira, item.currency)}</td>
                    <td style={{ padding: '0.85rem' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          borderRadius: '999px',
                          padding: '0.2rem 0.5rem',
                          border: `1px solid ${tone.border}`,
                          color: tone.color,
                          background: tone.background,
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          textTransform: 'capitalize'
                        }}
                      >
                        <StatusIcon size={12} />
                        {item.status}
                      </span>
                    </td>
                    <td style={{ padding: '0.85rem', color: subtext, fontSize: '0.82rem' }}>{formatDateTime(item.updatedAt)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: subtext, fontSize: '0.84rem' }}>
        <span>{total.toLocaleString()} total records</span>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            type="button"
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            disabled={page <= 1}
            style={{ border: `1px solid ${border}`, borderRadius: '0.45rem', padding: '0.35rem 0.55rem', color: text, background: surface }}
          >
            Prev
          </button>
          <span>Page {page} / {maxPage}</span>
          <button
            type="button"
            onClick={() => setPage((prev) => Math.min(maxPage, prev + 1))}
            disabled={page >= maxPage}
            style={{ border: `1px solid ${border}`, borderRadius: '0.45rem', padding: '0.35rem 0.55rem', color: text, background: surface }}
          >
            Next
          </button>
        </div>
      </section>

      <section style={{ border: `1px solid ${border}`, borderRadius: '0.75rem', background: surface, padding: '1rem' }}>
        <h2 style={{ margin: '0 0 0.65rem', color: text, fontSize: '1rem' }}>Transaction Timeline</h2>
        {detailLoading ? <p style={{ margin: 0, color: subtext }}>Loading timeline...</p> : null}
        {!detailLoading && !selected ? <p style={{ margin: 0, color: subtext }}>Select a row to inspect full timeline and provider updates.</p> : null}

        {!detailLoading && selected ? (
          <div style={{ display: 'grid', gap: '0.65rem' }}>
            <p style={{ margin: 0, color: subtext, fontFamily: 'monospace' }}>{selected.reference}</p>
            <p style={{ margin: 0, color: text, fontWeight: 700 }}>{formatCurrency(selected.amountNaira, selected.currency)} · {selected.fund}</p>
            <p style={{ margin: 0, color: subtext }}>{selected.providerStatus || 'No provider status'}</p>
            <div style={{ display: 'grid', gap: '0.4rem' }}>
              {(selected.timeline || []).slice().reverse().map((entry) => (
                <div key={`${entry.at}-${entry.payloadHash}`} style={{ border: `1px solid ${border}`, borderRadius: '0.5rem', padding: '0.55rem 0.65rem', background: panel }}>
                  <p style={{ margin: 0, color: text, fontSize: '0.84rem' }}>{entry.event}</p>
                  <small style={{ color: subtext }}>{entry.status} · {formatDateTime(entry.at)}</small>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </section>
    </div>
  )
}

export default GivingManager
