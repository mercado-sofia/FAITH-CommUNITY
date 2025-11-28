import { useEffect, useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import styles from './styles/FeatureConfirmationModal.module.css'

const FeatureConfirmationModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  highlightTitle, 
  isLoading = false,
  mode = 'add' // 'add' or 'remove'
}) => {
  const [impactLevel, setImpactLevel] = useState('low') // 'low', 'average', 'high'
  const [isDragging, setIsDragging] = useState(false)
  const starContainerRef = useRef(null)
  
  const isAddMode = mode === 'add'
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

  // Reset impact level when modal opens (only for add mode)
  useEffect(() => {
    if (isOpen && isAddMode) {
      setImpactLevel('low')
    }
  }, [isOpen, isAddMode])

  const handleStarClick = (level) => {
    // Only allow interaction in add mode
    if (!isAddMode || isLoading) return
    setImpactLevel(level)
  }

  const handleMouseDown = (e) => {
    // Only allow interaction in add mode
    if (!isAddMode || isLoading) return
    setIsDragging(true)
    handleStarInteraction(e)
  }

  const handleMouseMove = (e) => {
    // Only allow interaction in add mode
    if (!isAddMode || isLoading) return
    if (isDragging) {
      handleStarInteraction(e)
    }
  }

  const handleMouseUp = () => {
    if (!isAddMode) return
    setIsDragging(false)
  }

  const handleStarInteraction = (e) => {
    if (!starContainerRef.current || !isAddMode) return
    
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
    if (isLoading || !onConfirm) return
    // For add mode, pass impactLevel; for remove mode, no parameter needed
    if (isAddMode) {
      onConfirm(impactLevel)
    } else {
      onConfirm()
    }
  }

  // Determine content based on mode
  const title = isAddMode ? 'Add to Featured Highlights' : 'Remove from Featured'
  const infoText = isAddMode
    ? 'This will make the highlight appear prominently in FAITHree, giving it more visibility to users.'
    : 'This will remove the highlight from FAITHree, but it will remain in the regular Highlights section.'
  const buttonText = isAddMode ? 'Confirm' : 'Remove'
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
            aria-label="Close"
          >
            ×
          </button>
        </div>
        
        <div className={styles.modalBody}>
          {/* Confirmation Section */}
          <div className={styles.confirmationSection}>
            <p className={styles.confirmationText}>
              Are you sure you want to {isAddMode ? 'add' : 'remove'} <strong>&ldquo;{highlightTitle || 'this highlight'}&rdquo;</strong> {isAddMode ? 'to' : 'from'} FAITHree?
            </p>
            <div className={styles.infoBox}>
              <p className={styles.infoText}>
                {infoText}
              </p>
            </div>
          </div>

          {/* Impact Level Selector Section - Only for add mode */}
          {isAddMode && (
            <div className={styles.impactSelector}>
              <div className={styles.impactHeader}>
                <h4 className={styles.impactLabel}>Select Impact Level</h4>
                <p className={styles.impactExplanation}>
                  Choose how prominently this highlight will be displayed
                </p>
              </div>
              <div 
                className={styles.starContainer}
                ref={starContainerRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                style={{ pointerEvents: isLoading ? 'none' : 'auto', opacity: isLoading ? 0.6 : 1 }}
              >
                <div className={styles.starLine}></div>
                <div 
                  className={`${styles.starLineProgress} ${isDragging ? styles.dragging : ''}`}
                  style={{
                    width: impactLevel === 'low' 
                      ? '0px' 
                      : impactLevel === 'average' 
                      ? 'calc((100% - 66px) * 0.5)' 
                      : 'calc(100% - 66px)',
                    display: impactLevel === 'low' ? 'none' : 'block'
                  }}
                ></div>
                <div 
                  className={`${styles.star} ${styles.starLow} ${impactLevel === 'low' ? styles.active : ''} ${(impactLevel === 'average' || impactLevel === 'high') ? styles.passed : ''}`}
                  onClick={() => handleStarClick('low')}
                  title="Small Impact"
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
              <div className={`${styles.impactDescriptionBox} ${styles[`impact${impactLevel.charAt(0).toUpperCase() + impactLevel.slice(1)}`]}`}>
                <p className={styles.impactDescription}>
                  {impactLevel === 'low' && 'Small Impact - Standard visibility'}
                  {impactLevel === 'average' && 'Average Impact - Moderate visibility'}
                  {impactLevel === 'high' && 'High Impact - Maximum visibility'}
                </p>
              </div>
            </div>
          )}
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