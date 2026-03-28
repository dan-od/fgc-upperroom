import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Button from '../Button/Button'
import DialogFrame from './DialogFrame'
import './FeedbackProvider.css'

const FeedbackContext = createContext({
  showToast: () => {},
  showSuccess: () => {},
  showError: () => {},
  showInfo: () => {},
  showWarning: () => {},
  confirm: async () => false
})

let toastSequence = 0

export const FeedbackProvider = ({ children }) => {
  const [toasts, setToasts] = useState([])
  const [dialog, setDialog] = useState(null)
  const confirmResolverRef = useRef(null)

  const dismissToast = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const showToast = useCallback((config) => {
    const nextToast = {
      id: `toast-${toastSequence += 1}`,
      tone: config?.tone || 'info',
      title: config?.title || '',
      message: config?.message || '',
      duration: Math.max(1800, Number(config?.duration || 3200))
    }

    setToasts((current) => [...current, nextToast])

    window.setTimeout(() => {
      dismissToast(nextToast.id)
    }, nextToast.duration)
  }, [dismissToast])

  const closeDialog = useCallback((accepted = false) => {
    setDialog(null)
    if (confirmResolverRef.current) {
      confirmResolverRef.current(accepted)
      confirmResolverRef.current = null
    }
  }, [])

  const confirm = useCallback((config) => {
    return new Promise((resolve) => {
      confirmResolverRef.current = resolve
      setDialog({
        tone: config?.tone || 'confirm',
        title: config?.title || 'Please confirm',
        message: config?.message || '',
        confirmLabel: config?.confirmLabel || 'Continue',
        cancelLabel: config?.cancelLabel || 'Cancel'
      })
    })
  }, [])

  const value = useMemo(() => ({
    showToast,
    showSuccess: (message, config = {}) => showToast({ ...config, tone: 'success', message }),
    showError: (message, config = {}) => showToast({ ...config, tone: 'danger', message }),
    showInfo: (message, config = {}) => showToast({ ...config, tone: 'info', message }),
    showWarning: (message, config = {}) => showToast({ ...config, tone: 'warning', message }),
    confirm
  }), [confirm, showToast])

  return (
    <FeedbackContext.Provider value={value}>
      {children}
      {typeof document !== 'undefined'
        ? createPortal(
            <div className="feedback-toast-stack" aria-live="polite" aria-atomic="true">
              {toasts.map((toast) => (
                <div key={toast.id} className={`feedback-toast feedback-toast--${toast.tone}`}>
                  <div className="feedback-toast__glow" aria-hidden="true" />
                  {toast.title ? <p className="feedback-toast__title">{toast.title}</p> : null}
                  <p className="feedback-toast__message">{toast.message}</p>
                  <button type="button" className="feedback-toast__close" onClick={() => dismissToast(toast.id)} aria-label="Dismiss notification">
                    ×
                  </button>
                </div>
              ))}
            </div>,
            document.body
          )
        : null}

      <DialogFrame
        isOpen={Boolean(dialog)}
        onClose={() => closeDialog(false)}
        title={dialog?.title || 'Please confirm'}
        tone={dialog?.tone || 'confirm'}
        footer={dialog ? (
          <>
            <Button type="button" variant="outline-light" onClick={() => closeDialog(false)}>
              {dialog.cancelLabel}
            </Button>
            <Button
              type="button"
              variant={dialog.tone === 'danger' ? 'primary' : 'secondary'}
              onClick={() => closeDialog(true)}
            >
              {dialog.confirmLabel}
            </Button>
          </>
        ) : null}
      >
        <p>{dialog?.message}</p>
      </DialogFrame>
    </FeedbackContext.Provider>
  )
}

export const useFeedback = () => useContext(FeedbackContext)
