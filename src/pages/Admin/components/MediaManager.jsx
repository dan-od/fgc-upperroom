import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useAdminTheme } from '../AdminThemeContext'
import AdminModal from './AdminModal'
import { useMediaCrud } from './useMediaCrud'
import MediaUpload from './MediaUpload'
import MediaFilters from './MediaFilters'
import MediaList from './MediaList'

const MediaManager = ({ currentUser = null, hasPermission = () => false }) => {
  const { darkMode } = useAdminTheme()
  const ui = {
    panel: darkMode ? '#1a2235' : 'white',
    panelAlt: darkMode ? '#131b2e' : '#f8fafc',
    panelSubtle: darkMode ? '#222c40' : '#f3f4f6',
    border: darkMode ? '#2a3550' : '#e5e7eb',
    borderSoft: darkMode ? '#3a4866' : '#d1d5db',
    textPrimary: darkMode ? '#e2e8f0' : '#111827',
    textSecondary: darkMode ? '#94afd4' : '#6b7280',
    textMuted: darkMode ? '#c3d4ef' : '#374151',
    textFaint: darkMode ? '#7f93b3' : '#9ca3af'
  }

  const canWrite = hasPermission('content:media:write')
  const canApprove = hasPermission('content:media:approve')

  const [notice, setNotice] = useState(null)
  const [modalConfig, setModalConfig] = useState({ isOpen: false, title: '', message: '', tone: 'info', onConfirm: null, showInput: false, inputValue: '', inputPlaceholder: '', confirmLabel: 'Confirm', cancelLabel: 'Cancel' })

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
  const handleModalConfirm = () => { if (modalConfig.onConfirm) modalConfig.onConfirm(modalConfig.inputValue); closeModal() }

  const crud = useMediaCrud({ canWrite, canApprove, setNotice, openModal })

  if (crud.view === 'create' || crud.view === 'edit') {
    return (
      <MediaUpload
        view={crud.view}
        formData={crud.formData}
        setFormData={crud.setFormData}
        onSubmit={crud.handleSubmit}
        onCancel={crud.resetForm}
        notice={notice}
        isUploading={crud.isUploading}
        darkMode={darkMode}
        ui={ui}
        fileInputRef={crud.fileInputRef}
        handlePickMedia={crud.handlePickMedia}
        handleFileChange={crud.handleFileChange}
        removeAsset={crud.removeAsset}
        handleAddYouTubeVideo={crud.handleAddYouTubeVideo}
        canWrite={canWrite}
      />
    )
  }

  return (
    <div>
      {notice && (
        <div style={{ marginBottom: '1rem', padding: '0.75rem 1rem', borderRadius: '0.5rem', background: notice.tone === 'error' ? '#fee2e2' : '#dcfce7', color: notice.tone === 'error' ? '#991b1b' : '#166534', border: `1px solid ${notice.tone === 'error' ? '#fecaca' : '#86efac'}`, fontSize: '0.875rem', fontWeight: 600 }}>
          {notice.text}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ margin: '0 0 0.5rem', fontSize: '2rem', color: ui.textPrimary }}>Media Management</h1>
          <p style={{ margin: 0, color: ui.textSecondary }}>{crud.mediaItems.length} total media uploads</p>
        </div>
        <button type="button" onClick={crud.openCreate} disabled={!canWrite}
          style={{ padding: '0.75rem 1.2rem', background: '#2d3a7a', color: 'white', border: 'none', borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: 700, cursor: canWrite ? 'pointer' : 'not-allowed', opacity: canWrite ? 1 : 0.65, display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
          <Plus size={18} /> New Media Upload
        </button>
      </div>

      <MediaFilters
        searchTerm={crud.searchTerm}
        setSearchTerm={crud.setSearchTerm}
        filterCategory={crud.filterCategory}
        setFilterCategory={crud.setFilterCategory}
        filterType={crud.filterType}
        setFilterType={crud.setFilterType}
        filterDate={crud.filterDate}
        setFilterDate={crud.setFilterDate}
        selectedItems={crud.selectedMedia}
        filteredCount={crud.filteredMedia.length}
        onBulkDelete={() => crud.handleBulkMediaAction('delete')}
        onBulkCategoryChange={() => crud.handleBulkMediaAction('category')}
        onSelectAll={crud.handleSelectAllMedia}
        darkMode={darkMode}
        ui={ui}
      />

      <MediaList
        items={crud.filteredMedia}
        onEdit={crud.handleEdit}
        onDelete={crud.handleDelete}
        onApprove={crud.handleApprove}
        onSubmitForReview={crud.handleSubmitForReview}
        selectedItems={crud.selectedMedia}
        onSelectItem={crud.handleSelectMediaItem}
        canWrite={canWrite}
        canApprove={canApprove}
        darkMode={darkMode}
        ui={ui}
      />

      <AdminModal
        isOpen={modalConfig.isOpen}
        onClose={closeModal}
        title={modalConfig.title}
        tone={modalConfig.tone}
        onConfirm={handleModalConfirm}
        showInput={modalConfig.showInput}
        inputValue={modalConfig.inputValue}
        onInputChange={(val) => setModalConfig((prev) => ({ ...prev, inputValue: val }))}
        inputPlaceholder={modalConfig.inputPlaceholder}
        confirmLabel={modalConfig.confirmLabel}
        cancelLabel={modalConfig.cancelLabel}
      >
        <p style={{ margin: 0 }}>{modalConfig.message}</p>
      </AdminModal>
    </div>
  )
}

export default MediaManager
