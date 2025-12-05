'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'
import { formatDateShort } from '@/utils/shared/dateUtils'
import DOMPurify from 'dompurify'
import styles from './StarModal.module.css'

// Star Modal Component
export default function StarModal({ isOpen, onClose, starId, featuredHighlights = [] }) {
  const [isVisible, setIsVisible] = useState(false)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const modalInnerRef = useRef(null)
  const modalContentRef = useRef(null)
  const scrollTimeoutRef = useRef(null)
  const isScrollingRef = useRef(false)
  const videoRef = useRef(null)

  // Optimize scrolling performance by pausing animations during scroll
  const handleScroll = useCallback(() => {
    if (!modalContentRef.current) return
    
    // Mark as scrolling
    isScrollingRef.current = true
    
    // Pause animations during scroll for better performance
    modalContentRef.current.classList.add(styles.scrolling)
    
    // Clear existing timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current)
    }
    
    // Resume animations after scrolling stops
    scrollTimeoutRef.current = setTimeout(() => {
      isScrollingRef.current = false
      if (modalContentRef.current) {
        modalContentRef.current.classList.remove(styles.scrolling)
      }
    }, 150) // Resume after 150ms of no scrolling
  }, [])

  useEffect(() => {
    // Capture ref value at the start of the effect to use in cleanup
    const modalInner = modalInnerRef.current
    
    if (isOpen) {
      setIsVisible(true)
      setCurrentImageIndex(0) // Reset to first image when modal opens
      if (typeof document !== 'undefined' && document.body) {
        document.body.style.overflow = 'hidden'
      }
      
      // Add scroll listener for performance optimization
      if (modalInner) {
        modalInner.addEventListener('scroll', handleScroll, { passive: true })
      }
    } else {
      setIsVisible(false)
      // Pause video when modal closes
      if (videoRef.current) {
        videoRef.current.pause()
        videoRef.current.currentTime = 0
      }
      if (typeof document !== 'undefined' && document.body) {
        document.body.style.overflow = 'auto'
      }
      
      // Clean up scroll listener
      if (modalInner) {
        modalInner.removeEventListener('scroll', handleScroll)
      }
    }

    return () => {
      if (typeof document !== 'undefined' && document.body) {
        document.body.style.overflow = 'auto'
      }
      
      // Clean up scroll listener using captured value
      if (modalInner) {
        modalInner.removeEventListener('scroll', handleScroll)
      }
      // Clean up timeout - use ref directly since it may be set during effect execution
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
    }
  }, [isOpen, handleScroll])

  // Handle video cleanup when media index changes
  useEffect(() => {
    // When index changes, pause and reset any previously playing video
    if (videoRef.current) {
      videoRef.current.pause()
      videoRef.current.currentTime = 0
    }
  }, [currentImageIndex])

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  // Map starId (1-based index) to array index (0-based) to get the corresponding highlight
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
    // Pause current video if playing
    if (videoRef.current) {
      videoRef.current.pause()
      videoRef.current.currentTime = 0
    }
    if (highlight?.media && highlight.media.length > 1) {
      setCurrentImageIndex((prev) => (prev === 0 ? highlight.media.length - 1 : prev - 1))
    }
  }

  const handleNextImage = (e) => {
    e.stopPropagation()
    // Pause current video if playing
    if (videoRef.current) {
      videoRef.current.pause()
      videoRef.current.currentTime = 0
    }
    if (highlight?.media && highlight.media.length > 1) {
      setCurrentImageIndex((prev) => (prev === highlight.media.length - 1 ? 0 : prev + 1))
    }
  }

  const handleThumbnailClick = (index) => {
    // Pause current video if playing
    if (videoRef.current) {
      videoRef.current.pause()
      videoRef.current.currentTime = 0
    }
    setCurrentImageIndex(index)
  }

  // Helper function to detect if a media item is a video
  const isVideo = (mediaItem) => {
    if (!mediaItem) return false
    const mediaUrl = mediaItem.url || mediaItem.filename || ''
    return mediaItem.type === 'video' || 
           mediaItem.mimetype?.startsWith('video/') ||
           /\.(mp4|avi|mov|wmv|flv|webm|mkv)$/i.test(mediaUrl)
  }

  // Helper function to detect if a media item is an image
  const isImage = (mediaItem) => {
    if (!mediaItem) return false
    const mediaUrl = mediaItem.url || mediaItem.filename || ''
    return mediaItem.type === 'image' || 
           mediaItem.mimetype?.startsWith('image/') ||
           /\.(jpg|jpeg|png|gif|webp|svg|avif)$/i.test(mediaUrl)
  }

  if (!isOpen || typeof document === 'undefined' || !document.body) {
    return null
  }

  // If no highlight found for this star, don't show modal
  if (!highlight) {
    return null
  }

  // Format date - use formatDateShort and extract month and year
  const formattedDate = highlight.created_at 
    ? (() => {
        const formatted = formatDateShort(highlight.created_at);
        if (formatted === 'Invalid date' || formatted === 'Not specified') {
          return '';
        }
        // Extract month and year from formatDateShort output (e.g., "Sep 18, 2004" -> "Sep 2004")
        const parts = formatted.split(', ');
        if (parts.length >= 2) {
          const datePart = parts[0]; // "Sep 18"
          const year = parts[1]; // "2004"
          const month = datePart.split(' ')[0]; // "Sep"
          return `${month} ${year}`;
        }
        return formatted;
      })()
    : ''

  // Get current media item
  const currentMedia = highlight.media && highlight.media[currentImageIndex]
  const currentMediaUrl = currentMedia?.url || currentMedia?.filename
  const currentIsVideo = currentMedia ? isVideo(currentMedia) : false
  const currentIsImage = currentMedia ? isImage(currentMedia) : false

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
        </div>

        {/* Modal Content Box */}
        <div 
          ref={modalContentRef}
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
          
          <div 
            ref={modalInnerRef}
            className={styles.modalInner}
          >
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
                  <div 
                    className={styles.descriptionText}
                    dangerouslySetInnerHTML={{ 
                      __html: DOMPurify.sanitize(highlight.description) 
                    }} 
                  />
                </div>
              </div>
            )}

            {/* Media Gallery */}
            {highlight.media && highlight.media.length > 0 && (
              <div className={styles.modalSection}>
                <div className={styles.mediaGallery}>
                  <div className={styles.mainImageContainer}>
                    {currentMediaUrl && (
                      <>
                        {currentIsVideo ? (
                          <video
                            ref={videoRef}
                            controls
                            className={styles.mainVideo}
                            preload="metadata"
                            playsInline
                            key={currentImageIndex} // Force re-render when changing videos
                          >
                            <source src={currentMediaUrl} type={currentMedia.mimetype || 'video/mp4'} />
                            Your browser does not support the video tag.
                          </video>
                        ) : currentIsImage ? (
                          <Image
                            src={currentMediaUrl}
                            alt={`${highlight.title || 'Highlight media'} - ${currentImageIndex + 1} of ${highlight.media.length}`}
                            fill
                            className={styles.mainImage}
                            sizes="700px"
                          />
                        ) : null}
                      </>
                    )}
                    {/* Navigation Arrows - Only show if more than 1 media item */}
                    {highlight.media.length > 1 && (
                      <>
                        <button
                          className={styles.navArrowLeft}
                          onClick={handlePreviousImage}
                          aria-label="Previous media"
                        >
                          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </button>
                        <button
                          className={styles.navArrowRight}
                          onClick={handleNextImage}
                          aria-label="Next media"
                        >
                          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </button>
                        {/* Media Counter */}
                        <div className={styles.imageCounter}>
                          {currentImageIndex + 1} / {highlight.media.length}
                        </div>
                      </>
                    )}
                  </div>
                  {highlight.media.length > 1 && (
                    <div className={styles.thumbnailGrid}>
                      {highlight.media.map((item, index) => {
                        const itemUrl = item.url || item.filename
                        const itemIsVideo = isVideo(item)
                        const itemIsImage = isImage(item)
                        
                        return (
                          <div
                            key={index}
                            className={`${styles.thumbnail} ${currentImageIndex === index ? styles.thumbnailActive : ''}`}
                            onClick={() => handleThumbnailClick(index)}
                          >
                            {itemIsVideo && itemUrl ? (
                              <>
                                <video
                                  className={styles.thumbnailVideo}
                                  preload="metadata"
                                  muted
                                >
                                  <source src={itemUrl} type={item.mimetype || 'video/mp4'} />
                                </video>
                                <div className={styles.videoIndicator}>
                                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M8 5V19L19 12L8 5Z" fill="currentColor"/>
                                  </svg>
                                </div>
                              </>
                            ) : itemIsImage && itemUrl ? (
                              <Image
                                src={itemUrl}
                                alt={`Thumbnail ${index + 1}`}
                                fill
                                className={styles.thumbnailImage}
                                sizes="70px"
                              />
                            ) : null}
                          </div>
                        )
                      })}
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
                {highlight.year && (
                  <div className={styles.metaItem}>
                    <svg className={styles.metaIcon} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M8 7V3M16 7V3M3 11H21M5 21H19C20.1046 21 21 20.1046 21 19V7C21 5.89543 20.1046 5 19 5H5C3.89543 5 3 5.89543 3 7V19C3 20.1046 3.89543 21 5 21Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span className={styles.metaLabel}>Year:</span>
                    <span className={styles.metaValue}>{highlight.year}</span>
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

