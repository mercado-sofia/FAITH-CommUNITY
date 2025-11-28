import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import styles from './styles/FeatureConfirmationModal.module.css'

const FeatureConfirmationModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  projectTitle, 
  isLoading = false,
  mode = 'add' // 'add' or 'remove'
}) => {
  // Prevent body scroll when modal is open and handle ESC key
  useEffect(() => {
    if (typeof document !== 'undefined' && document.body) {
      if (isOpen) {
        document.body.style.overflow = 'hidden'
        document.body.style.paddingRight = '0px'
      } else {
        document.body.style.overflow = 'unset'
        document.body.style.paddingRight = '0px'
      }

      // Cleanup on unmount
      return () => {
        document.body.style.overflow = 'unset'
        document.body.style.paddingRight = '0px'
      }
    }
  }, [isOpen])

  // Handle ESC key to close modal
  useEffect(() => {
    if (!isOpen || isLoading) return

    const handleEscape = (e) => {
      if (e.key === 'Escape' && onClose) {
        onClose()
      }
    }

    if (typeof document !== 'undefined') {
      document.addEventListener('keydown', handleEscape)
      return () => {
        document.removeEventListener('keydown', handleEscape)
      }
    }
  }, [isOpen, isLoading, onClose])

  const handleBackdropClick = (e) => {
    // Prevent closing during loading
    if (isLoading || !onClose) return
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const handleClose = () => {
    if (isLoading || !onClose) return
    onClose()
  }

  const handleConfirm = () => {
    if (isLoading || !onConfirm) return
    onConfirm()
  }

  // Determine content based on mode
  const isAddMode = mode === 'add'
  const title = isAddMode ? 'Add to Featured Projects' : 'Remove from Featured'
  const infoText = isAddMode
    ? 'This will make the project appear prominently in the Featured Projects section, giving it more visibility to users.'
    : 'This action will make the project no longer appear in the Featured Projects section, but it will remain in the regular Programs by Organization section.'
  const buttonText = isAddMode ? 'Add' : 'Remove'
  const loadingText = isAddMode ? 'Adding...' : 'Removing...'

  const modalContent = (
    <div className={styles.modalOverlay} onClick={handleBackdropClick}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>{title}</h2>
          <button 
            className={styles.closeButton}
            onClick={handleClose}
            disabled={isLoading}
          >
            ×
          </button>
        </div>
        
        <div className={styles.modalBody}>
          <p className={styles.confirmationText}>
            Are you sure you want to {isAddMode ? 'add' : 'remove'} <strong>&ldquo;{projectTitle || 'this project'}&rdquo;</strong> {isAddMode ? 'to' : 'from'} the Featured Projects section?
          </p>
          
          <p className={styles.infoText}>
            {infoText}
          </p>
        </div>
        
        <div className={styles.modalFooter}>
          <button 
            className={styles.cancelButton}
            onClick={handleClose}
            disabled={isLoading}
          >
            Cancel
          </button>
          <button 
            className={styles.confirmButton}
            onClick={handleConfirm}
            disabled={isLoading}
          >
            {isLoading ? loadingText : buttonText}
          </button>
        </div>
      </div>
    </div>
  )

  // Use portal to render modal outside of the card's DOM hierarchy
  // Ensure document.body exists before creating portal (SSR safety)
  if (!isOpen) return null;
  
  if (typeof document !== 'undefined' && document.body) {
    return createPortal(modalContent, document.body);
  }
  
  // Fallback for SSR or if document.body doesn't exist
  return null;
}

export default FeatureConfirmationModal
