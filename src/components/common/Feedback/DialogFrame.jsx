import { useEffect, useId } from 'react'
import { createPortal } from 'react-dom'
import { AlertOctagon, AlertTriangle, CheckCircle2, Info, ShieldQuestion, X } from 'lucide-react'
import './DialogFrame.css'

const TONE_META = {
  info: { Icon: Info, label: 'Information' },
  success: { Icon: CheckCircle2, label: 'Success' },
  warning: { Icon: AlertTriangle, label: 'Warning' },
  confirm: { Icon: ShieldQuestion, label: 'Confirmation' },
  danger: { Icon: AlertOctagon, label: 'Danger' }
}

const DialogFrame = ({
  isOpen,
  onClose,
  title,
  tone = 'info',
  maxWidth = '520px',
  children,
  footer = null,
  className = '',
  closeOnOverlay = true
}) => {
  const titleId = useId()
  const descriptionId = useId()
  const { Icon, label } = TONE_META[tone] || TONE_META.info

  useEffect(() => {
    if (!isOpen) return undefined

    document.body.classList.add('modal-open')

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose?.()
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.classList.remove('modal-open')
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  if (!isOpen || typeof document === 'undefined') {
    return null
  }

  return createPortal(
    <div
      className="app-dialog"
      onMouseDown={(event) => {
        if (closeOnOverlay && event.target === event.currentTarget) {
          onClose?.()
        }
      }}
    >
      <div
        className={`app-dialog__panel app-dialog__panel--${tone} ${className}`.trim()}
        style={{ maxWidth }}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
      >
        <div className="app-dialog__header">
          <div className="app-dialog__title-wrap">
            <span className={`app-dialog__icon app-dialog__icon--${tone}`} aria-hidden="true">
              <Icon size={20} />
            </span>
            <div>
              <p className="app-dialog__eyebrow">{label}</p>
              <h2 id={titleId} className="app-dialog__title">{title}</h2>
            </div>
          </div>
          <button type="button" className="app-dialog__close" onClick={() => onClose?.()} aria-label="Close dialog">
            <X size={18} />
          </button>
        </div>

        <div id={descriptionId} className="app-dialog__content">
          {children}
        </div>

        {footer ? <div className="app-dialog__footer">{footer}</div> : null}
      </div>
    </div>,
    document.body
  )
}

export default DialogFrame
