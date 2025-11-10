'use client'

import { useEffect } from 'react'
import Image from 'next/image'
import { FaTimes, FaTag, FaCalendar, FaEye, FaBuilding } from 'react-icons/fa'
import { formatDateShort } from '@/utils/dateUtils.js'
import styles from './styles/HighlightDetailsModal.module.css'

const HighlightDetailsModal = ({ highlight, isOpen, onClose }) => {
  // Lock body scroll when modal is open
  useEffect(() => {
    if (typeof document === 'undefined' || !document.body) {
      return
    }

    if (isOpen) {
      // Save current scroll position
      const scrollY = window.scrollY
      
      // Lock body scroll
      document.body.style.position = 'fixed'
      document.body.style.top = `-${scrollY}px`
      document.body.style.left = '0'
      document.body.style.right = '0'
      document.body.style.overflow = 'hidden'
      document.body.style.width = '100%'
      
      return () => {
        // Restore body scroll when modal closes
        if (typeof document !== 'undefined' && document.body) {
          document.body.style.position = ''
          document.body.style.top = ''
          document.body.style.left = ''
          document.body.style.right = ''
          document.body.style.overflow = ''
          document.body.style.width = ''
          
          // Restore scroll position
          if (typeof window !== 'undefined') {
            window.scrollTo(0, scrollY)
          }
        }
      }
    }
  }, [isOpen])

  if (!isOpen || !highlight) return null

  const getImageUrl = () => {
    if (!highlight.media || highlight.media.length === 0) return null
    
    // Get the first image from media array
    const firstImage = highlight.media.find(item => 
      item.type === 'image' || 
      item.mimetype?.startsWith('image/') ||
      /\.(jpg|jpeg|png|gif|webp)$/i.test(item.filename || item.url)
    )
    
    return firstImage?.url || firstImage?.filename || null
  }

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'approved': return '#1d9782'
      case 'pending': return '#8b8e8d'
      case 'rejected': return '#e53e3e'
      default: return '#6b7280'
    }
  }

  const imageUrl = getImageUrl()
  const statusColor = getStatusColor(highlight.status)

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <div className={styles.modalOverlay} onClick={handleOverlayClick}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Highlight Details</h2>
          <button 
            className={styles.modalCloseButton}
            onClick={onClose}
            aria-label="Close modal"
          >
            <FaTimes />
          </button>
        </div>
        
        <div className={styles.modalBody}>
          {/* Details Content */}
          <div className={styles.contentLayout}>
            {/* Top Section - Image and Highlight Info Side by Side */}
            <div className={styles.topSection}>
              {/* Left - Highlight Image */}
              <div className={styles.imageSection}>
                {imageUrl ? (
                  <Image 
                    src={imageUrl}
                    alt={highlight.title}
                    className={styles.highlightImage}
                    width={400}
                    height={300}
                    onError={(e) => {
                      e.target.style.display = 'none'
                      e.target.nextSibling.style.display = 'flex'
                    }}
                  />
                ) : null}
                <div className={styles.imagePlaceholder} style={{ display: imageUrl ? 'none' : 'flex' }}>
                  <FaEye />
                  <span>No image available</span>
                </div>
              </div>

              {/* Right - Highlight Title, Status, Details */}
              <div className={styles.highlightInfoSection}>
                <h3 className={styles.highlightTitle}>{highlight.title}</h3>
                
                {/* Status Badge */}
                {highlight.status && (
                  <div 
                    className={styles.statusBadge}
                    style={{ 
                      backgroundColor: statusColor,
                      color: 'white'
                    }}
                  >
                    {highlight.status.charAt(0).toUpperCase() + highlight.status.slice(1)}
                  </div>
                )}

                {/* Highlight Details */}
                <div className={styles.detailsSection}>
                  <div className={styles.detailsGrid}>
                    {highlight.organization_name && (
                      <div className={styles.detailItem}>
                        <FaBuilding className={styles.detailIcon} />
                        <div className={styles.detailContent}>
                          <span className={styles.detailLabel}>Organization</span>
                          <span className={styles.detailValue}>
                            {highlight.organization_name}
                            {highlight.organization_acronym && ` (${highlight.organization_acronym})`}
                          </span>
                        </div>
                      </div>
                    )}

                    {highlight.created_at && (
                      <div className={styles.detailItem}>
                        <FaCalendar className={styles.detailIcon} />
                        <div className={styles.detailContent}>
                          <span className={styles.detailLabel}>Created</span>
                          <span className={styles.detailValue}>
                            {formatDateShort(highlight.created_at)}
                          </span>
                        </div>
                      </div>
                    )}

                    {highlight.media && highlight.media.length > 0 && (
                      <div className={styles.detailItem}>
                        <FaTag className={styles.detailIcon} />
                        <div className={styles.detailContent}>
                          <span className={styles.detailLabel}>Media Files</span>
                          <span className={styles.detailValue}>
                            {highlight.media.length} {highlight.media.length === 1 ? 'file' : 'files'}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Description - Full Width Below */}
            <div className={styles.descriptionSection}>
              <h4 className={styles.sectionTitle}>Description</h4>
              <p className={styles.description}>
                {highlight.description || 'No description provided'}
              </p>
            </div>

            {/* Media Gallery - Full Width Below - Only show if there are multiple media files */}
            {highlight.media && highlight.media.length > 1 && (
              <div className={styles.mediaGallerySection}>
                <h4 className={styles.sectionTitle}>
                  Media Gallery ({highlight.media.length} {highlight.media.length === 1 ? 'file' : 'files'})
                </h4>
                <div className={styles.mediaGrid}>
                  {highlight.media.map((mediaItem, index) => {
                    const mediaUrl = mediaItem.url || mediaItem.filename
                    const isImage = mediaItem.type === 'image' || 
                                   mediaItem.mimetype?.startsWith('image/') ||
                                   /\.(jpg|jpeg|png|gif|webp)$/i.test(mediaItem.filename || mediaItem.url || '')
                    
                    return (
                      <div key={index} className={styles.mediaItemContainer}>
                        {isImage && mediaUrl ? (
                          <Image
                            src={mediaUrl}
                            alt={`Media ${index + 1}`}
                            className={styles.mediaItem}
                            width={150}
                            height={150}
                            onError={(e) => {
                              e.target.style.display = 'none'
                              e.target.nextSibling.style.display = 'flex'
                            }}
                          />
                        ) : (
                          <div className={styles.mediaPlaceholder}>
                            <FaEye />
                            <span>{mediaItem.type || 'File'}</span>
                          </div>
                        )}
                        <div className={styles.mediaPlaceholder} style={{ display: (isImage && mediaUrl) ? 'none' : 'flex' }}>
                          <FaEye />
                          <span>{mediaItem.type || 'File'}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className={styles.modalFooter}>
          <button onClick={onClose} className={styles.closeModalButton}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

export default HighlightDetailsModal

