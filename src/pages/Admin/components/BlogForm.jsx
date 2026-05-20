import { useMemo } from 'react'
import { FileText, GraduationCap, Heart, Sparkles } from 'lucide-react'
import {
  BLOG_CATEGORIES,
  BLOG_WORKFLOW_STATUSES,
  estimateReadTime,
  formatBlogCategory,
  getTagList
} from '../../../utils/blogStorage'
import { DropdownSelect } from '../../../components/common'
import { buildExcerpt } from './useBlogCrud'

const categoryIcons = {
  article: FileText,
  devotional: Heart,
  'sunday-school': GraduationCap
}

export default function BlogForm({
  formData,
  setFormData,
  onSubmit,
  onSaveDraft,
  onCancel,
  notice,
  canApprove,
  view
}) {
  const handleChange = (event) => {
    const { name, value, type, checked } = event.target
    setFormData((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  const contentWordCount = useMemo(() => {
    return String(formData.content || '').trim().split(/\s+/).filter(Boolean).length
  }, [formData.content])

  const formTags = getTagList(formData.tags)
  const previewImage = formData.image.trim()
  const previewText = formData.excerpt.trim() || buildExcerpt(formData.content)
  const previewBody = String(formData.content || '').trim()

  return (
    <div className="admin-blog admin-blog--editor">
      {notice && (
        <div className={`admin-blog__notice admin-blog__notice--${notice.tone}`}>
          {notice.text}
        </div>
      )}

      <div className="admin-blog__editor-head">
        <button type="button" onClick={onCancel} className="admin-blog__ghost-btn">
          ← Back to Posts
        </button>
        <div>
          <h1>{view === 'create' ? 'Create New Post' : 'Edit Post'}</h1>
          <p>Manage category, content, and publishing options in one place.</p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="admin-blog__editor-layout">
        <section className="admin-blog__panel">
          <h2>Category</h2>
          <div className="admin-blog__category-grid">
            {BLOG_CATEGORIES.map((category) => {
              const Icon = categoryIcons[category.value] || FileText
              const isActive = formData.category === category.value
              return (
                <label key={category.value} className={`admin-blog__category-option ${isActive ? 'is-active' : ''}`}>
                  <input type="radio" name="category" value={category.value} checked={isActive} onChange={handleChange} />
                  <Icon size={20} />
                  <span>{category.label}</span>
                </label>
              )
            })}
          </div>
        </section>

        <section className="admin-blog__panel">
          <h2>Post Details</h2>
          <div className="admin-blog__field-grid admin-blog__field-grid--details">
            <label className="admin-blog__field">
              <span>Title</span>
              <input type="text" name="title" value={formData.title} onChange={handleChange} required placeholder="Enter post title" />
            </label>
            <label className="admin-blog__field">
              <span>Author</span>
              <input type="text" name="author" value={formData.author} onChange={handleChange} required placeholder="Author name" />
            </label>
            <label className="admin-blog__field admin-blog__field--full">
              <span>Cover Image URL</span>
              <input type="text" name="image" value={formData.image} onChange={handleChange} placeholder="/assets/media/events/images/teens_summit2026.png" />
            </label>
          </div>
        </section>

        <section className="admin-blog__panel">
          <h2>Content</h2>
          <div className="admin-blog__field-grid">
            <label className="admin-blog__field admin-blog__field--full">
              <span>Excerpt</span>
              <textarea name="excerpt" value={formData.excerpt} onChange={handleChange} rows={3} placeholder="Short summary of the post" />
            </label>
            <label className="admin-blog__field admin-blog__field--full">
              <span>Main Content</span>
              <textarea name="content" value={formData.content} onChange={handleChange} required rows={12} placeholder="Write your post content" className="admin-blog__content-input" />
            </label>
          </div>
        </section>

        <section className="admin-blog__panel">
          <h2>Tags & Publishing</h2>
          <div className="admin-blog__field-grid admin-blog__field-grid--publish">
            <label className="admin-blog__field">
              <span>Tags (comma separated)</span>
              <input type="text" name="tags" value={formData.tags} onChange={handleChange} placeholder="faith, prayer, youth" />
            </label>
            <label className="admin-blog__field">
              <span>Status</span>
              <DropdownSelect name="status" value={formData.status} onChange={handleChange}>
                {BLOG_WORKFLOW_STATUSES.map((status) => (
                  <option key={status.value} value={status.value}>{status.label}</option>
                ))}
              </DropdownSelect>
            </label>
          </div>

          {formData.status === 'scheduled' && (
            <label className="admin-blog__field admin-blog__field--full">
              <span>Scheduled Publish Time</span>
              <input type="datetime-local" name="scheduledFor" value={formData.scheduledFor ? formData.scheduledFor.slice(0, 16) : ''} onChange={handleChange} />
            </label>
          )}

          <label className="admin-blog__checkbox">
            <input type="checkbox" name="featured" checked={formData.featured} onChange={handleChange} />
            <span>Feature this post on the public blog</span>
          </label>

          {formTags.length > 0 && (
            <div className="admin-blog__tag-preview" aria-label="Tag preview">
              {formTags.map((tag) => <span key={tag}>{tag}</span>)}
            </div>
          )}

          <div className="admin-blog__editor-actions">
            <button type="submit" className="admin-blog__primary-btn">
              {canApprove ? (view === 'create' ? 'Publish Post' : 'Approve & Publish') : 'Submit For Review'}
            </button>
            <button type="button" onClick={onSaveDraft} className="admin-blog__secondary-btn">Save Draft</button>
            <button type="button" onClick={onCancel} className="admin-blog__ghost-btn">Cancel</button>
          </div>
        </section>

        <aside className="admin-blog__panel admin-blog__panel--preview">
          <div className="admin-blog__preview-head">
            <Sparkles size={18} />
            <h2>Live Preview</h2>
          </div>
          <div className="admin-blog__preview-card">
            <div className="admin-blog__preview-image-wrap">
              {previewImage
                ? <img src={previewImage} alt="Post cover preview" className="admin-blog__preview-image" />
                : <div className="admin-blog__preview-image-fallback">Cover image preview</div>}
              <span className="admin-blog__preview-category">{formatBlogCategory(formData.category)}</span>
              <span className={`admin-blog__preview-status admin-blog__preview-status--${formData.status}`}>{formData.status}</span>
            </div>
            <div className="admin-blog__preview-body">
              <h3>{formData.title.trim() || 'Your title will appear here'}</h3>
              <p>{previewText}</p>
              {formTags.length > 0 && (
                <div className="admin-blog__preview-tags">
                  {formTags.slice(0, 4).map((tag) => <span key={`preview-${tag}`}>{tag}</span>)}
                </div>
              )}
              <div className="admin-blog__preview-meta">
                <span>By {formData.author.trim() || 'Author name'}</span>
                <span>{estimateReadTime(formData.content)} min read</span>
                <span>{contentWordCount} words</span>
              </div>
              <div className="admin-blog__preview-foot">
                <strong>Body Preview</strong>
                <p>{previewBody || 'Start writing content to preview paragraph flow and rhythm.'}</p>
              </div>
            </div>
          </div>
        </aside>
      </form>
    </div>
  )
}
