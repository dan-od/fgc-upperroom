import { DropdownSelect } from '../../../components/common'
import { formatCategoryLabel, normalizeCategory, mergeCategories, EVENT_WORKFLOW_STATUSES } from './eventManagerUtils'
import EventRegistrationSetup from './EventRegistrationSetup'
import EventScheduleFields from './EventScheduleFields'

export default function EventForm({
  formData,
  setFormData,
  categories,
  setCategories,
  newCategoryInput,
  setNewCategoryInput,
  tagInput,
  setTagInput,
  onSubmit,
  onCancel,
  isImageUploading,
  setIsImageUploading,
  imageFileInputRef,
  notice,
  setNotice,
  view,
  canWrite,
  canPublish,
  darkMode,
  ui
}) {
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  const handleAddTag = (rawValue) => {
    const nextTag = String(rawValue || '').trim()
    if (!nextTag) return
    const exists = (formData.whatToExpect || []).some((tag) => tag.toLowerCase() === nextTag.toLowerCase())
    if (exists) { setTagInput(''); return }
    setFormData((prev) => ({ ...prev, whatToExpect: [...(prev.whatToExpect || []), nextTag] }))
    setTagInput('')
  }

  const handleRemoveTag = (tagToRemove) => {
    setFormData((prev) => ({ ...prev, whatToExpect: (prev.whatToExpect || []).filter((tag) => tag !== tagToRemove) }))
  }

  const handleTagKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); handleAddTag(tagInput) }
  }

  const handleAddCategory = () => {
    const nextCategory = normalizeCategory(newCategoryInput)
    if (!nextCategory) { setNotice({ tone: 'error', text: 'Enter a valid category name.' }); return }
    const alreadyExists = categories.includes(nextCategory)
    const updatedCategories = alreadyExists ? categories : mergeCategories(categories, [nextCategory])
    if (!alreadyExists) setCategories(updatedCategories)
    setFormData((prev) => ({ ...prev, category: nextCategory }))
    setNewCategoryInput('')
    setNotice({ tone: 'success', text: alreadyExists ? `${formatCategoryLabel(nextCategory)} selected.` : `${formatCategoryLabel(nextCategory)} category added.` })
  }

  const handlePickImage = () => imageFileInputRef.current?.click()

  const handleImageUploadChange = (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) { setNotice({ tone: 'error', text: 'Please select a valid image file.' }); return }
    if (file.size > 3 * 1024 * 1024) { setNotice({ tone: 'error', text: 'Image is too large. Please use an image below 3MB.' }); return }
    setIsImageUploading(true)
    const reader = new FileReader()
    reader.onload = () => {
      const value = typeof reader.result === 'string' ? reader.result : ''
      if (!value) { setNotice({ tone: 'error', text: 'Unable to read image. Please try again.' }); setIsImageUploading(false); return }
      setFormData((prev) => ({ ...prev, imageUrl: value }))
      setNotice({ tone: 'success', text: 'Event image uploaded successfully.' })
      setIsImageUploading(false)
    }
    reader.onerror = () => { setNotice({ tone: 'error', text: 'Unable to upload image right now. Please try again.' }); setIsImageUploading(false) }
    reader.readAsDataURL(file)
  }

  const inputStyle = { padding: '0.75rem', border: `1px solid ${ui.borderSoft}`, borderRadius: '0.5rem', fontSize: '1rem' }
  const labelStyle = { fontSize: '0.875rem', fontWeight: 600, color: ui.textMuted }
  const colStyle = { display: 'flex', flexDirection: 'column', gap: '0.5rem' }

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <button onClick={onCancel} style={{ padding: '0.5rem 1rem', background: ui.panel, color: ui.textMuted, border: `1px solid ${ui.borderSoft}`, borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', marginBottom: '1rem' }}>
          ← Back to Events
        </button>
        <h1 style={{ margin: '0 0 0.5rem', fontSize: '2rem', color: ui.textPrimary }}>
          {view === 'create' ? 'Create New Event' : 'Edit Event'}
        </h1>
      </div>

      <div style={{ background: ui.panel, padding: '2rem', borderRadius: '0.75rem', border: `1px solid ${ui.border}` }}>
        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div style={colStyle}>
              <label style={labelStyle}>Event Title *</label>
              <input type="text" name="title" value={formData.title} onChange={handleChange} required style={inputStyle} placeholder="e.g., Youth Sunday Service" />
            </div>
            <div style={colStyle}>
              <label style={labelStyle}>Category *</label>
              <DropdownSelect name="category" value={formData.category} onChange={handleChange} style={inputStyle}>
                {categories.map((cat) => <option key={cat} value={cat}>{formatCategoryLabel(cat)}</option>)}
              </DropdownSelect>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input type="text" value={newCategoryInput} onChange={(e) => setNewCategoryInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddCategory() } }} style={{ flex: 1, padding: '0.65rem 0.75rem', border: `1px solid ${ui.borderSoft}`, borderRadius: '0.5rem', fontSize: '0.875rem' }} placeholder="Add a new category" />
                <button type="button" onClick={handleAddCategory} style={{ padding: '0.65rem 0.9rem', border: `1px solid ${ui.borderSoft}`, borderRadius: '0.5rem', background: ui.panel, color: ui.textMuted, fontWeight: 600, cursor: 'pointer' }}>Add</button>
              </div>
            </div>
          </div>

          <div style={colStyle}>
            <label style={labelStyle}>Description *</label>
            <textarea name="description" value={formData.description} onChange={handleChange} required rows={4} style={{ ...inputStyle, resize: 'vertical' }} placeholder="Event description, schedule, and details..." />
          </div>

          <EventScheduleFields formData={formData} handleChange={handleChange} ui={ui} />

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
            <div style={colStyle}>
              <label style={labelStyle}>Location *</label>
              <input type="text" name="location" value={formData.location} onChange={handleChange} required style={inputStyle} placeholder="e.g., Main Auditorium" />
            </div>
            <div style={colStyle}>
              <label style={labelStyle}>Status</label>
              <DropdownSelect name="status" value={formData.status} onChange={handleChange} style={inputStyle}>
                {EVENT_WORKFLOW_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </DropdownSelect>
            </div>
          </div>

          <div style={colStyle}>
            <label style={labelStyle}>Event Image URL (Optional)</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input ref={imageFileInputRef} type="file" accept="image/*" onChange={handleImageUploadChange} style={{ display: 'none' }} />
              <input type="url" name="imageUrl" value={formData.imageUrl} onChange={handleChange} style={{ flex: 1, ...inputStyle }} placeholder="https://example.com/event-image.jpg" />
              <button type="button" onClick={handlePickImage} disabled={isImageUploading} style={{ padding: '0.75rem 1rem', border: `1px solid ${ui.borderSoft}`, borderRadius: '0.5rem', background: ui.panel, color: ui.textMuted, fontWeight: 600, cursor: isImageUploading ? 'not-allowed' : 'pointer', opacity: isImageUploading ? 0.7 : 1 }}>{isImageUploading ? 'Uploading...' : 'Upload Image'}</button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            <label style={labelStyle}>What To Expect Tags</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input type="text" value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={handleTagKeyDown} style={{ flex: 1, ...inputStyle }} placeholder="Type a tag and press Enter (e.g., Games)" />
              <button type="button" onClick={() => handleAddTag(tagInput)} style={{ padding: '0.75rem 1rem', border: `1px solid ${ui.borderSoft}`, borderRadius: '0.5rem', background: ui.panel, color: ui.textMuted, fontWeight: 600, cursor: 'pointer' }}>Add</button>
            </div>
            <p style={{ margin: 0, color: ui.textSecondary, fontSize: '0.75rem' }}>Press Enter after each tag. Tags are saved per event.</p>
            {(formData.whatToExpect || []).length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {formData.whatToExpect.map((tag) => (
                  <span key={tag} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.3rem 0.65rem', borderRadius: '9999px', background: ui.panelSubtle, color: ui.textMuted, fontSize: '0.75rem', fontWeight: 600 }}>
                    {tag}
                    <button type="button" onClick={() => handleRemoveTag(tag)}
                      style={{ border: 'none', background: 'transparent', color: ui.textSecondary, cursor: 'pointer', padding: 0, lineHeight: 1 }}
                      aria-label={`Remove ${tag}`}>×</button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <input type="checkbox" id="registrationRequired" name="registrationRequired"
              checked={formData.registrationRequired} onChange={handleChange}
              style={{ width: '20px', height: '20px', cursor: 'pointer' }} />
            <label htmlFor="registrationRequired" style={{ fontSize: '0.875rem', fontWeight: 500, color: ui.textMuted, cursor: 'pointer' }}>
              Require registration for this event
            </label>
          </div>

          {formData.registrationRequired && (
            <EventRegistrationSetup formData={formData} setFormData={setFormData} darkMode={darkMode} ui={ui} />
          )}

          <div style={{ display: 'flex', gap: '1rem', paddingTop: '1rem', borderTop: `1px solid ${ui.border}` }}>
            <button type="submit" style={{ padding: '0.75rem 2rem', background: '#5a4494', color: 'white', border: 'none', borderRadius: '0.5rem', fontSize: '1rem', fontWeight: 600, cursor: 'pointer' }}>{view === 'create' ? 'Create Event' : 'Update Event'}</button>
            <button type="button" onClick={onCancel} style={{ padding: '0.75rem 2rem', background: ui.panel, color: ui.textMuted, border: `1px solid ${ui.borderSoft}`, borderRadius: '0.5rem', fontSize: '1rem', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  )
}
