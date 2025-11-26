import React, { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { FiAlertTriangle } from 'react-icons/fi'
import styles from './styles/UnfeatureConfirmationModal.module.css'

const UnfeatureConfirmationModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  highlightTitle, 
  isLoading = false 
}) => {
  // Prevent body scroll when modal is open
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

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const modalContent = (
    <div className={styles.modalOverlay} onClick={handleBackdropClick}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <div className={styles.headerLeft}>
            <div className={styles.warningIconContainer}>
              <FiAlertTriangle className={styles.warningIcon} />
            </div>
            <h2 className={styles.modalTitle}>Remove from Featured Highlights</h2>
          </div>
          <button 
            className={styles.closeButton}
            onClick={onClose}
            disabled={isLoading}
            aria-label="Close"
          >
            ×
          </button>
        </div>
        
        <div className={styles.modalBody}>
          {/* Confirmation Section */}
          <div className={styles.confirmationSection}>
            <p className={styles.confirmationText}>
              Are you sure you want to remove <strong>&ldquo;{highlightTitle}&rdquo;</strong> from FAITHree?
            </p>
            <div className={styles.infoBox}>
              <p className={styles.infoText}>
                This will remove the highlight from FAITHree, but it will remain in the regular Highlights section.
              </p>
            </div>
          </div>
        </div>
        
        <div className={styles.modalFooter}>
          <button 
            className={styles.cancelButton}
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </button>
          <button 
            className={styles.confirmButton}
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? 'Removing...' : 'Remove'}
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

export default UnfeatureConfirmationModal

