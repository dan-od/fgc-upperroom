import { useEffect, useMemo, useState } from 'react'
import { applyBlogPublishingSchedule, getTagList, pushBlogVersion, readBlogPosts, writeBlogPosts } from '../../../utils/blogStorage'
import { recordAdminAudit } from '../../../utils/adminApi'

export const createEmptyPost = () => ({
  id: Date.now(), title: '', content: '', category: 'article', author: '', excerpt: '',
  tags: '', featured: false, status: 'draft', scheduledFor: '', image: '',
  createdAt: null, updatedAt: null, versions: [],
  workflow: { submittedAt: null, reviewedBy: null, approvedBy: null, rejectedReason: null }
})

export const buildExcerpt = (content) => {
  const plain = String(content || '').replace(/\s+/g, ' ').trim()
  if (!plain) return 'No excerpt provided yet.'
  return plain.length <= 170 ? plain : `${plain.slice(0, 167)}...`
}

const MODAL_DEFAULTS = { isOpen: false, title: '', message: '', tone: 'info', onConfirm: null, showInput: false, inputValue: '', inputPlaceholder: '', confirmLabel: 'Confirm', cancelLabel: 'Cancel' }

export default function useBlogCrud({ currentUser, hasPermission }) {
  const [view, setView] = useState('list')
  const [posts, setPosts] = useState([])
  const [formData, setFormData] = useState(createEmptyPost)
  const [notice, setNotice] = useState(null)
  const [loading, setLoading] = useState(false)
  const [selectedPosts, setSelectedPosts] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategory, setFilterCategory] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterDate, setFilterDate] = useState('all')
  const [modalConfig, setModalConfig] = useState(MODAL_DEFAULTS)

  const canWrite = hasPermission('content:blog:write') || hasPermission('content:blog:publish')
  const canPublish = hasPermission('content:blog:publish')
  const canApprove = hasPermission('content:blog:approve')
  const audit = (action, details = {}) => recordAdminAudit({ action, resource: 'content.blog', details }).catch(() => {})
  const closeModal = () => setModalConfig((p) => ({ ...p, isOpen: false }))
  const openModal = (cfg) => setModalConfig({ isOpen: true, title: cfg.title || 'Are you sure?', message: cfg.message || '', tone: cfg.tone || 'info', onConfirm: cfg.onConfirm || null, showInput: !!cfg.showInput, inputValue: cfg.initialValue || '', inputPlaceholder: cfg.inputPlaceholder || '', confirmLabel: cfg.confirmLabel || 'Confirm', cancelLabel: cfg.cancelLabel || 'Cancel' })
  const handleModalConfirm = () => { if (modalConfig.onConfirm) modalConfig.onConfirm(modalConfig.inputValue); closeModal() }
  const persistPosts = async (updated) => {
    const result = applyBlogPublishingSchedule(updated)
    setPosts(result.posts)
    try { await writeBlogPosts(result.posts) } catch (e) { setNotice({ tone: 'error', text: e.message || 'Error saving blog posts.' }) }
  }
  const loadPosts = async ({ silent = false } = {}) => {
    if (!silent) setLoading(true)
    try { const s = await readBlogPosts(); const r = applyBlogPublishingSchedule(s); setPosts(r.posts); if (r.changed) await writeBlogPosts(r.posts) }
    catch { setNotice({ tone: 'error', text: 'Failed to load blog posts from server.' }) }
    finally { if (!silent) setLoading(false) }
  }
  useEffect(() => { void loadPosts() }, [])
  useEffect(() => {
    const id = window.setInterval(async () => {
      const r = applyBlogPublishingSchedule(posts)
      if (r.changed) { setPosts(r.posts); try { await writeBlogPosts(r.posts); setNotice({ tone: 'success', text: 'Scheduled blog post published automatically.' }) } catch {} }
    }, 60_000)
    return () => window.clearInterval(id)
  }, [posts])
  useEffect(() => { const v = new Set(posts.map((p) => p.id)); setSelectedPosts((prev) => prev.filter((id) => v.has(id))) }, [posts])

  const resetForm = () => { setFormData(createEmptyPost()); setView('list') }
  const openCreate = () => { setNotice(null); setFormData(createEmptyPost()); setView('create') }
  const handleEdit = (post) => { setNotice(null); setFormData({ ...post }); setView('edit') }
  const handleSaveDraft = () => { if (!formData.title.trim()) { setNotice({ tone: 'error', text: 'Enter a title before saving a draft.' }); return } savePost('draft') }
  const handleSubmit = (e) => { e.preventDefault(); savePost(canApprove ? 'published' : 'pending_review') }

  const savePost = (targetStatus = formData.status) => {
    if (!canWrite) { setNotice({ tone: 'error', text: 'Your role cannot modify blog posts.' }); return }
    const title = formData.title.trim(); const author = formData.author.trim(); const content = formData.content.trim()
    if (!title || !author || !content) { setNotice({ tone: 'error', text: 'Title, author, and content are required.' }); return }
    const now = new Date().toISOString()
    const isApproved = targetStatus === 'approved' || targetStatus === 'published'
    const payload = { ...formData, title, author, content, excerpt: formData.excerpt.trim() || buildExcerpt(content), tags: getTagList(formData.tags).join(', '), status: targetStatus, scheduledFor: formData.scheduledFor ? new Date(formData.scheduledFor).toISOString() : null, publishedAt: targetStatus === 'published' ? now : formData.publishedAt || null, workflow: { ...(formData.workflow || {}), submittedAt: targetStatus === 'pending_review' ? now : formData.workflow?.submittedAt || null, approvedBy: isApproved ? currentUser?.email || null : formData.workflow?.approvedBy || null, reviewedBy: isApproved ? currentUser?.email || null : formData.workflow?.reviewedBy || null }, image: formData.image.trim(), updatedAt: now }
    if (view === 'create') {
      const newPost = { ...payload, id: Date.now(), createdAt: now, updatedAt: null }
      persistPosts([newPost, ...posts]); setNotice({ tone: 'success', text: targetStatus === 'draft' ? 'Draft saved.' : 'Post published.' }); audit('blog.create', { id: newPost.id, status: targetStatus }); resetForm(); return
    }
    persistPosts(posts.map((p) => p.id !== formData.id ? p : { ...pushBlogVersion(p, 'manual_update'), ...payload, id: p.id, createdAt: p.createdAt || now }))
    setNotice({ tone: 'success', text: 'Post updated successfully.' }); audit('blog.update', { id: formData.id, status: targetStatus }); resetForm()
  }

  const handleDelete = (id) => {
    if (!canWrite) { setNotice({ tone: 'error', text: 'Your role cannot delete blog posts.' }); return }
    const found = posts.find((p) => p.id === id)
    openModal({ title: 'Delete Post', message: found ? `Delete "${found.title}"? This cannot be undone.` : 'Delete this blog post? This cannot be undone.', tone: 'danger', confirmLabel: 'Delete', onConfirm: () => { persistPosts(posts.filter((p) => p.id !== id)); setNotice({ tone: 'success', text: 'Post deleted.' }); audit('blog.delete', { id }) } })
  }

  const handleQuickPublish = (post) => {
    if (!canPublish) { setNotice({ tone: 'error', text: 'Your role cannot publish posts directly.' }); return }
    if (post.status === 'published') return
    const now = new Date().toISOString()
    persistPosts(posts.map((item) => item.id !== post.id ? item : { ...pushBlogVersion(item, 'quick_publish'), ...item, status: 'published', publishedAt: now, scheduledFor: null, workflow: { ...(item.workflow || {}), reviewedBy: currentUser?.email || null, approvedBy: currentUser?.email || null }, updatedAt: now }))
    setNotice({ tone: 'success', text: 'Draft published successfully.' }); audit('blog.publish', { id: post.id })
  }

  const handleSubmitForReview = (post) => {
    if (!canWrite) { setNotice({ tone: 'error', text: 'Your role cannot submit posts for review.' }); return }
    const now = new Date().toISOString()
    persistPosts(posts.map((item) => item.id !== post.id ? item : { ...pushBlogVersion(item, 'submit_for_review'), ...item, status: 'pending_review', workflow: { ...(item.workflow || {}), submittedAt: now, reviewedBy: null, approvedBy: null }, updatedAt: now }))
    setNotice({ tone: 'success', text: 'Post submitted for review.' }); audit('blog.submit_review', { id: post.id })
  }

  const handleApprove = (post) => {
    if (!canApprove) { setNotice({ tone: 'error', text: 'Your role cannot approve posts.' }); return }
    const now = new Date().toISOString()
    persistPosts(posts.map((item) => item.id !== post.id ? item : { ...pushBlogVersion(item, 'approved_and_published'), ...item, status: 'published', publishedAt: now, scheduledFor: null, workflow: { ...(item.workflow || {}), reviewedBy: currentUser?.email || null, approvedBy: currentUser?.email || null }, updatedAt: now }))
    setNotice({ tone: 'success', text: 'Post approved and published.' }); audit('blog.approve_and_publish', { id: post.id })
  }

  const handleSchedulePost = (post) => {
    if (!canPublish) { setNotice({ tone: 'error', text: 'Your role cannot schedule posts.' }); return }
    openModal({ title: 'Schedule Post', message: 'Enter the date and time for this post to be automatically published.', showInput: true, initialValue: new Date().toISOString().slice(0, 16), inputPlaceholder: 'YYYY-MM-DDTHH:MM', onConfirm: (input) => {
      if (!input) return
      const scheduled = new Date(input)
      if (Number.isNaN(scheduled.getTime())) { setNotice({ tone: 'error', text: 'Invalid schedule format.' }); return }
      persistPosts(posts.map((item) => item.id !== post.id ? item : { ...pushBlogVersion(item, 'scheduled_publish'), ...item, status: 'scheduled', scheduledFor: scheduled.toISOString(), workflow: { ...(item.workflow || {}), approvedBy: currentUser?.email || null }, updatedAt: new Date().toISOString() }))
      setNotice({ tone: 'success', text: 'Post scheduled for publishing.' }); audit('blog.schedule', { id: post.id, scheduledFor: scheduled.toISOString() })
    } })
  }

  const handleRollback = (post) => {
    if (!canWrite) { setNotice({ tone: 'error', text: 'Your role cannot roll back posts.' }); return }
    const latest = Array.isArray(post.versions) ? post.versions[0] : null
    if (!latest?.snapshot) { setNotice({ tone: 'error', text: 'No saved version available for rollback.' }); return }
    openModal({ title: 'Rollback Post', message: `Rollback "${post.title}" to the previous version? The current version will be archived.`, tone: 'warning', confirmLabel: 'Rollback', onConfirm: () => {
      persistPosts(posts.map((item) => item.id !== post.id ? item : { ...latest.snapshot, versions: (post.versions || []).slice(1), updatedAt: new Date().toISOString() }))
      setNotice({ tone: 'success', text: 'Post rolled back to previous version.' }); audit('blog.rollback', { id: post.id })
    } })
  }

  const handleSelectPost = (id) => setSelectedPosts((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
  const handleSelectAllPosts = (checked) => setSelectedPosts(checked ? filteredPosts.map((p) => p.id) : [])

  const filteredPosts = useMemo(() => posts.filter((post) => {
    const term = searchTerm.toLowerCase()
    return (post.title.toLowerCase().includes(term) || post.author.toLowerCase().includes(term) || String(post.tags || '').toLowerCase().includes(term)) &&
      (filterCategory === 'all' || post.category === filterCategory) &&
      (filterStatus === 'all' || post.status === filterStatus)
  }), [posts, searchTerm, filterCategory, filterStatus])

  const handleBulkAction = (action) => {
    if (!selectedPosts.length || !canWrite) { if (!canWrite) setNotice({ tone: 'error', text: 'Your role cannot run bulk blog actions.' }); return }
    const now = new Date().toISOString(); const sel = new Set(selectedPosts)
    const updated = posts.map((post) => {
      if (!sel.has(post.id)) return post
      if (action === 'delete') return null
      if (action === 'publish' && !canApprove) return post
      const w = pushBlogVersion(post, `bulk_${action}`)
      if (action === 'publish') return { ...w, status: 'published', publishedAt: now, scheduledFor: null, updatedAt: now }
      if (action === 'review') return { ...w, status: 'pending_review', workflow: { ...(w.workflow || {}), submittedAt: now }, updatedAt: now }
      return { ...w, status: 'draft', updatedAt: now }
    }).filter(Boolean)
    const run = (a, list) => { persistPosts(list); setSelectedPosts([]); setNotice({ tone: 'success', text: `Bulk action "${a}" completed.` }); audit('blog.bulk_action', { action: a, count: selectedPosts.length }) }
    if (action === 'delete') openModal({ title: 'Bulk Delete', message: `Delete ${selectedPosts.length} selected post(s)? This action cannot be undone.`, tone: 'danger', confirmLabel: 'Delete All', onConfirm: () => run(action, updated) })
    else run(action, updated)
  }

  const stats = useMemo(() => ({ total: posts.length, published: posts.filter((p) => p.status === 'published').length, drafts: posts.filter((p) => p.status === 'draft').length, featured: posts.filter((p) => p.featured).length }), [posts])

  return { view, posts, filteredPosts, formData, setFormData, notice, setNotice, loading, selectedPosts, stats, searchTerm, setSearchTerm, filterCategory, setFilterCategory, filterStatus, setFilterStatus, filterDate, setFilterDate, modalConfig, setModalConfig, closeModal, handleModalConfirm, canWrite, canPublish, canApprove, openCreate, resetForm, savePost, handleSubmit, handleSaveDraft, handleEdit, handleDelete, handleQuickPublish, handleSubmitForReview, handleApprove, handleSchedulePost, handleRollback, handleSelectPost, handleSelectAllPosts, handleBulkAction }
}
