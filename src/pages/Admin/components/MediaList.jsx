import { Edit2, Headphones, Image as ImageIcon, PlayCircle, Trash2, Video } from 'lucide-react'
import { DEFAULT_MEDIA_THUMBNAIL } from '../../../utils/mediaStorage'

const getTypeIcon = (type) => {
  if (type === 'video') return Video
  if (type === 'audio') return Headphones
  return ImageIcon
}

const getCardPreview = (item, ui, darkMode) => {
  const firstAsset = Array.isArray(item.media) ? item.media[0] : null
  if (firstAsset?.type === 'image' && firstAsset.src) {
    return <img src={firstAsset.src} alt={firstAsset.alt || item.title} style={{ width: '100%', height: '180px', objectFit: 'cover' }} />
  }
  if (firstAsset?.type === 'video') {
    return (
      <div style={{ position: 'relative', height: '180px', background: '#111827' }}>
        <img src={firstAsset.thumbnail || item.thumbnail || DEFAULT_MEDIA_THUMBNAIL} alt={item.title}
          style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.65 }} />
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: '#fff' }}>
          <PlayCircle size={42} />
        </div>
      </div>
    )
  }
  if (firstAsset?.type === 'audio') {
    return (
      <div style={{ height: '180px', background: '#111827', color: 'white', display: 'grid', placeItems: 'center' }}>
        <Headphones size={42} />
      </div>
    )
  }
  return (
    <div style={{ height: '180px', background: ui.panelSubtle, color: ui.textFaint, display: 'grid', placeItems: 'center' }}>
      <ImageIcon size={44} />
    </div>
  )
}

const formatStamp = (value) => {
  if (!value) return 'Not updated yet'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Unknown' : date.toLocaleString()
}

export default function MediaList({
  items,
  onEdit,
  onDelete,
  onApprove,
  onSubmitForReview,
  selectedItems,
  onSelectItem,
  canWrite,
  canApprove,
  darkMode,
  ui
}) {
  if (items.length === 0) {
    return (
      <div style={{ background: ui.panel, borderRadius: '0.75rem', border: `1px solid ${ui.border}`, padding: '2rem', textAlign: 'center', color: ui.textFaint }}>
        No media items match your filters.
      </div>
    )
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
      {items.map((item) => {
        const TypeIcon = getTypeIcon(item.type)
        const assetCount = Array.isArray(item.media) ? item.media.length : 0
        return (
          <div key={item.id} style={{ background: ui.panel, borderRadius: '0.75rem', border: `1px solid ${ui.border}`, overflow: 'hidden' }}>
            {getCardPreview(item, ui, darkMode)}
            <div style={{ padding: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <h3 style={{ margin: 0, color: ui.textPrimary, fontSize: '1rem' }}>{item.title}</h3>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}>
                  <input type="checkbox"
                    checked={selectedItems.includes(String(item.id))}
                    onChange={() => onSelectItem(String(item.id))} />
                  <TypeIcon size={16} color={ui.textSecondary} />
                </div>
              </div>

              <p style={{ margin: '0 0 0.5rem', color: ui.textSecondary, fontSize: '0.875rem' }}>
                {item.description || 'No description'}
              </p>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.6rem' }}>
                <span style={{ fontSize: '0.72rem', color: ui.textMuted, background: ui.panelSubtle, padding: '0.25rem 0.5rem', borderRadius: '0.375rem' }}>
                  {item.category}
                </span>
                <span style={{ fontSize: '0.72rem', color: ui.textMuted, background: '#eef2ff', padding: '0.25rem 0.5rem', borderRadius: '0.375rem' }}>
                  {assetCount} asset{assetCount === 1 ? '' : 's'}
                </span>
                <span style={{
                  fontSize: '0.7rem', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: '0.375rem',
                  background: item.status === 'published' ? (darkMode ? '#083127' : '#dcfce7') : (darkMode ? '#3b1f05' : '#fef9c3'),
                  color: item.status === 'published' ? (darkMode ? '#6ee7b7' : '#166534') : (darkMode ? '#fcd34d' : '#92400e'),
                  textTransform: 'uppercase', letterSpacing: '0.04em'
                }}>
                  {item.status === 'published' ? 'Published' : 'Pending Review'}
                </span>
              </div>

              {item.speaker && (
                <p style={{ margin: '0 0 0.65rem', color: ui.textSecondary, fontSize: '0.8rem', fontWeight: 600 }}>
                  Speaker: {item.speaker}
                </p>
              )}
              <p style={{ margin: '0 0 0.65rem', color: ui.textFaint, fontSize: '0.75rem' }}>
                Last updated: {formatStamp(item.updatedAt || item.createdAt)}
              </p>

              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {canWrite && (
                  <button type="button" onClick={() => onEdit(item)}
                    style={{ flex: 1, padding: '0.5rem', border: 'none', borderRadius: '0.375rem', background: ui.panelSubtle, color: ui.textMuted, cursor: 'pointer', fontWeight: 600, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.35rem' }}>
                    <Edit2 size={14} /> Edit
                  </button>
                )}
                {canApprove && item.status !== 'published' && (
                  <button type="button" onClick={() => onApprove(item)}
                    style={{ flex: 1, padding: '0.5rem', border: 'none', borderRadius: '0.375rem', background: '#dcfce7', color: '#166534', cursor: 'pointer', fontWeight: 700, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.35rem', fontSize: '0.82rem' }}>
                    ✓ Approve
                  </button>
                )}
                {canWrite && !canApprove && item.status !== 'published' && (
                  <button type="button" onClick={() => onSubmitForReview(item)}
                    style={{ flex: 1, padding: '0.5rem', border: 'none', borderRadius: '0.375rem', background: '#fef9c3', color: '#92400e', cursor: 'pointer', fontWeight: 600, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.35rem', fontSize: '0.82rem' }}>
                    Submit for Review
                  </button>
                )}
                <button type="button" onClick={() => onDelete(item.id)} disabled={!canWrite && !canApprove}
                  style={{ flex: '0 0 auto', padding: '0.5rem 0.65rem', border: 'none', borderRadius: '0.375rem', background: '#fee2e2', color: '#991b1b', cursor: (canWrite || canApprove) ? 'pointer' : 'not-allowed', opacity: (canWrite || canApprove) ? 1 : 0.65, fontWeight: 600, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.35rem' }}>
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
