import { Edit2, FileText, GraduationCap, Heart, Plus, Search, Sparkles, Star, Trash2 } from 'lucide-react'
import { BLOG_CATEGORIES, BLOG_WORKFLOW_STATUSES, estimateReadTime, formatBlogCategory, getTagList } from '../../../utils/blogStorage'
import { DropdownSelect } from '../../../components/common'
import { ADMIN_DATE_FILTER_OPTIONS } from '../../../utils/adminDateFilters'
import AdminModal from './AdminModal'

const categoryIcons = { article: FileText, devotional: Heart, 'sunday-school': GraduationCap }

export default function BlogList({
  posts, filteredPosts, selectedPosts,
  onEdit, onDelete, onApprove, onQuickPublish, onSubmitForReview, onSchedulePost, onRollback,
  onSelectPost, onSelectAllPosts, onBulkAction, onOpenCreate,
  stats, searchTerm, setSearchTerm, filterCategory, setFilterCategory,
  filterStatus, setFilterStatus, filterDate, setFilterDate,
  notice, canWrite, canPublish, canApprove,
  modalConfig, setModalConfig, closeModal, handleModalConfirm
}) {
  return (
    <div className="admin-blog">
      {notice && <div className={`admin-blog__notice admin-blog__notice--${notice.tone}`}>{notice.text}</div>}

      <div className="admin-blog__head">
        <div><h1>Blog Management</h1><p>Create, update, and publish church blog content.</p></div>
        <button type="button" onClick={onOpenCreate} className="admin-blog__primary-btn" disabled={!canWrite}>
          <Plus size={16} /><span>New Post</span>
        </button>
      </div>

      <div className="admin-blog__stats-grid">
        <article className="admin-blog__stat-card"><span>Total Posts</span><strong>{stats.total}</strong></article>
        <article className="admin-blog__stat-card"><span>Published</span><strong>{stats.published}</strong></article>
        <article className="admin-blog__stat-card"><span>Drafts</span><strong>{stats.drafts}</strong></article>
        <article className="admin-blog__stat-card"><span>Featured</span><strong>{stats.featured}</strong></article>
      </div>

      <section className="admin-blog__panel">
        <div className="admin-blog__filters">
          <label className="admin-blog__search">
            <Search size={18} />
            <input type="text" placeholder="Search posts by title, author, or tag" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </label>
          <DropdownSelect value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
            <option value="all">All Categories</option>
            {BLOG_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </DropdownSelect>
          <DropdownSelect value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="all">All Status</option>
            {BLOG_WORKFLOW_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </DropdownSelect>
          <DropdownSelect value={filterDate} onChange={(e) => setFilterDate(e.target.value)}>
            {ADMIN_DATE_FILTER_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </DropdownSelect>
        </div>
      </section>

      {filteredPosts.length > 0 && (
        <section className="admin-blog__panel">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', fontWeight: 600 }}>
              <input type="checkbox" checked={selectedPosts.length > 0 && selectedPosts.length === filteredPosts.length} onChange={(e) => onSelectAllPosts(e.target.checked)} />
              Select all filtered posts
            </label>
            {selectedPosts.length > 0 && (
              <div style={{ display: 'inline-flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button type="button" onClick={() => onBulkAction('draft')} className="admin-blog__icon-btn">Mark Draft</button>
                <button type="button" onClick={() => onBulkAction('review')} className="admin-blog__icon-btn">Submit Review</button>
                {canApprove && <button type="button" onClick={() => onBulkAction('publish')} className="admin-blog__icon-btn admin-blog__icon-btn--publish">Publish</button>}
                <button type="button" onClick={() => onBulkAction('delete')} className="admin-blog__icon-btn admin-blog__icon-btn--danger">Delete</button>
              </div>
            )}
          </div>
        </section>
      )}

      <div className="admin-blog__post-list">
        {filteredPosts.map((post) => {
          const Icon = categoryIcons[post.category] || FileText
          const tags = getTagList(post.tags)
          return (
            <article key={post.id} className="admin-blog__post-card">
              <div className="admin-blog__post-main">
                <div className="admin-blog__post-meta-top">
                  <label className="admin-blog__post-category" style={{ cursor: 'pointer' }}>
                    <input type="checkbox" checked={selectedPosts.includes(post.id)} onChange={() => onSelectPost(post.id)} />
                    Select
                  </label>
                  <span className="admin-blog__post-category"><Icon size={14} />{formatBlogCategory(post.category)}</span>
                  <span className={`admin-blog__status-pill admin-blog__status-pill--${post.status}`}>{post.status}</span>
                  {post.featured && <span className="admin-blog__featured-pill"><Star size={12} /> Featured</span>}
                </div>
                <h3>{post.title}</h3>
                <p>{post.excerpt || 'No excerpt provided.'}</p>
                <div className="admin-blog__post-meta-bottom">
                  <span>By {post.author}</span>
                  <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                  <span>{estimateReadTime(post.content)} min read</span>
                </div>
                <p className="admin-blog__post-updated-meta">Last updated: {new Date(post.updatedAt || post.createdAt).toLocaleString()}</p>
                {post.scheduledFor && post.status === 'scheduled' && (
                  <p className="admin-blog__post-updated-meta">Scheduled for: {new Date(post.scheduledFor).toLocaleString()}</p>
                )}
                {tags.length > 0 && (
                  <div className="admin-blog__tag-preview">{tags.map((tag) => <span key={`${post.id}-${tag}`}>{tag}</span>)}</div>
                )}
              </div>
              <div className="admin-blog__post-actions">
                <button type="button" onClick={() => onEdit(post)} className="admin-blog__icon-btn" disabled={!canWrite}><Edit2 size={14} /><span>Edit</span></button>
                {post.status === 'draft' && (
                  <button type="button" onClick={() => onSubmitForReview(post)} className="admin-blog__icon-btn"><Sparkles size={14} /><span>Submit</span></button>
                )}
                {post.status === 'pending_review' && canApprove && (
                  <button type="button" onClick={() => onApprove(post)} className="admin-blog__icon-btn"><Sparkles size={14} /><span>Approve</span></button>
                )}
                {canPublish && <button type="button" onClick={() => onQuickPublish(post)} className="admin-blog__icon-btn admin-blog__icon-btn--publish"><Sparkles size={14} /><span>Publish</span></button>}
                {canPublish && <button type="button" onClick={() => onSchedulePost(post)} className="admin-blog__icon-btn"><span>Schedule</span></button>}
                <button type="button" onClick={() => onRollback(post)} className="admin-blog__icon-btn" disabled={!Array.isArray(post.versions) || post.versions.length === 0}><span>Rollback</span></button>
                <button type="button" onClick={() => onDelete(post.id)} className="admin-blog__icon-btn admin-blog__icon-btn--danger"><Trash2 size={14} /><span>Delete</span></button>
              </div>
            </article>
          )
        })}
      </div>

      {posts.length === 0 && (
        <div className="admin-blog__empty">
          <Sparkles size={48} />
          <h2>No Blog Posts Yet</h2>
          <p>Get started by creating your very first article or devotional.</p>
          <button type="button" onClick={onOpenCreate} className="admin-blog__primary-btn">Create First Post</button>
        </div>
      )}

      <AdminModal isOpen={modalConfig.isOpen} onClose={closeModal} title={modalConfig.title} tone={modalConfig.tone} onConfirm={handleModalConfirm} showInput={modalConfig.showInput} inputValue={modalConfig.inputValue} onInputChange={(val) => setModalConfig((p) => ({ ...p, inputValue: val }))} inputPlaceholder={modalConfig.inputPlaceholder} confirmLabel={modalConfig.confirmLabel} cancelLabel={modalConfig.cancelLabel}>
        <p style={{ margin: 0 }}>{modalConfig.message}</p>
      </AdminModal>
    </div>
  )
}
