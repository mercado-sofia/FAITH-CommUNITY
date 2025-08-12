'use client'

import React from 'react'
import styles from '../programs.module.css'

const ProgramDetailsModal = ({ program, isOpen, onClose }) => {
  if (!isOpen || !program) return null

  // Check if image is base64 data or file path
  const isBase64Image = program.image && program.image.startsWith('data:image');
  const imageSource = isBase64Image 
    ? program.image 
    : program.image 
      ? `http://localhost:8080/uploads/programs/${program.image}`
      : null;

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <div className={styles.modalOverlay} onClick={handleOverlayClick}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>{program.title}</h2>
          <button 
            className={styles.modalCloseButton}
            onClick={onClose}
            aria-label="Close modal"
          >
            ×
          </button>
        </div>
        
        <div className={styles.modalBody}>
          <div className={styles.modalImageContainer}>
            {imageSource ? (
              <img 
                src={imageSource}
                alt={program.title}
                className={styles.modalImage}
                onError={(e) => {
                  e.target.style.display = 'none'
                  e.target.nextSibling.style.display = 'flex'
                }}
              />
            ) : null}
            <div 
              className={styles.modalImagePlaceholder} 
              style={{ display: imageSource ? 'none' : 'flex' }}
            >
              <span>No Image</span>
            </div>
          </div>
          
          <p className={styles.modalCategory}>{program.category}</p>
          
          <div className={styles.modalDescription}>
            {program.description || 'No description available.'}
          </div>
          
          <div className={styles.modalFooter}>
            <span className={`${styles.modalStatusBadge} ${styles[program.status?.toLowerCase()]}`}>
              {program.status}
            </span>
            <span className={styles.modalDate}>
              Posted: {program.dateCreated ? new Date(program.dateCreated).toLocaleDateString() : 'N/A'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProgramDetailsModal
