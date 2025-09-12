import React, { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { FiAlertTriangle } from 'react-icons/fi'
import styles from './styles/UnfeatureConfirmationModal.module.css'

const UnfeatureConfirmationModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  projectTitle, 
  isLoading = false 
}) => {
  // Prevent body scroll when modal is open
  useEffect(() => {
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
          <h2 className={styles.modalTitle}>Remove from Featured Projects</h2>
          <button 
            className={styles.closeButton}
            onClick={onClose}
            disabled={isLoading}
          >
            ×
          </button>
        </div>
        
        <div className={styles.modalBody}>
          <div className={styles.warningIcon}>
            <FiAlertTriangle />
          </div>
          
          <p className={styles.confirmationText}>
            Are you sure you want to remove <strong>"{projectTitle}"</strong> from the Featured Projects section?
          </p>
          
          <p className={styles.warningText}>
            This action will make the project no longer appear in the Featured Projects section, but it will remain in the regular Programs by Organization section.
          </p>
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
            {isLoading ? (
              <>
                <div className={styles.loadingSpinner}></div>
                Removing...
              </>
            ) : (
              'Remove from Featured'
            )}
          </button>
        </div>
      </div>
    </div>
  )

  // Use portal to render modal outside of the card's DOM hierarchy
  return isOpen ? createPortal(modalContent, document.body) : null
}

export default UnfeatureConfirmationModal
