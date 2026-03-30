import { useEffect, useMemo, useState } from 'react'
import {
  Edit2,
  FileText,
  GraduationCap,
  Heart,
  Plus,
  Search,
  Sparkles,
  Star,
  Trash2
} from 'lucide-react'
import {
  BLOG_CATEGORIES,
  BLOG_WORKFLOW_STATUSES,
  applyBlogPublishingSchedule,
  estimateReadTime,
  formatBlogCategory,
  getTagList,
  pushBlogVersion,
  readBlogPosts,
  writeBlogPosts
} from '../../../utils/blogStorage'
import { DropdownSelect } from '../../../components/common'
import { ADMIN_DATE_FILTER_OPTIONS, matchesAdminDateFilter } from '../../../utils/adminDateFilters'
import { recordAdminAudit } from '../../../utils/adminApi'
import AdminModal from './AdminModal'
import './BlogManager.css'

const categoryIcons = {
  article: FileText,
  devotional: Heart,
  'sunday-school': GraduationCap
}

const createEmptyPost = () => ({
  id: Date.now(),
  title: '',
  content: '',
  category: 'article',
  author: '',
  excerpt: '',
  tags: '',
  featured: false,
  status: 'draft',
  scheduledFor: '',
  image: '',
  createdAt: null,
  updatedAt: null,
  versions: [],
  workflow: {
    submittedAt: null,
    reviewedBy: null,
    approvedBy: null,
    rejectedReason: null
  }
})

const buildExcerpt = (content) => {
  const plain = String(content || '').replace(/\s+/g, ' ').trim()
  if (!plain) {
    return 'No excerpt provided yet.'
  }

  if (plain.length <= 170) {
    return plain
  }

  return `${plain.slice(0, 167)}...`
}

