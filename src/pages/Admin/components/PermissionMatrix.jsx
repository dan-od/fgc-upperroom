import { ChevronDown, ChevronUp, Shield } from 'lucide-react'
import { ROLE_META } from '../../../utils/adminConstants'

const PERMISSION_MATRIX = [
  { label: 'Manage admin users', super_admin: true, editor: false, reviewer: false },
  { label: 'View audit logs', super_admin: true, editor: false, reviewer: true },
  { label: 'Create / edit events', super_admin: true, editor: true, reviewer: false },
  { label: 'Publish events', super_admin: true, editor: false, reviewer: false },
  { label: 'Create / edit blog posts', super_admin: true, editor: true, reviewer: false },
  { label: 'Publish blog posts', super_admin: true, editor: false, reviewer: false },
  { label: 'Approve content', super_admin: true, editor: false, reviewer: true },
  { label: 'Upload / manage media', super_admin: true, editor: true, reviewer: false },
  { label: 'View media', super_admin: true, editor: true, reviewer: true },
  { label: 'View analytics', super_admin: true, editor: false, reviewer: false },
  { label: 'View giving transactions', super_admin: true, editor: false, reviewer: false }
]

export const RoleBadge = ({ role, darkMode }) => {
  const meta = ROLE_META[role] || ROLE_META.editor
  return (
    <span style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.03em', textTransform: 'uppercase', padding: '0.2rem 0.55rem', borderRadius: '9999px', background: darkMode ? meta.darkBg : meta.bg, color: darkMode ? meta.darkColor : meta.color, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
      {meta.label}
    </span>
  )
}

export default function PermissionMatrix({ showMatrix, setShowMatrix, darkMode, ui }) {
  const { panelBg, panelBorder, textPrimary, textSecondary, subtleSurface } = ui

  return (
    <div style={{ background: panelBg, border: `1px solid ${panelBorder}`, borderRadius: '0.75rem', overflow: 'hidden' }}>
      <button type="button" onClick={() => setShowMatrix(v => !v)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.9rem 1.25rem', background: 'transparent', border: 'none', cursor: 'pointer', color: textPrimary, fontWeight: 700, fontSize: '0.925rem' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Shield size={16} style={{ color: '#5a4494' }} /> Role Permission Matrix
        </span>
        {showMatrix ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
      {showMatrix && (
        <div style={{ overflowX: 'auto', borderTop: `1px solid ${panelBorder}` }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.825rem' }}>
            <thead>
              <tr style={{ background: subtleSurface }}>
                <th style={{ padding: '0.65rem 1rem', textAlign: 'left', color: textSecondary, fontWeight: 600, borderBottom: `1px solid ${panelBorder}` }}>S/N</th>
                <th style={{ padding: '0.65rem 1.25rem', textAlign: 'left', color: textSecondary, fontWeight: 600, borderBottom: `1px solid ${panelBorder}` }}>Permission</th>
                {['super_admin', 'editor', 'reviewer'].map((role) => (
                  <th key={role} style={{ padding: '0.65rem 1rem', textAlign: 'center', borderBottom: `1px solid ${panelBorder}` }}>
                    <RoleBadge role={role} darkMode={darkMode} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PERMISSION_MATRIX.map((row, idx) => (
                <tr key={row.label} style={{ background: idx % 2 === 0 ? 'transparent' : subtleSurface }}>
                  <td style={{ padding: '0.55rem 1rem', color: textSecondary, borderBottom: `1px solid ${panelBorder}`, fontWeight: 700 }}>{idx + 1}</td>
                  <td style={{ padding: '0.55rem 1.25rem', color: textPrimary, borderBottom: `1px solid ${panelBorder}` }}>{row.label}</td>
                  {['super_admin', 'editor', 'reviewer'].map((role) => (
                    <td key={role} style={{ padding: '0.55rem 1rem', textAlign: 'center', borderBottom: `1px solid ${panelBorder}` }}>
                      {row[role] ? <span style={{ color: '#16a34a', fontWeight: 700, fontSize: '0.95rem' }}>✓</span> : <span style={{ color: panelBorder, fontSize: '0.85rem' }}>—</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
