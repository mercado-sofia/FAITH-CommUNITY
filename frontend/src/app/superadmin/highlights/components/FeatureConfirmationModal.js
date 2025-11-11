import React, { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { FiStar } from 'react-icons/fi'
import styles from './styles/FeatureConfirmationModal.module.css'

const FeatureConfirmationModal = ({ 
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
          <h2 className={styles.modalTitle}>Add to Featured Highlights</h2>
          <button 
            className={styles.closeButton}
            onClick={onClose}
            disabled={isLoading}
          >
            ×
          </button>
        </div>
        
        <div className={styles.modalBody}>
          <div className={styles.successIcon}>
            <FiStar />
          </div>
          
          <p className={styles.confirmationText}>
            Are you sure you want to add <strong>&ldquo;{highlightTitle}&rdquo;</strong> to the Featured Highlights section?
          </p>
          
          <p className={styles.infoText}>
            This will make the highlight appear prominently in the Featured Highlights section, giving it more visibility to users.
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
                Adding...
              </>
            ) : (
              'Add to Featured'
            )}
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

