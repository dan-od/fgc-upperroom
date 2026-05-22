import { Camera, Headphones, Image as ImageIcon, Link2, Upload, Video, X } from 'lucide-react'
import { MEDIA_CATEGORIES } from '../../../utils/mediaStorage'
import { DropdownSelect } from '../../../components/common'

const getTypeIcon = (type) => {
  if (type === 'video') return Video
  if (type === 'audio') return Headphones
  return ImageIcon
}

export default function MediaUpload({
  view,
  formData,
  setFormData,
  onSubmit,
  onCancel,
  notice,
  isUploading,
  darkMode,
  ui,
  fileInputRef,
  handlePickMedia,
  handleFileChange,
  removeAsset,
  handleAddYouTubeVideo,
  canWrite
}) {
  const handleChange = (event) => {
    const { name, value } = event.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <button
          type="button"
          onClick={onCancel}
          style={{
            padding: '0.5rem 1rem',
            background: ui.panel,
            color: ui.textMuted,
            border: `1px solid ${ui.borderSoft}`,
            borderRadius: '0.5rem',
            fontSize: '0.875rem',
            fontWeight: 600,
            cursor: 'pointer',
            marginBottom: '1rem'
          }}
        >
          ← Back to Media
        </button>
        <h1 style={{ margin: '0 0 0.5rem', fontSize: '2rem', color: ui.textPrimary }}>
          {view === 'create' ? 'Upload New Media' : 'Edit Media'}
        </h1>
        <p style={{ margin: 0, color: ui.textSecondary }}>
          Upload multiple images and/or videos in one entry. No scheduling is required.
        </p>
      </div>

      {notice && (
        <div style={{
          marginBottom: '1rem', padding: '0.75rem 1rem', borderRadius: '0.5rem',
          background: notice.tone === 'error' ? '#fee2e2' : '#dcfce7',
          color: notice.tone === 'error' ? '#991b1b' : '#166534',
          border: `1px solid ${notice.tone === 'error' ? '#fecaca' : '#86efac'}`,
          fontSize: '0.875rem', fontWeight: 600
        }}>
          {notice.text}
        </div>
      )}

      <div style={{ background: ui.panel, padding: '2rem', borderRadius: '0.75rem', border: `1px solid ${ui.border}` }}>
        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: ui.textMuted }}>Title *</span>
              <input type="text" name="title" value={formData.title} onChange={handleChange} required
                placeholder="e.g., Sunday Worship Session"
                style={{ padding: '0.75rem', border: `1px solid ${ui.borderSoft}`, borderRadius: '0.5rem', fontSize: '1rem' }} />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: ui.textMuted }}>Category *</span>
              <DropdownSelect name="mediaCategory" value={formData.mediaCategory} onChange={handleChange}
                style={{ padding: '0.75rem', border: `1px solid ${ui.borderSoft}`, borderRadius: '0.5rem', fontSize: '1rem' }}>
                {MEDIA_CATEGORIES.map((category) => (
                  <option key={category.value} value={category.value}>{category.label}</option>
                ))}
              </DropdownSelect>
            </label>
          </div>

          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: ui.textMuted }}>Description</span>
            <textarea name="description" value={formData.description} onChange={handleChange} rows={3}
              placeholder="Add context for this media set"
              style={{ padding: '0.75rem', border: `1px solid ${ui.borderSoft}`, borderRadius: '0.5rem', fontSize: '1rem', resize: 'vertical' }} />
          </label>

          <div style={{ border: `1px dashed ${ui.textFaint}`, borderRadius: '0.75rem', padding: '1rem', background: ui.panelAlt }}>
            <input ref={fileInputRef} type="file" accept="image/*,video/*,audio/*" multiple onChange={handleFileChange} style={{ display: 'none' }} />
            <button type="button" onClick={handlePickMedia} disabled={isUploading}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', borderRadius: '0.5rem', border: '1px solid #2d3a7a', background: '#2d3a7a', color: 'white', padding: '0.65rem 1rem', fontWeight: 700, cursor: 'pointer' }}>
              <Camera size={18} />
              {isUploading ? 'Processing files...' : 'Select Media Files'}
            </button>
            <p style={{ margin: '0.6rem 0 0', color: ui.textSecondary, fontSize: '0.825rem' }}>
              Upload multiple images and videos with one click (max 20MB per file).
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.75rem' }}>
            <input type="url" name="youtubeUrlInput" value={formData.youtubeUrlInput} onChange={handleChange}
              placeholder="Optional YouTube URL (attach sermon video)"
              style={{ padding: '0.75rem', border: `1px solid ${ui.borderSoft}`, borderRadius: '0.5rem', fontSize: '1rem' }} />
            <button type="button" onClick={handleAddYouTubeVideo}
              style={{ border: `1px solid ${ui.borderSoft}`, borderRadius: '0.5rem', padding: '0.75rem 1rem', background: ui.panel, color: ui.textMuted, display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, cursor: 'pointer' }}>
              <Link2 size={16} /> Attach URL
            </button>
          </div>

          {formData.mediaCategory !== 'events' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <input type="text" name="speaker" value={formData.speaker} onChange={handleChange}
                placeholder={formData.mediaCategory === 'sermons' ? 'Speaker *' : 'Speaker (optional)'}
                style={{ padding: '0.75rem', border: `1px solid ${ui.borderSoft}`, borderRadius: '0.5rem', fontSize: '1rem' }} />
              <input type="text" name="keypoint" value={formData.keypoint} onChange={handleChange}
                placeholder="Key point (optional)"
                style={{ padding: '0.75rem', border: `1px solid ${ui.borderSoft}`, borderRadius: '0.5rem', fontSize: '1rem' }} />
            </div>
          )}

          {formData.mediaCategory === 'sermons' && (
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: ui.textMuted }}>Sermon Sync Key (optional)</span>
              <input type="text" name="syncKey" value={formData.syncKey} onChange={handleChange}
                placeholder="If empty, title will be used to merge with YouTube sermons"
                style={{ padding: '0.75rem', border: `1px solid ${ui.borderSoft}`, borderRadius: '0.5rem', fontSize: '1rem' }} />
            </label>
          )}

          <div>
            <p style={{ margin: '0 0 0.5rem', fontSize: '0.85rem', color: ui.textMuted, fontWeight: 600 }}>
              Attached Assets ({formData.media.length})
            </p>
            {formData.media.length === 0 ? (
              <p style={{ margin: 0, color: ui.textFaint, fontSize: '0.825rem' }}>No media files attached yet.</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                {formData.media.map((asset) => {
                  const AssetIcon = getTypeIcon(asset.type)
                  const preview = asset.type === 'image' ? (asset.src || asset.thumbnail)
                    : asset.type === 'video' ? (asset.thumbnail || null) : null
                  return (
                    <div key={asset.id} style={{ position: 'relative', border: `1px solid ${ui.border}`, borderRadius: '0.5rem', overflow: 'hidden', background: ui.panelAlt }}>
                      {preview ? (
                        <img src={preview} alt={asset.alt || asset.name || asset.type}
                          style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' }} />
                      ) : (
                        <div style={{ width: '100%', aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: ui.textFaint, background: ui.panelSubtle }}>
                          <AssetIcon size={28} />
                        </div>
                      )}
                      <div style={{ padding: '0.35rem 0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.25rem', background: ui.panel, borderTop: `1px solid ${ui.border}` }}>
                        <span style={{ fontSize: '0.75rem', color: ui.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
                          {asset.name || asset.alt || asset.type}
                        </span>
                        <button type="button" onClick={() => removeAsset(asset.id)}
                          style={{ border: 'none', background: 'transparent', color: '#991b1b', display: 'inline-flex', alignItems: 'center', flexShrink: 0, cursor: 'pointer', padding: 0 }}>
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button type="submit" disabled={!canWrite}
              style={{ padding: '0.75rem 1.3rem', background: '#2d3a7a', color: 'white', border: 'none', borderRadius: '0.5rem', fontSize: '0.95rem', fontWeight: 700, cursor: canWrite ? 'pointer' : 'not-allowed', opacity: canWrite ? 1 : 0.65, display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}>
              <Upload size={16} />
              {view === 'create' ? 'Upload to Media' : 'Update Media Item'}
            </button>
            <button type="button" onClick={onCancel}
              style={{ padding: '0.75rem 1.3rem', background: ui.panel, color: ui.textMuted, border: `1px solid ${ui.borderSoft}`, borderRadius: '0.5rem', fontSize: '0.95rem', fontWeight: 600, cursor: 'pointer' }}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