const BlogManager = ({ currentUser = null, hasPermission = () => false }) => {
  const [view, setView] = useState('list')
  const [posts, setPosts] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategory, setFilterCategory] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterDate, setFilterDate] = useState('all')
  const [formData, setFormData] = useState(createEmptyPost)
  const [notice, setNotice] = useState(null)
  const [selectedPosts, setSelectedPosts] = useState([])
  const canWrite = hasPermission('content:blog:write') || hasPermission('content:blog:publish')
  const canPublish = hasPermission('content:blog:publish')
  const canApprove = hasPermission('content:blog:approve')
  const audit = (action, details = {}) => {
    recordAdminAudit({ action, resource: 'content.blog', details }).catch(() => {})
  }

  // Modal system for confirmation and prompts
  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    title: '',
    message: '',
    tone: 'info',
    onConfirm: null,
    showInput: false,
    inputValue: '',
    inputPlaceholder: '',
    confirmLabel: 'Confirm',
    cancelLabel: 'Cancel'
  })

  const closeModal = () => setModalConfig((prev) => ({ ...prev, isOpen: false }))
  const openModal = (config) => setModalConfig({
    isOpen: true,
    title: config.title || 'Are you sure?',
    message: config.message || '',
    tone: config.tone || 'info',
    onConfirm: config.onConfirm || null,
    showInput: !!config.showInput,
    inputValue: config.initialValue || '',
    inputPlaceholder: config.inputPlaceholder || '',
    confirmLabel: config.confirmLabel || 'Confirm',
    cancelLabel: config.cancelLabel || 'Cancel'
  })

  const handleModalConfirm = () => {
    if (modalConfig.onConfirm) {
      modalConfig.onConfirm(modalConfig.inputValue)
    }
    closeModal()
  }

  const [loading, setLoading] = useState(false)

  const loadPosts = async ({ silent = false } = {}) => {
    if (!silent) setLoading(true)
    try {
      const serverPosts = await readBlogPosts()
      const scheduled = applyBlogPublishingSchedule(serverPosts)
      setPosts(scheduled.posts)
      if (scheduled.changed) {
        await writeBlogPosts(scheduled.posts)
      }
    } catch (error) {
      setNotice({ tone: 'error', text: 'Failed to load blog posts from server.' })
    } finally {
      if (!silent) setLoading(false)
    }
  }

  useEffect(() => {
    void loadPosts()
  }, [])

  useEffect(() => {
    const interval = window.setInterval(async () => {
      const result = applyBlogPublishingSchedule(posts)
      if (result.changed) {
        setPosts(result.posts)
        try {
          await writeBlogPosts(result.posts)
          setNotice({ tone: 'success', text: 'Scheduled blog post published automatically.' })
        } catch {
          // Fallback handled by writeBlogPosts
        }
      }
    }, 60_000)

    return () => window.clearInterval(interval)
  }, [posts])

  useEffect(() => {
    const valid = new Set(posts.map((post) => post.id))
    setSelectedPosts((prev) => prev.filter((id) => valid.has(id)))
  }, [posts])

  const persistPosts = async (updatedPosts) => {
    const result = applyBlogPublishingSchedule(updatedPosts)
    setPosts(result.posts)
    try {
      await writeBlogPosts(result.posts)
    } catch (error) {
      setNotice({ tone: 'error', text: error.message || 'Error saving blog posts.' })
    }
  }

  const resetForm = () => {
    setFormData(createEmptyPost())
    setView('list')
  }

  const openCreate = () => {
    setNotice(null)
    setFormData(createEmptyPost())
    setView('create')
  }

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const savePost = (targetStatus = formData.status) => {
    if (!canWrite) {
      setNotice({ tone: 'error', text: 'Your role cannot modify blog posts.' })
      return
    }

    const title = formData.title.trim()
    const author = formData.author.trim()
    const content = formData.content.trim()

    if (!title || !author || !content) {
      setNotice({ tone: 'error', text: 'Title, author, and content are required.' })
      return
    }

    const now = new Date().toISOString()

    const payload = {
      ...formData,
      title,
      author,
      content,
      excerpt: formData.excerpt.trim() || buildExcerpt(content),
      tags: getTagList(formData.tags).join(', '),
      status: targetStatus,
      scheduledFor: formData.scheduledFor ? new Date(formData.scheduledFor).toISOString() : null,
      publishedAt: targetStatus === 'published' ? now : formData.publishedAt || null,
      workflow: {
        ...(formData.workflow || {}),
        submittedAt:
          targetStatus === 'pending_review'
            ? now
            : formData.workflow?.submittedAt || null,
        approvedBy:
          targetStatus === 'approved' || targetStatus === 'published'
            ? currentUser?.email || null
            : formData.workflow?.approvedBy || null,
        reviewedBy:
          targetStatus === 'approved' || targetStatus === 'published'
            ? currentUser?.email || null
            : formData.workflow?.reviewedBy || null
      },
      image: formData.image.trim(),
      updatedAt: now
    }

    if (view === 'create') {
      const newPost = {
        ...payload,
        id: Date.now(),
        createdAt: now,
        updatedAt: null
      }

      persistPosts([newPost, ...posts])
      setNotice({ tone: 'success', text: targetStatus === 'draft' ? 'Draft saved.' : 'Post published.' })
      audit('blog.create', { id: newPost.id, status: targetStatus })
      resetForm()
      return
    }

    const updatedPosts = posts.map((post) => {
      if (post.id !== formData.id) {
        return post
      }

      const withVersion = pushBlogVersion(post, 'manual_update')
      return {
        ...withVersion,
        ...payload,
        id: post.id,
        createdAt: post.createdAt || now
      }
    })

    persistPosts(updatedPosts)
    setNotice({ tone: 'success', text: 'Post updated successfully.' })
    audit('blog.update', { id: formData.id, status: targetStatus })
    resetForm()
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    if (canApprove) {
      savePost('published')
      return
    }
    savePost('pending_review')
  }

  const handleSaveDraft = () => {
    if (!formData.title.trim()) {
      setNotice({ tone: 'error', text: 'Enter a title before saving a draft.' })
      return
    }

    savePost('draft')
  }

  const handleEdit = (post) => {
    setNotice(null)
    setFormData({ ...post })
    setView('edit')
  }

  const handleDelete = (id) => {
    if (!canWrite) {
      setNotice({ tone: 'error', text: 'Your role cannot delete blog posts.' })
      return
    }

    const postToDelete = posts.find((post) => post.id === id)
    const confirmMessage = postToDelete
      ? `Delete "${postToDelete.title}"? This cannot be undone.`
      : 'Delete this blog post? This cannot be undone.'

    openModal({
      title: 'Delete Post',
      message: confirmMessage,
      tone: 'danger',
      confirmLabel: 'Delete',
      onConfirm: () => {
        persistPosts(posts.filter((post) => post.id !== id))
        setNotice({ tone: 'success', text: 'Post deleted.' })
        audit('blog.delete', { id })
      }
    })
  }

  const handleQuickPublish = (post) => {
    if (!canPublish) {
      setNotice({ tone: 'error', text: 'Your role cannot publish posts directly.' })
      return
    }

    if (post.status === 'published') {
      return
    }

    const updatedPosts = posts.map((item) => {
      if (item.id !== post.id) {
        return item
      }

      return {
        ...pushBlogVersion(item, 'quick_publish'),
        ...item,
        status: 'published',
        publishedAt: new Date().toISOString(),
        scheduledFor: null,
        workflow: {
          ...(item.workflow || {}),
          reviewedBy: currentUser?.email || null,
          approvedBy: currentUser?.email || null
        },
        updatedAt: new Date().toISOString()
      }
    })

    persistPosts(updatedPosts)
    setNotice({ tone: 'success', text: 'Draft published successfully.' })
    audit('blog.publish', { id: post.id })
  }

  const handleSubmitForReview = (post) => {
    if (!canWrite) {
      setNotice({ tone: 'error', text: 'Your role cannot submit posts for review.' })
      return
    }

    const now = new Date().toISOString()
    const updatedPosts = posts.map((item) => {
      if (item.id !== post.id) return item
      return {
        ...pushBlogVersion(item, 'submit_for_review'),
        ...item,
        status: 'pending_review',
        workflow: {
          ...(item.workflow || {}),
          submittedAt: now,
          reviewedBy: null,
          approvedBy: null
        },
        updatedAt: now
      }
    })

    persistPosts(updatedPosts)
    setNotice({ tone: 'success', text: 'Post submitted for review.' })
    audit('blog.submit_review', { id: post.id })
  }

  const handleApprove = (post) => {
    if (!canApprove) {
      setNotice({ tone: 'error', text: 'Your role cannot approve posts.' })
      return
    }

    const now = new Date().toISOString()
    const updatedPosts = posts.map((item) => {
      if (item.id !== post.id) return item
      return {
        ...pushBlogVersion(item, 'approved_and_published'),
        ...item,
        status: 'published',
        publishedAt: now,
        scheduledFor: null,
        workflow: {
          ...(item.workflow || {}),
          reviewedBy: currentUser?.email || null,
          approvedBy: currentUser?.email || null
        },
        updatedAt: now
      }
    })

    persistPosts(updatedPosts)
    setNotice({ tone: 'success', text: 'Post approved and published.' })
    audit('blog.approve_and_publish', { id: post.id })
  }

  const handleSchedulePost = (post) => {
    if (!canPublish) {
      setNotice({ tone: 'error', text: 'Your role cannot schedule posts.' })
      return
    }

    openModal({
      title: 'Schedule Post',
      message: 'Enter the date and time for this post to be automatically published.',
      showInput: true,
      initialValue: new Date().toISOString().slice(0, 16),
      inputPlaceholder: 'YYYY-MM-DDTHH:MM',
      onConfirm: (input) => {
        if (!input) return
        const scheduled = new Date(input)
        if (Number.isNaN(scheduled.getTime())) {
          setNotice({ tone: 'error', text: 'Invalid schedule format.' })
          return
        }

        const updatedPosts = posts.map((item) => {
          if (item.id !== post.id) return item
          return {
            ...pushBlogVersion(item, 'scheduled_publish'),
            ...item,
            status: 'scheduled',
            scheduledFor: scheduled.toISOString(),
            workflow: {
              ...(item.workflow || {}),
              approvedBy: currentUser?.email || null
            },
            updatedAt: new Date().toISOString()
          }
        })

        persistPosts(updatedPosts)
        setNotice({ tone: 'success', text: 'Post scheduled for publishing.' })
        audit('blog.schedule', { id: post.id, scheduledFor: scheduled.toISOString() })
      }
    })
  }

  const handleRollback = (post) => {
    if (!canWrite) {
      setNotice({ tone: 'error', text: 'Your role cannot roll back posts.' })
      return
    }

    const latestVersion = Array.isArray(post.versions) ? post.versions[0] : null
    if (!latestVersion?.snapshot) {
      setNotice({ tone: 'error', text: 'No saved version available for rollback.' })
      return
    }

    openModal({
      title: 'Rollback Post',
      message: `Rollback "${post.title}" to the previous version? The current version will be archived.`,
      tone: 'warning',
      confirmLabel: 'Rollback',
      onConfirm: () => {
        const updatedPosts = posts.map((item) => {
          if (item.id !== post.id) return item
          return {
            ...latestVersion.snapshot,
            versions: (post.versions || []).slice(1),
            updatedAt: new Date().toISOString()
          }
        })

        persistPosts(updatedPosts)
        setNotice({ tone: 'success', text: 'Post rolled back to previous version.' })
        audit('blog.rollback', { id: post.id })
      }
    })
  }

  const handleSelectPost = (id) => {
    setSelectedPosts((prev) => (
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    ))
  }

  const handleSelectAllPosts = (checked) => {
    if (!checked) {
      setSelectedPosts([])
      return
    }
    setSelectedPosts(filteredPosts.map((post) => post.id))
  }

  const handleBulkAction = (action) => {
    if (!selectedPosts.length) return

    if (!canWrite) {
      setNotice({ tone: 'error', text: 'Your role cannot run bulk blog actions.' })
      return
    }

    const now = new Date().toISOString()
    const selected = new Set(selectedPosts)
    let updated = posts.map((post) => {
      if (!selected.has(post.id)) return post

      if (action === 'delete') {
        return null
      }

      if (action === 'publish' && !canApprove) {
        return post
      }

      const withVersion = pushBlogVersion(post, `bulk_${action}`)
      if (action === 'publish') {
        return {
          ...withVersion,
          status: 'published',
          publishedAt: now,
          scheduledFor: null,
          updatedAt: now
        }
      }
      if (action === 'review') {
        return {
          ...withVersion,
          status: 'pending_review',
          workflow: { ...(withVersion.workflow || {}), submittedAt: now },
          updatedAt: now
        }
      }
      return {
        ...withVersion,
        status: 'draft',
        updatedAt: now
      }
    }).filter(Boolean)

    const runBulkAction = (targetAction, postList) => {
      persistPosts(postList)
      setSelectedPosts([])
      setNotice({ tone: 'success', text: `Bulk action "${targetAction}" completed.` })
      audit('blog.bulk_action', { action: targetAction, count: selectedPosts.length })
    }

    if (action === 'delete') {
      openModal({
        title: 'Bulk Delete',
        message: `Delete ${selectedPosts.length} selected post(s)? This action cannot be undone.`,
        tone: 'danger',
        confirmLabel: 'Delete All',
        onConfirm: () => runBulkAction(action, updated)
      })
    } else {
      runBulkAction(action, updated)
    }
  }

  const filteredPosts = useMemo(() => {
    return posts.filter((post) => {
      const term = searchTerm.toLowerCase()
      const matchesSearch =
        post.title.toLowerCase().includes(term) ||
        post.author.toLowerCase().includes(term) ||
        String(post.tags || '').toLowerCase().includes(term)

      const matchesCategory = filterCategory === 'all' || post.category === filterCategory
      const matchesStatus = filterStatus === 'all' || post.status === filterStatus
      const matchesDate = matchesAdminDateFilter(post.publishedAt || post.createdAt || post.updatedAt || post.scheduledFor, filterDate)

      return matchesSearch && matchesCategory && matchesStatus && matchesDate
    })
  }, [posts, searchTerm, filterCategory, filterDate, filterStatus])

  const stats = useMemo(() => {
    const published = posts.filter((post) => post.status === 'published').length
    const drafts = posts.filter((post) => post.status === 'draft').length
    const featured = posts.filter((post) => post.featured).length

    return {
      total: posts.length,
      published,
      drafts,
      featured
    }
  }, [posts])

  const contentWordCount = useMemo(() => {
    return String(formData.content || '')
      .trim()
      .split(/\s+/)
      .filter(Boolean).length
  }, [formData.content])

  const formTags = getTagList(formData.tags)
  const previewImage = formData.image.trim()
  const previewText = formData.excerpt.trim() || buildExcerpt(formData.content)
  const previewBody = String(formData.content || '').trim()

  if (view === 'create' || view === 'edit') {
    return (
      <div className="admin-blog admin-blog--editor">
        {notice && (
          <div className={`admin-blog__notice admin-blog__notice--${notice.tone}`}>
            {notice.text}
          </div>
        )}

        <div className="admin-blog__editor-head">
          <button type="button" onClick={resetForm} className="admin-blog__ghost-btn">
            ← Back to Posts
          </button>
          <div>
            <h1>{view === 'create' ? 'Create New Post' : 'Edit Post'}</h1>
            <p>Manage category, content, and publishing options in one place.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="admin-blog__editor-layout">
          <section className="admin-blog__panel">
            <h2>Category</h2>
            <div className="admin-blog__category-grid">
              {BLOG_CATEGORIES.map((category) => {
                const Icon = categoryIcons[category.value] || FileText
                const isActive = formData.category === category.value

                return (
                  <label
                    key={category.value}
                    className={`admin-blog__category-option ${isActive ? 'is-active' : ''}`}
                  >
                    <input
                      type="radio"
                      name="category"
                      value={category.value}
                      checked={isActive}
                      onChange={handleChange}
                    />
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
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  required
                  placeholder="Enter post title"
                />
              </label>

              <label className="admin-blog__field">
                <span>Author</span>
                <input
                  type="text"
                  name="author"
                  value={formData.author}
                  onChange={handleChange}
                  required
                  placeholder="Author name"
                />
              </label>

              <label className="admin-blog__field admin-blog__field--full">
                <span>Cover Image URL</span>
                <input
                  type="text"
                  name="image"
                  value={formData.image}
                  onChange={handleChange}
                  placeholder="/assets/media/events/images/teens_summit2026.png"
                />
              </label>
            </div>
          </section>

          <section className="admin-blog__panel">
            <h2>Content</h2>
            <div className="admin-blog__field-grid">
              <label className="admin-blog__field admin-blog__field--full">
                <span>Excerpt</span>
                <textarea
                  name="excerpt"
                  value={formData.excerpt}
                  onChange={handleChange}
                  rows={3}
                  placeholder="Short summary of the post"
                />
              </label>

              <label className="admin-blog__field admin-blog__field--full">
                <span>Main Content</span>
                <textarea
                  name="content"
                  value={formData.content}
                  onChange={handleChange}
                  required
                  rows={12}
                  placeholder="Write your post content"
                  className="admin-blog__content-input"
                />
              </label>
            </div>
          </section>

          <section className="admin-blog__panel">
            <h2>Tags & Publishing</h2>
            <div className="admin-blog__field-grid admin-blog__field-grid--publish">
              <label className="admin-blog__field">
                <span>Tags (comma separated)</span>
                <input
                  type="text"
                  name="tags"
                  value={formData.tags}
                  onChange={handleChange}
                  placeholder="faith, prayer, youth"
                />
              </label>

              <label className="admin-blog__field">
                <span>Status</span>
                <DropdownSelect name="status" value={formData.status} onChange={handleChange}>
                  {BLOG_WORKFLOW_STATUSES.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </DropdownSelect>
              </label>
            </div>

            {formData.status === 'scheduled' && (
              <label className="admin-blog__field admin-blog__field--full">
                <span>Scheduled Publish Time</span>
                <input
                  type="datetime-local"
                  name="scheduledFor"
                  value={formData.scheduledFor ? formData.scheduledFor.slice(0, 16) : ''}
                  onChange={handleChange}
                />
              </label>
            )}

            <label className="admin-blog__checkbox">
              <input
                type="checkbox"
                name="featured"
                checked={formData.featured}
                onChange={handleChange}
              />
              <span>Feature this post on the public blog</span>
            </label>

            {formTags.length > 0 && (
              <div className="admin-blog__tag-preview" aria-label="Tag preview">
                {formTags.map((tag) => (
                  <span key={tag}>{tag}</span>
                ))}
              </div>
            )}

            <div className="admin-blog__editor-actions">
              <button type="submit" className="admin-blog__primary-btn">
                {canApprove
                  ? (view === 'create' ? 'Publish Post' : 'Approve & Publish')
                  : 'Submit For Review'}
              </button>

              <button type="button" onClick={handleSaveDraft} className="admin-blog__secondary-btn">
                Save Draft
              </button>

              <button type="button" onClick={resetForm} className="admin-blog__ghost-btn">
                Cancel
              </button>
            </div>
          </section>

          <aside className="admin-blog__panel admin-blog__panel--preview">
            <div className="admin-blog__preview-head">
              <Sparkles size={18} />
              <h2>Live Preview</h2>
            </div>

            <div className="admin-blog__preview-card">
              <div className="admin-blog__preview-image-wrap">
                {previewImage ? (
                  <img src={previewImage} alt="Post cover preview" className="admin-blog__preview-image" />
                ) : (
                  <div className="admin-blog__preview-image-fallback">Cover image preview</div>
                )}

                <span className="admin-blog__preview-category">{formatBlogCategory(formData.category)}</span>
                <span className={`admin-blog__preview-status admin-blog__preview-status--${formData.status}`}>
                  {formData.status}
                </span>
              </div>

              <div className="admin-blog__preview-body">
                <h3>{formData.title.trim() || 'Your title will appear here'}</h3>
                <p>{previewText}</p>

                {formTags.length > 0 && (
                  <div className="admin-blog__preview-tags">
                    {formTags.slice(0, 4).map((tag) => (
                      <span key={`preview-${tag}`}>{tag}</span>
                    ))}
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

  return (
    <div className="admin-blog">
      {notice && <div className={`admin-blog__notice admin-blog__notice--${notice.tone}`}>{notice.text}</div>}

      <div className="admin-blog__head">
        <div>
          <h1>Blog Management</h1>
          <p>Create, update, and publish church blog content.</p>
        </div>
        <button type="button" onClick={openCreate} className="admin-blog__primary-btn" disabled={!canWrite}>
          <Plus size={16} />
          <span>New Post</span>
        </button>
      </div>

      <div className="admin-blog__stats-grid">
        <article className="admin-blog__stat-card">
          <span>Total Posts</span>
          <strong>{stats.total}</strong>
        </article>
        <article className="admin-blog__stat-card">
          <span>Published</span>
          <strong>{stats.published}</strong>
        </article>
        <article className="admin-blog__stat-card">
          <span>Drafts</span>
          <strong>{stats.drafts}</strong>
        </article>
        <article className="admin-blog__stat-card">
          <span>Featured</span>
          <strong>{stats.featured}</strong>
        </article>
      </div>

      <section className="admin-blog__panel">
        <div className="admin-blog__filters">
          <label className="admin-blog__search">
            <Search size={18} />
            <input
              type="text"
              placeholder="Search posts by title, author, or tag"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </label>

          <DropdownSelect value={filterCategory} onChange={(event) => setFilterCategory(event.target.value)}>
            <option value="all">All Categories</option>
            {BLOG_CATEGORIES.map((category) => (
              <option key={category.value} value={category.value}>
                {category.label}
              </option>
            ))}
          </DropdownSelect>

          <DropdownSelect value={filterStatus} onChange={(event) => setFilterStatus(event.target.value)}>
            <option value="all">All Status</option>
            {BLOG_WORKFLOW_STATUSES.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </DropdownSelect>

          <DropdownSelect value={filterDate} onChange={(event) => setFilterDate(event.target.value)}>
            {ADMIN_DATE_FILTER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </DropdownSelect>
        </div>
      </section>

      {filteredPosts.length > 0 && (
        <section className="admin-blog__panel">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', fontWeight: 600 }}>
              <input
                type="checkbox"
                checked={selectedPosts.length > 0 && selectedPosts.length === filteredPosts.length}
                onChange={(event) => handleSelectAllPosts(event.target.checked)}
              />
              Select all filtered posts
            </label>

            {selectedPosts.length > 0 && (
              <div style={{ display: 'inline-flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button type="button" onClick={() => handleBulkAction('draft')} className="admin-blog__icon-btn">
                  Mark Draft
                </button>
                <button type="button" onClick={() => handleBulkAction('review')} className="admin-blog__icon-btn">
                  Submit Review
                </button>
                {canApprove && (
                  <button type="button" onClick={() => handleBulkAction('publish')} className="admin-blog__icon-btn admin-blog__icon-btn--publish">
                    Publish
                  </button>
                )}
                <button type="button" onClick={() => handleBulkAction('delete')} className="admin-blog__icon-btn admin-blog__icon-btn--danger">
                  Delete
                </button>
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
                    <input
                      type="checkbox"
                      checked={selectedPosts.includes(post.id)}
                      onChange={() => handleSelectPost(post.id)}
                    />
                    Select
                  </label>
                  <span className="admin-blog__post-category">
                    <Icon size={14} />
                    {formatBlogCategory(post.category)}
                  </span>
                  <span className={`admin-blog__status-pill admin-blog__status-pill--${post.status}`}>
                    {post.status}
                  </span>
                  {post.featured && (
                    <span className="admin-blog__featured-pill">
                      <Star size={12} /> Featured
                    </span>
                  )}
                </div>

                <h3>{post.title}</h3>
                <p>{post.excerpt || 'No excerpt provided.'}</p>

                <div className="admin-blog__post-meta-bottom">
                  <span>By {post.author}</span>
                  <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                  <span>{estimateReadTime(post.content)} min read</span>
                </div>

                <p className="admin-blog__post-updated-meta">
                  Last updated: {new Date(post.updatedAt || post.createdAt).toLocaleString()}
                </p>
                {post.scheduledFor && post.status === 'scheduled' && (
                  <p className="admin-blog__post-updated-meta">
                    Scheduled for: {new Date(post.scheduledFor).toLocaleString()}
                  </p>
                )}

                {tags.length > 0 && (
                  <div className="admin-blog__tag-preview">
                    {tags.map((tag) => (
                      <span key={`${post.id}-${tag}`}>{tag}</span>
                    ))}
                  </div>
                )}
              </div>

              <div className="admin-blog__post-actions">
                <button type="button" onClick={() => handleEdit(post)} className="admin-blog__icon-btn" disabled={!canWrite}>
                  <Edit2 size={14} />
                  <span>Edit</span>
                </button>

                {post.status === 'draft' && (
                  <button
                    type="button"
                    onClick={() => handleSubmitForReview(post)}
                    className="admin-blog__icon-btn"
                  >
                    <Sparkles size={14} />
                    <span>Submit</span>
                  </button>
                )}

                {post.status === 'pending_review' && canApprove && (
                  <button
                    type="button"
                    onClick={() => handleApprove(post)}
                    className="admin-blog__icon-btn"
                  >
                    <Sparkles size={14} />
                    <span>Approve</span>
                  </button>
                )}

                {canPublish && (
                  <button
                    type="button"
                    onClick={() => handleQuickPublish(post)}
                    className="admin-blog__icon-btn admin-blog__icon-btn--publish"
                  >
                    <Sparkles size={14} />
                    <span>Publish</span>
                  </button>
                )}

                {canPublish && (
                  <button
                    type="button"
                    onClick={() => handleSchedulePost(post)}
                    className="admin-blog__icon-btn"
                  >
                    <span>Schedule</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleRollback(post)}
                  className="admin-blog__icon-btn"
                  disabled={!Array.isArray(post.versions) || post.versions.length === 0}
                >
                  <span>Rollback</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDelete(post.id)}
                  className="admin-blog__icon-btn admin-blog__icon-btn--danger"
                >
                  <Trash2 size={14} />
                  <span>Delete</span>
                </button>
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
          <button type="button" onClick={openCreate} className="admin-blog__primary-btn">
            Create First Post
          </button>
        </div>
      )}

      <AdminModal
        isOpen={modalConfig.isOpen}
        onClose={closeModal}
        title={modalConfig.title}
        tone={modalConfig.tone}
        onConfirm={handleModalConfirm}
        showInput={modalConfig.showInput}
        inputValue={modalConfig.inputValue}
        onInputChange={(val) => setModalConfig(prev => ({ ...prev, inputValue: val }))}
        inputPlaceholder={modalConfig.inputPlaceholder}
        confirmLabel={modalConfig.confirmLabel}
        cancelLabel={modalConfig.cancelLabel}
      >
        <p style={{ margin: 0 }}>{modalConfig.message}</p>
      </AdminModal>
    </div>
  )
}

export default BlogManager
