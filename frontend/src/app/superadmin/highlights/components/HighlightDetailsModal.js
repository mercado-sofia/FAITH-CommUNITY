'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Image from 'next/image'
import { FaTimes, FaTag, FaCalendar, FaEye, FaBuilding, FaChevronLeft, FaChevronRight, FaArchive, FaTrash } from 'react-icons/fa'
import { formatDateShort } from '@/utils/shared/dateUtils'
import DOMPurify from 'dompurify'
import logger from '@/utils/shared/logger'
import ArchiveConfirmationModal from './ArchiveConfirmationModal'
import DeleteConfirmationModal from './DeleteConfirmationModal'
import { useArchiveHighlightMutation, useDeleteHighlightMutation } from '@/rtk/superadmin/highlightsApi'
import styles from './styles/HighlightDetailsModal.module.css'

const HighlightDetailsModal = ({ highlight, isOpen, onClose, onActionComplete }) => {
  const scrollPositionRef = useRef(0)
  const [programTitle, setProgramTitle] = useState(null)
  const [loadingProgram, setLoadingProgram] = useState(false)
  const [imageViewerOpen, setImageViewerOpen] = useState(false)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [allImages, setAllImages] = useState([])
  const [archiveModalOpen, setArchiveModalOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [isArchiving, setIsArchiving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const [archiveHighlight] = useArchiveHighlightMutation()
  const [deleteHighlight] = useDeleteHighlightMutation()

  // Lock scroll when modal is open
  useEffect(() => {
    if (typeof document === 'undefined' || !document.body) {
      return
    }

    if (isOpen) {
      // Find the scrollable container (main.content element in superadmin layout)
      // The superadmin layout uses a .content container with overflow-y: auto
      const scrollableContainer = document.querySelector('main[class*="content"]') || 
                                  document.querySelector('.content') ||
                                  document.documentElement
      
      // Save current scroll position BEFORE locking
      // Use the scrollable container's scroll position, not window.scrollY
      const scrollY = scrollableContainer === document.documentElement 
        ? window.scrollY 
        : scrollableContainer.scrollTop
      
      scrollPositionRef.current = scrollY
      
      // Lock scroll by setting overflow: hidden on the scrollable container
      // Don't use position: fixed on body as it causes scroll reset issues
      if (scrollableContainer !== document.documentElement) {
        // For container scroll, just lock the container
        scrollableContainer.style.overflow = 'hidden'
      } else {
        // For window scroll, lock body
        document.body.style.overflow = 'hidden'
      }
      
      // Cleanup function to restore scroll when modal closes
      return () => {
        if (typeof document !== 'undefined' && typeof window !== 'undefined') {
          const savedScrollY = scrollPositionRef.current
          
          // Find the scrollable container again (in case DOM changed)
          const scrollableContainer = document.querySelector('main[class*="content"]') || 
                                      document.querySelector('.content') ||
                                      document.documentElement
          
          // Restore scroll position FIRST, before restoring overflow
          // This prevents the browser from resetting scroll to 0
          if (scrollableContainer === document.documentElement) {
            // Window scroll
            document.documentElement.scrollTop = savedScrollY
            window.scrollTo(0, savedScrollY)
          } else {
            // Container scroll - restore directly
            scrollableContainer.scrollTop = savedScrollY
          }
          
          // Then restore overflow
          if (scrollableContainer !== document.documentElement) {
            scrollableContainer.style.overflow = ''
          } else {
            document.body.style.overflow = ''
          }
          
          // Double-check scroll position after a brief moment
          // This ensures scroll is maintained even if browser tries to reset it
          setTimeout(() => {
            if (scrollableContainer === document.documentElement) {
              if (window.scrollY !== savedScrollY) {
                window.scrollTo(0, savedScrollY)
              }
            } else {
              if (scrollableContainer.scrollTop !== savedScrollY) {
                scrollableContainer.scrollTop = savedScrollY
              }
            }
          }, 0)
        }
      }
    }
  }, [isOpen])

  // Fetch program title when program_id is available but program_title is not
  useEffect(() => {
    const fetchProgramTitle = async () => {
      // If already have title, use it
      if (highlight?.program_title) {
        setProgramTitle(highlight.program_title)
        return
      }

      // If no program_id, try to fetch from submission record
      if (highlight?.program_id === null || highlight?.program_id === undefined || highlight?.program_id === '') {
        // Try to get program_id from submission if highlight doesn't have it
        setLoadingProgram(true)
        try {
          const { API_BASE_URL } = await import('@/config/api');
          // Try to find submission for this highlight using the correct endpoint
          const apiUrl = `${API_BASE_URL || ''}/api/approvals`
          const response = await fetch(apiUrl, {
            credentials: 'include', // CRITICAL: Include httpOnly cookies
            headers: {
              'Content-Type': 'application/json',
            },
          })

          if (response.ok) {
            const result = await response.json()
            // Response structure: { success: true, data: [submissions] }
            const submissions = result.success ? result.data : (result.submissions || [])
            
            // Find submission for this highlight
            // Match by: section='highlights', status='approved', and title matches
            const highlightSubmission = submissions.find(sub => {
              if (sub.section !== 'highlights' || sub.status !== 'approved') {
                return false
              }
              
              try {
                const proposedData = typeof sub.proposed_data === 'string' 
                  ? JSON.parse(sub.proposed_data) 
                  : sub.proposed_data
                
                // Match by title (most reliable) or highlight_id
                const titleMatch = proposedData?.title === highlight?.title
                const idMatch = proposedData?.highlight_id === highlight?.id
                const orgMatch = sub.organization_id === highlight?.organization_id
                
                // If title matches and org matches, or if highlight_id matches, this is likely the right submission
                return (titleMatch && orgMatch) || idMatch
              } catch {
                return false
              }
            })

            if (highlightSubmission) {
              try {
                const proposedData = typeof highlightSubmission.proposed_data === 'string' 
                  ? JSON.parse(highlightSubmission.proposed_data) 
                  : highlightSubmission.proposed_data
                
                if (proposedData?.program_id) {
                  // Found program_id in submission, now fetch the program title
                  const { API_BASE_URL } = await import('@/config/api');
                  const programResponse = await fetch(
                    `${API_BASE_URL || ''}/api/projects/superadmin/${proposedData.program_id}`,
                    {
                      credentials: 'include', // CRITICAL: Include httpOnly cookies
                      headers: {
                        'Content-Type': 'application/json',
                      },
                    }
                  )

                  if (programResponse.ok) {
                    const programResult = await programResponse.json()
                    if (programResult.success && programResult.data?.title) {
                      setProgramTitle(programResult.data.title)
                    } else if (programResult.title) {
                      setProgramTitle(programResult.title)
                    }
                  }
                }
              } catch (e) {
                logger.error('Error parsing submission data', e, { context: 'HighlightDetailsModal' })
              }
            }
          }
        } catch (error) {
          logger.error('Error fetching program from submission', error, { context: 'HighlightDetailsModal' })
        } finally {
          setLoadingProgram(false)
        }
        return
      }

      // Fetch program title from API using program_id
      setLoadingProgram(true)
      try {
        const { API_BASE_URL } = await import('@/config/api');
        const apiUrl = `${API_BASE_URL || ''}/api/projects/superadmin/${highlight.program_id}`
        const response = await fetch(apiUrl, {
          credentials: 'include', // CRITICAL: Include httpOnly cookies
          headers: {
            'Content-Type': 'application/json',
          },
        })

        if (response.ok) {
          const result = await response.json()
          if (result.success && result.data?.title) {
            setProgramTitle(result.data.title)
          } else if (result.title) {
            // Fallback: check if title is at root level
            setProgramTitle(result.title)
          }
        }
      } catch (error) {
        logger.error('Error fetching program title', error, { context: 'HighlightDetailsModal' })
      } finally {
        setLoadingProgram(false)
      }
    }

    if (isOpen && highlight) {
      fetchProgramTitle()
    } else {
      // Reset when modal closes or highlight changes
      setProgramTitle(null)
      setLoadingProgram(false)
    }
  }, [isOpen, highlight])

  // Get all images from media - must be before early return
  useEffect(() => {
    if (!highlight) {
      setAllImages([])
      return
    }

    if (highlight?.media && highlight.media.length > 0) {
      const images = highlight.media
        .filter(item => {
          const isImage = item.type === 'image' || 
                         item.mimetype?.startsWith('image/') ||
                         /\.(jpg|jpeg|png|gif|webp)$/i.test(item.filename || item.url || '')
          return isImage && (item.url || item.filename)
        })
        .map((item, index) => ({
          src: item.url || item.filename,
          alt: `Highlight image ${index + 1}`,
          index
        }))
      setAllImages(images)
    } else {
      setAllImages([])
    }
  }, [highlight])

  const closeImageViewer = useCallback(() => {
    setImageViewerOpen(false)
  }, [])

  const navigateImage = useCallback((direction) => {
    setCurrentImageIndex((prev) => {
      if (allImages.length === 0) return prev
      if (direction === 'next') {
        return (prev + 1) % allImages.length
      } else {
        return (prev - 1 + allImages.length) % allImages.length
      }
    })
  }, [allImages.length])

  // Handle keyboard navigation in image viewer
  useEffect(() => {
    if (!imageViewerOpen) return

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        closeImageViewer()
      } else if (e.key === 'ArrowLeft') {
        navigateImage('prev')
      } else if (e.key === 'ArrowRight') {
        navigateImage('next')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [imageViewerOpen, navigateImage, closeImageViewer])

  // Early return after all hooks
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

  // Get impact level label
  const getImpactLevelLabel = (impactLevel) => {
    if (!impactLevel) return null
    switch (impactLevel.toLowerCase()) {
      case 'low':
        return 'Small Impact'
      case 'average':
        return 'Average Impact'
      case 'high':
        return 'High Impact'
      default:
        return null
    }
  }

  const imageUrl = getImageUrl()

  const openImageViewer = (index = 0) => {
    setCurrentImageIndex(index)
    setImageViewerOpen(true)
  }

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  // Handle archive
  const handleArchive = async () => {
    if (!highlight) return
    
    setIsArchiving(true)
    try {
      await archiveHighlight(highlight.id).unwrap()
      setArchiveModalOpen(false)
      onClose()
      if (onActionComplete) {
        onActionComplete()
      }
      // Trigger refresh event
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('highlightStatusChanged'))
      }
    } catch (error) {
      console.error('Error archiving highlight:', error)
      alert('Failed to archive highlight. Please try again.')
    } finally {
      setIsArchiving(false)
    }
  }

  // Handle delete
  const handleDelete = async () => {
    if (!highlight) return
    
    setIsDeleting(true)
    try {
      await deleteHighlight(highlight.id).unwrap()
      setDeleteModalOpen(false)
      onClose()
      if (onActionComplete) {
        onActionComplete()
      }
      // Trigger refresh event
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('highlightStatusChanged'))
      }
    } catch (error) {
      console.error('Error deleting highlight:', error)
      alert('Failed to delete highlight. Please try again.')
    } finally {
      setIsDeleting(false)
    }
  }

  // Only show archive/delete buttons if highlight is approved (not already archived)
  const showActions = highlight?.status === 'approved'

  return (
    <div className={styles.modalOverlay} onClick={handleOverlayClick}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>{highlight.title}</h2>
          <button 
            className={styles.modalCloseButton}
            onClick={onClose}
            aria-label="Close modal"
          >
            <FaTimes />
          </button>
        </div>
        
        <div className={styles.modalBody}>
          <div className={styles.contentLayout}>
            {/* Image Section - Full Width */}
            {imageUrl && (
              <div 
                className={styles.imageSection}
                onClick={() => openImageViewer(0)}
              >
                <Image 
                  src={imageUrl}
                  alt={highlight.title}
                  className={styles.highlightImage}
                  width={800}
                  height={450}
                  onError={(e) => {
                    e.target.style.display = 'none'
                    e.target.nextSibling.style.display = 'flex'
                  }}
                />
                <div className={styles.imageOverlay}>
                  <FaEye className={styles.imageOverlayIcon} />
                  <span className={styles.imageOverlayText}>Click to view full screen</span>
                </div>
                <div className={styles.imagePlaceholder} style={{ display: 'none' }}>
                  <FaEye />
                  <span>No image available</span>
                </div>
              </div>
            )}

            {/* Information Grid - Two Columns */}
            <div className={styles.infoGrid}>
              {highlight.organization_name && (
                <div className={styles.infoItem}>
                  <div className={styles.infoLabel}>
                    <FaBuilding className={styles.infoIcon} />
                    <span>Organization</span>
                  </div>
                  <div className={styles.infoValue}>
                    {highlight.organization_name}
                    {highlight.organization_acronym && ` (${highlight.organization_acronym})`}
                  </div>
                </div>
              )}

              {(highlight.program_title || highlight.program_id || programTitle) && (
                <div className={styles.infoItem}>
                  <div className={styles.infoLabel}>
                    <FaTag className={styles.infoIcon} />
                    <span>Associated Program</span>
                  </div>
                  <div className={styles.infoValue}>
                    {loadingProgram ? (
                      'Loading...'
                    ) : highlight.program_title || programTitle || `Program ID: ${highlight.program_id}`}
                  </div>
                </div>
              )}

              {highlight.year && (
                <div className={styles.infoItem}>
                  <div className={styles.infoLabel}>
                    <FaCalendar className={styles.infoIcon} />
                    <span>Year</span>
                  </div>
                  <div className={styles.infoValue}>{highlight.year}</div>
                </div>
              )}
            </div>

            {/* Description Section */}
            <div className={styles.descriptionSection}>
              <h4 className={styles.sectionTitle}>Description</h4>
              <div 
                className={styles.description}
                dangerouslySetInnerHTML={{ 
                  __html: highlight.description 
                    ? DOMPurify.sanitize(highlight.description) 
                    : '<p style="color: #9ca3af; font-style: italic;">No description provided</p>' 
                }} 
              />
            </div>

            {/* Media Gallery Section */}
            {highlight.media && highlight.media.length > 0 && (
              <div className={styles.mediaGallerySection}>
                <h4 className={styles.sectionTitle}>
                  Media Gallery <span className={styles.mediaCount}>({highlight.media.length} {highlight.media.length === 1 ? 'File' : 'Files'})</span>
                </h4>
                <div className={styles.mediaGrid}>
                  {highlight.media.map((mediaItem, index) => {
                    const mediaUrl = mediaItem.url || mediaItem.filename
                    const isVideo = mediaItem.type === 'video' || 
                                   mediaItem.mimetype?.startsWith('video/') ||
                                   /\.(mp4|avi|mov|wmv|flv|webm|mkv)$/i.test(mediaItem.filename || mediaItem.url || '')
                    const isImage = mediaItem.type === 'image' || 
                                   mediaItem.mimetype?.startsWith('image/') ||
                                   /\.(jpg|jpeg|png|gif|webp)$/i.test(mediaItem.filename || mediaItem.url || '')
                    
                    return (
                      <div key={index} className={styles.mediaItemContainer}>
                        {isVideo && mediaUrl ? (
                          <video
                            controls
                            className={styles.videoPlayer}
                            preload="metadata"
                          >
                            <source src={mediaUrl} type={mediaItem.mimetype || 'video/mp4'} />
                            Your browser does not support the video tag.
                          </video>
                        ) : isImage && mediaUrl ? (
                          <div
                            onClick={(e) => {
                              e.stopPropagation()
                              const imageIndex = allImages.findIndex(img => {
                                const imgSrc = img.src
                                const mediaSrc = mediaUrl
                                return imgSrc === mediaSrc || 
                                       imgSrc?.endsWith(mediaSrc) || 
                                       mediaSrc?.endsWith(imgSrc)
                              })
                              openImageViewer(imageIndex >= 0 ? imageIndex : allImages.length > 0 ? 0 : 0)
                            }}
                            style={{ cursor: 'pointer' }}
                          >
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
                          </div>
                        ) : (
                          <div className={styles.mediaPlaceholder}>
                            <FaEye />
                            <span>{mediaItem.type || 'File'}</span>
                          </div>
                        )}
                        {!isVideo && !isImage && (
                          <div className={styles.mediaPlaceholder} style={{ display: 'flex' }}>
                            <FaEye />
                            <span>{mediaItem.type || 'File'}</span>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className={styles.modalFooter}>
          {highlight.created_at && (
            <div className={styles.footerDate}>
              Date Created: {formatDateShort(highlight.created_at)}
            </div>
          )}
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            {showActions && (
              <>
                <button
                  onClick={() => setArchiveModalOpen(true)}
                  className={styles.archiveButton}
                  disabled={isArchiving || isDeleting}
                >
                  <FaArchive style={{ marginRight: '0.5rem' }} />
                  Archive
                </button>
                <button
                  onClick={() => setDeleteModalOpen(true)}
                  className={styles.deleteButton}
                  disabled={isArchiving || isDeleting}
                >
                  <FaTrash style={{ marginRight: '0.5rem' }} />
                  Delete
                </button>
              </>
            )}
            <button onClick={onClose} className={styles.closeModalButton}>
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Full Screen Image Viewer */}
      {imageViewerOpen && allImages.length > 0 && (
        <div className={styles.imageViewerOverlay} onClick={closeImageViewer}>
          <div className={styles.imageViewerModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.imageViewerHeader}>
              <div className={styles.imageInfo}>
                <span className={styles.imageTitle}>
                  {allImages[currentImageIndex]?.alt || highlight.title}
                </span>
                {allImages.length > 1 && (
                  <span className={styles.imageCounter}>
                    {currentImageIndex + 1} of {allImages.length}
                  </span>
                )}
              </div>
              <button 
                onClick={closeImageViewer}
                className={styles.imageViewerCloseBtn}
                aria-label="Close image viewer"
              >
                <FaTimes />
              </button>
            </div>
            
            <div className={styles.imageViewerContent}>
              {allImages.length > 1 && (
                <>
                  <button 
                    onClick={() => navigateImage('prev')}
                    className={`${styles.imageNavBtn} ${styles.prevBtn}`}
                    aria-label="Previous image"
                  >
                    <FaChevronLeft />
                  </button>
                  <button 
                    onClick={() => navigateImage('next')}
                    className={`${styles.imageNavBtn} ${styles.nextBtn}`}
                    aria-label="Next image"
                  >
                    <FaChevronRight />
                  </button>
                </>
              )}
              
              <div className={styles.imageViewerImageContainer}>
                <Image
                  src={allImages[currentImageIndex]?.src}
                  alt={allImages[currentImageIndex]?.alt || 'Highlight image'}
                  width={1200}
                  height={800}
                  style={{ objectFit: 'contain', maxWidth: '100%', maxHeight: '100%' }}
                  className={styles.viewerImage}
                  unoptimized
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Archive Confirmation Modal */}
      <ArchiveConfirmationModal
        isOpen={archiveModalOpen}
        onClose={() => setArchiveModalOpen(false)}
        onConfirm={handleArchive}
        highlightTitle={highlight?.title}
        organizationName={highlight?.organization_name}
        isLoading={isArchiving}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDelete}
        highlightTitle={highlight?.title}
        organizationName={highlight?.organization_name}
        isLoading={isDeleting}
      />
    </div>
  )
}

export default HighlightDetailsModal

