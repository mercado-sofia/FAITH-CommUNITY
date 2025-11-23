import React, { useEffect, useState, useRef } from 'react'
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
  const [impactLevel, setImpactLevel] = useState('low') // 'low', 'average', 'high'
  const [isDragging, setIsDragging] = useState(false)
  const starContainerRef = useRef(null)
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

  // Reset impact level when modal opens
  useEffect(() => {
    if (isOpen) {
      setImpactLevel('low')
    }
  }, [isOpen])

  const handleStarClick = (level) => {
    setImpactLevel(level)
  }

  const handleMouseDown = (e) => {
    setIsDragging(true)
    handleStarInteraction(e)
  }

  const handleMouseMove = (e) => {
    if (isDragging) {
      handleStarInteraction(e)
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleStarInteraction = (e) => {
    if (!starContainerRef.current) return
    
    const rect = starContainerRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const width = rect.width
    
    // Divide the container into 3 equal parts
    const third = width / 3
    
    if (x < third) {
      setImpactLevel('low')
    } else if (x < third * 2) {
      setImpactLevel('average')
    } else {
      setImpactLevel('high')
    }
  }

  const handleConfirm = () => {
    onConfirm(impactLevel)
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

          {/* Impact Level Selector */}
          <div className={styles.impactSelector}>
            <p className={styles.impactLabel}>Select Impact Level:</p>
            <p className={styles.impactExplanation}>
              Choose the impact level to determine how prominently this highlight will be displayed in the Featured Highlights section.
            </p>
            <div 
              className={styles.starContainer}
              ref={starContainerRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              <div className={styles.starLine}></div>
              <div 
                className={`${styles.starLineProgress} ${isDragging ? styles.dragging : ''}`}
                style={{
                  width: impactLevel === 'low' 
                    ? 'calc((100% - 56px) * 0.33)' 
                    : impactLevel === 'average' 
                    ? 'calc((100% - 56px) * 0.66)' 
                    : 'calc(100% - 56px)'
                }}
              ></div>
              <div 
                className={`${styles.star} ${styles.starLow} ${impactLevel === 'low' ? styles.active : ''} ${(impactLevel === 'average' || impactLevel === 'high') ? styles.passed : ''}`}
                onClick={() => handleStarClick('low')}
                title="Low Impact"
              >
                <span>⭐</span>
              </div>
              <div 
                className={`${styles.star} ${styles.starAverage} ${impactLevel === 'average' ? styles.active : ''} ${impactLevel === 'high' ? styles.passed : ''}`}
                onClick={() => handleStarClick('average')}
                title="Average Impact"
              >
                <span>⭐</span>
              </div>
              <div 
                className={`${styles.star} ${styles.starHigh} ${impactLevel === 'high' ? styles.active : ''}`}
                onClick={() => handleStarClick('high')}
                title="High Impact"
              >
                <span>⭐</span>
              </div>
            </div>
            <p className={styles.impactDescription}>
              {impactLevel === 'low' && 'Low Impact - Standard visibility'}
              {impactLevel === 'average' && 'Average Impact - Moderate visibility'}
              {impactLevel === 'high' && 'High Impact - Maximum visibility'}
            </p>
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

