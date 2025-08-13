'use client'

import React from 'react'
import { getProgramImageUrl } from '@/utils/uploadPaths'
import styles from '../programs.module.css'

const ProgramDetailsModal = ({ program, isOpen, onClose }) => {
  if (!isOpen || !program) return null

  // Use the new upload path utility
  const imageSource = getProgramImageUrl(program.image);

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
              Posted: {program.createdAt ? new Date(program.createdAt).toLocaleDateString() : 'N/A'}
            </span>
          </div>
          
          {/* Event Dates Section */}
          <div className={styles.eventDatesSection}>
            <h4 className={styles.eventDatesTitle}>Event Dates:</h4>
            {(() => {
              // Format event dates for display
              if (program.multipleDates && Array.isArray(program.multipleDates) && program.multipleDates.length > 0) {
                return (
                  <div className={styles.eventDatesList}>
                    {program.multipleDates.map((date, index) => (
                      <span key={index} className={styles.eventDateTag}>
                        {new Date(date).toLocaleDateString()}
                      </span>
                    ))}
                  </div>
                );
              } else if (program.eventStartDate && program.eventEndDate) {
                if (program.eventStartDate === program.eventEndDate) {
                  return (
                    <div className={styles.singleEventDate}>
                      {new Date(program.eventStartDate).toLocaleDateString()}
                    </div>
                  );
                } else {
                  return (
                    <div className={styles.eventDateRange}>
                      {new Date(program.eventStartDate).toLocaleDateString()} - {new Date(program.eventEndDate).toLocaleDateString()}
                    </div>
                  );
                }
              }
              return <div className={styles.noEventDates}>No event dates specified</div>;
            })()}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProgramDetailsModal
