import useBlogCrud from './useBlogCrud'
import BlogForm from './BlogForm'
import BlogList from './BlogList'
import './BlogManager.css'

export default function BlogManager({ currentUser = null, hasPermission = () => false }) {
  const crud = useBlogCrud({ currentUser, hasPermission })

  if (crud.view === 'create' || crud.view === 'edit') {
    return (
      <BlogForm
        formData={crud.formData}
        setFormData={crud.setFormData}
        onSubmit={crud.handleSubmit}
        onSaveDraft={crud.handleSaveDraft}
        onCancel={crud.resetForm}
        notice={crud.notice}
        canApprove={crud.canApprove}
        view={crud.view}
      />
    )
  }

  return (
    <BlogList
      posts={crud.posts}
      filteredPosts={crud.filteredPosts}
      selectedPosts={crud.selectedPosts}
      onEdit={crud.handleEdit}
      onDelete={crud.handleDelete}
      onApprove={crud.handleApprove}
      onQuickPublish={crud.handleQuickPublish}
      onSubmitForReview={crud.handleSubmitForReview}
      onSchedulePost={crud.handleSchedulePost}
      onRollback={crud.handleRollback}
      onSelectPost={crud.handleSelectPost}
      onSelectAllPosts={crud.handleSelectAllPosts}
      onBulkAction={crud.handleBulkAction}
      onOpenCreate={crud.openCreate}
      stats={crud.stats}
      searchTerm={crud.searchTerm}
      setSearchTerm={crud.setSearchTerm}
      filterCategory={crud.filterCategory}
      setFilterCategory={crud.setFilterCategory}
      filterStatus={crud.filterStatus}
      setFilterStatus={crud.setFilterStatus}
      filterDate={crud.filterDate}
      setFilterDate={crud.setFilterDate}
      notice={crud.notice}
      isLoading={crud.loading}
      canWrite={crud.canWrite}
      canPublish={crud.canPublish}
      canApprove={crud.canApprove}
      modalConfig={crud.modalConfig}
      setModalConfig={crud.setModalConfig}
      closeModal={crud.closeModal}
      handleModalConfirm={crud.handleModalConfirm}
    />
  )
}
