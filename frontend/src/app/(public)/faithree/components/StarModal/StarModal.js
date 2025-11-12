'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'
import styles from './StarModal.module.css'

// Star Modal Component
export default function StarModal({ isOpen, onClose, starId, featuredHighlights = [] }) {
  const [isVisible, setIsVisible] = useState(false)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true)
      setCurrentImageIndex(0) // Reset to first image when modal opens
      if (typeof document !== 'undefined' && document.body) {
        document.body.style.overflow = 'hidden'
      }
    } else {
      setIsVisible(false)
      if (typeof document !== 'undefined' && document.body) {
        document.body.style.overflow = 'auto'
      }
    }

    return () => {
      if (typeof document !== 'undefined' && document.body) {
        document.body.style.overflow = 'auto'
      }
    }
  }, [isOpen])

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  // Map starId (1-8) to array index (0-7) to get the corresponding highlight
  const highlight = starId ? featuredHighlights[starId - 1] : null

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onClose()
    } else if (e.key === 'ArrowLeft' && highlight?.media && highlight.media.length > 1) {
      e.preventDefault()
      setCurrentImageIndex((prev) => (prev === 0 ? highlight.media.length - 1 : prev - 1))
    } else if (e.key === 'ArrowRight' && highlight?.media && highlight.media.length > 1) {
      e.preventDefault()
      setCurrentImageIndex((prev) => (prev === highlight.media.length - 1 ? 0 : prev + 1))
    }
  }

  const handlePreviousImage = (e) => {
    e.stopPropagation()
    if (highlight?.media && highlight.media.length > 1) {
      setCurrentImageIndex((prev) => (prev === 0 ? highlight.media.length - 1 : prev - 1))
    }
  }

  const handleNextImage = (e) => {
    e.stopPropagation()
    if (highlight?.media && highlight.media.length > 1) {
      setCurrentImageIndex((prev) => (prev === highlight.media.length - 1 ? 0 : prev + 1))
    }
  }

  const handleThumbnailClick = (index) => {
    setCurrentImageIndex(index)
  }

  if (!isOpen || typeof document === 'undefined' || !document.body) {
    return null
  }

  // If no highlight found for this star, don't show modal
  if (!highlight) {
    return null
  }

  // Format date
  const formattedDate = highlight.created_at 
    ? new Date(highlight.created_at).toLocaleDateString('en-US', { 
        month: 'short', 
        year: 'numeric' 
      })
    : ''

  const modalContent = (
    <div
      className={`${styles.starModalOverlay} ${isVisible ? styles.visible : ''}`}
      onClick={handleOverlayClick}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="star-modal-title"
    >
      <div className={`${styles.starModalContainer} ${isVisible ? styles.visible : ''}`}>
        {/* Circular Star Element - Positioned 50% above modal */}
        <div className={styles.starCircle}>
          <svg 
            className={styles.starIcon}
            viewBox="0 0 24 24" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
          >
            <path 
              d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z" 
              fill="currentColor"
            />
          </svg>
        </div>

        {/* Modal Content Box */}
        <div 
          className={styles.starModalContent}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onClose}
            className={styles.closeButton}
            aria-label="Close modal"
          >
            ×
          </button>
          
          <div className={styles.modalInner}>
            <h2
              id="star-modal-title"
              className={styles.modalTitle}
            >
              {highlight.title || 'Featured Highlight'}
            </h2>

            {/* Description Section */}
            {highlight.description && (
              <div className={styles.modalSection}>
                <div className={styles.descriptionContainer}>
                  <p className={styles.descriptionText}>
                    {highlight.description}
                  </p>
                </div>
              </div>
            )}

            {/* Media Gallery */}
            {highlight.media && highlight.media.length > 0 && (
              <div className={styles.modalSection}>
                <div className={styles.mediaGallery}>
                  <div className={styles.mainImageContainer}>
                    {highlight.media[currentImageIndex] && highlight.media[currentImageIndex].url && (
                      <Image
                        src={highlight.media[currentImageIndex].url}
                        alt={`${highlight.title || 'Highlight image'} - ${currentImageIndex + 1} of ${highlight.media.length}`}
                        fill
                        className={styles.mainImage}
                        sizes="700px"
                      />
                    )}
                    {/* Navigation Arrows - Only show if more than 1 image */}
                    {highlight.media.length > 1 && (
                      <>
                        <button
                          className={styles.navArrowLeft}
                          onClick={handlePreviousImage}
                          aria-label="Previous image"
                        >
                          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </button>
                        <button
                          className={styles.navArrowRight}
                          onClick={handleNextImage}
                          aria-label="Next image"
                        >
                          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </button>
                        {/* Image Counter */}
                        <div className={styles.imageCounter}>
                          {currentImageIndex + 1} / {highlight.media.length}
                        </div>
                      </>
                    )}
                  </div>
                  {highlight.media.length > 1 && (
                    <div className={styles.thumbnailGrid}>
                      {highlight.media.map((item, index) => (
                        <div
                          key={index}
                          className={`${styles.thumbnail} ${currentImageIndex === index ? styles.thumbnailActive : ''}`}
                          onClick={() => handleThumbnailClick(index)}
                        >
                          {item.url && (
                            <Image
                              src={item.url}
                              alt={`Thumbnail ${index + 1}`}
                              fill
                              className={styles.thumbnailImage}
                              sizes="70px"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Program Title - Below Media Area */}
            {highlight.program_title && (
              <div className={styles.modalSection}>
                <div className={styles.programTitleContainer}>
                  <p className={styles.programTitleText}>{highlight.program_title}</p>
                </div>
              </div>
            )}

            {/* Details Section */}
            <div className={`${styles.modalSection} ${styles.detailsSection}`}>
              <div className={styles.metadataList}>
                {highlight.organization_name && (
                  <div className={`${styles.metaItem} ${styles.organizationItem}`}>
                    <div className={styles.organizationLabel}>
                      <svg className={styles.metaIcon} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M19 21V5C19 3.89543 18.1046 3 17 3H7C5.89543 3 5 3.89543 5 5V21M19 21H5M19 21H21M5 21H3M9 7H15M9 11H15M9 15H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <span className={styles.metaLabel}>Organization</span>
                    </div>
                    <span className={styles.metaValue}>
                      {highlight.organization_name}
                      {highlight.organization_acronym && ` (${highlight.organization_acronym})`}
                    </span>
                  </div>
                )}
                {highlight.program_title && (
                  <div className={styles.metaItem}>
                    <svg className={styles.metaIcon} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M7 7H17M7 12H17M7 17H12M3 3H21C21.5523 3 22 3.44772 22 4V20C22 20.5523 21.5523 21 21 21H3C2.44772 21 2 20.5523 2 20V4C2 3.44772 2.44772 3 3 3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span className={styles.metaLabel}>Program:</span>
                    <span className={styles.metaValue}>{highlight.program_title}</span>
                  </div>
                )}
                {formattedDate && (
                  <div className={styles.metaItem}>
                    <svg className={styles.metaIcon} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M8 7V3M16 7V3M3 11H21M5 21H19C20.1046 21 21 20.1046 21 19V7C21 5.89543 20.1046 5 19 5H5C3.89543 5 3 5.89543 3 7V19C3 20.1046 3.89543 21 5 21Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span className={styles.metaLabel}>Date:</span>
                    <span className={styles.metaValue}>{formattedDate}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}

