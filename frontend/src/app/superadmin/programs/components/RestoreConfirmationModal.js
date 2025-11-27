import React, { useEffect } from 'react'
import { createPortal } from 'react-dom'
import styles from '../../highlights/components/styles/ArchiveConfirmationModal.module.css'

const RestoreConfirmationModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  programTitle,
  organizationName,
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

  const handleConfirm = () => {
    onConfirm()
  }

  const modalContent = (
    <div className={styles.modalOverlay} onClick={handleBackdropClick}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Restore Program</h2>
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
          <div className={styles.confirmationSection}>
            <p className={styles.confirmationText}>
              Are you sure you want to restore <strong>&ldquo;{programTitle}&rdquo;</strong>?
            </p>
            {organizationName && (
              <p className={styles.organizationText}>
                Organization: <strong>{organizationName}</strong>
              </p>
            )}
            <div className={styles.infoBox}>
              <p className={styles.infoText}>
                Restoring will make this program visible on the public website again. It will be removed from the archive library.
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
            onClick={handleConfirm}
            disabled={isLoading}
          >
            {isLoading ? 'Restoring...' : 'Restore'}
          </button>
        </div>
      </div>
    </div>
  )

  // Use portal to render modal outside of the card's DOM hierarchy
  if (!isOpen) return null;
  
  if (typeof document !== 'undefined' && document.body) {
    return createPortal(modalContent, document.body);
  }
  
  // Fallback for SSR or if document.body doesn't exist
  return null;
}

export default RestoreConfirmationModal

