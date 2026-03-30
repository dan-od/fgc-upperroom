import React from 'react'
import { Button } from '../../../components/common'
import DialogFrame from '../../../components/common/Feedback/DialogFrame'

const AdminModal = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  tone = 'info', // 'info', 'success', 'warning', 'confirm', 'danger'
  maxWidth = '500px',
  footer = null,
  showInput = false,
  inputValue = '',
  onInputChange = () => {},
  inputPlaceholder = '',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm = null
}) => {
  return (
    <DialogFrame
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      tone={tone}
      maxWidth={maxWidth}
      footer={footer || (onConfirm ? (
        <>
          <Button type="button" variant="outline-light" onClick={onClose}>
            {cancelLabel}
          </Button>
          <Button type="button" variant={tone === 'danger' ? 'primary' : 'secondary'} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      ) : null)}
    >
      <div style={{ fontSize: '0.95rem', lineHeight: 1.7 }}>
        {children}
        
        {showInput && (
          <div style={{ marginTop: '1rem' }}>
            <input
              type="text"
              value={inputValue}
              onChange={(e) => onInputChange(e.target.value)}
              placeholder={inputPlaceholder}
              autoFocus
              className="app-dialog__field"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && onConfirm) onConfirm()
              }}
            />
          </div>
        )}
      </div>
    </DialogFrame>
  )
}

export default AdminModal
