import React, { useState } from 'react';
import Image from 'next/image';
import { FaTimes, FaCheck, FaEye, FaExpand, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { getProgramImageUrl } from '@/utils/uploadPaths';
import styles from './styles/ViewDetailsModal.module.css';

const ViewDetailsModal = ({ 
  isOpen, 
  onClose, 
  submissionData 
}) => {
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [allImages, setAllImages] = useState([]);

  if (!isOpen || !submissionData) return null;

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getSectionDisplayName = (section) => {
    const sectionMap = {
      'organization': 'Organization Information',
      'advocacy': 'Advocacy Information',
      'competency': 'Competency Information',
      'programs': 'Program Information'
    };
    return sectionMap[section] || section;
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      'pending': { text: 'Pending', className: styles.statusPending },
      'approved': { text: 'Approved', className: styles.statusApproved },
      'rejected': { text: 'Rejected', className: styles.statusRejected }
    };
    
    const config = statusConfig[status] || statusConfig['pending'];
    return (
      <span className={`${styles.statusBadge} ${config.className}`}>
        {config.text}
      </span>
    );
  };

  // Parse program data for display
  const getProgramData = () => {
    if (submissionData.section !== 'programs') return null;
    try {
      return typeof submissionData.proposed_data === 'string' 
        ? JSON.parse(submissionData.proposed_data) 
        : submissionData.proposed_data;
    } catch (error) {
      return null;
    }
  };

  const programData = getProgramData();

  // Handle image viewing
  const openImageViewer = (images, startIndex = 0) => {
    setAllImages(images);
    setCurrentImageIndex(startIndex);
    setImageViewerOpen(true);
  };

  const closeImageViewer = () => {
    setImageViewerOpen(false);
    setAllImages([]);
    setCurrentImageIndex(0);
  };

  const navigateImage = (direction) => {
    if (direction === 'next') {
      setCurrentImageIndex((prev) => (prev + 1) % allImages.length);
    } else {
      setCurrentImageIndex((prev) => (prev - 1 + allImages.length) % allImages.length);
    }
  };

  // Get all images for the image viewer
  const getAllProgramImages = () => {
    if (!programData) return [];
    const images = [];
    
    if (programData.image) {
      images.push({
        src: getProgramImageUrl(programData.image) || '/default-profile.png',
        alt: 'Main Program Image',
        type: 'main'
      });
    }
    
    if (programData.additionalImages && Array.isArray(programData.additionalImages)) {
      programData.additionalImages.forEach((image, index) => {
        images.push({
          src: getProgramImageUrl(image) || '/default-profile.png',
          alt: `Additional Image ${index + 1}`,
          type: 'additional'
        });
      });
    }
    
    return images;
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.detailsModal}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>Submission Details</h3>
          <button 
            onClick={onClose}
            className={styles.modalCloseBtn}
          >
            ×
          </button>
        </div>
        
        <div className={styles.modalBody}>
          {/* Basic submission info */}
          <div className={styles.submissionInfo}>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Section:</span>
              <span className={styles.infoValue}>{getSectionDisplayName(submissionData.section)}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Submitted By:</span>
              <span className={styles.infoValue}>
                {submissionData.orgName || 'Unknown Organization'} ({submissionData.org || `Org #${submissionData.organization_id}`})
              </span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Date:</span>
              <span className={styles.infoValue}>{formatDate(submissionData.submitted_at)}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Status:</span>
              <span className={styles.infoValue}>{getStatusBadge(submissionData.status || 'pending')}</span>
            </div>
          </div>

          {/* Content sections based on submission type */}
          {submissionData.section === 'programs' && programData ? (
            <div className={styles.contentSections}>
              {/* Description Section */}
              {programData.description && (
                <div className={styles.contentSection}>
                  <h4 className={styles.sectionTitle}>DESCRIPTION:</h4>
                  <div className={styles.descriptionBox}>
                    {programData.description}
                  </div>
                </div>
              )}

              {/* Enhanced Main Image Section */}
              {programData.image && (
                <div className={styles.contentSection}>
                  <h4 className={styles.sectionTitle}>MAIN IMAGE:</h4>
                  <div className={styles.mainImageContainer}>
                    <div className={styles.imageWrapper} onClick={() => openImageViewer(getAllProgramImages(), 0)}>
                      <Image 
                        src={getProgramImageUrl(programData.image) || '/default-profile.png'} 
                        alt="Program Main Image" 
                        width={400}
                        height={300}
                        style={{objectFit: 'cover', borderRadius: '12px'}} 
                        className={styles.mainImage}
                      />
                      <div className={styles.imageOverlay}>
                        <FaExpand className={styles.expandIcon} />
                        <span className={styles.viewText}>Click to view</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Enhanced Additional Images Section */}
              {programData.additionalImages && Array.isArray(programData.additionalImages) && programData.additionalImages.length > 0 && (
                <div className={styles.contentSection}>
                  <h4 className={styles.sectionTitle}>ADDITIONAL IMAGES ({programData.additionalImages.length}):</h4>
                  <div className={styles.additionalImagesContainer}>
                    {programData.additionalImages.map((image, index) => (
                      <div 
                        key={index} 
                        className={styles.additionalImageWrapper}
                        onClick={() => openImageViewer(getAllProgramImages(), index + 1)}
                      >
                        <Image 
                          src={getProgramImageUrl(image) || '/default-profile.png'} 
                          alt={`Additional image ${index + 1}`} 
                          width={120}
                          height={120}
                          style={{objectFit: 'cover', borderRadius: '8px'}} 
                          className={styles.additionalImage}
                        />
                        <div className={styles.imageOverlay}>
                          <FaEye className={styles.viewIcon} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Program Details Summary */}
              <div className={styles.contentSection}>
                <h4 className={styles.sectionTitle}>PROGRAM DETAILS:</h4>
                <div className={styles.programSummary}>
                  <div className={styles.summaryItem}>
                    <strong>Title:</strong> {programData.title || 'N/A'}
                  </div>
                  <div className={styles.summaryItem}>
                    <strong>Category:</strong> {programData.category || 'N/A'}
                  </div>
                  <div className={styles.summaryItem}>
                    <strong>Status:</strong> {programData.status || 'N/A'}
                  </div>
                  {(() => {
                    // Format event dates for display
                    if (programData.multiple_dates && Array.isArray(programData.multiple_dates) && programData.multiple_dates.length > 0) {
                      return (
                        <div className={styles.summaryItem}>
                          <strong>Event Dates:</strong>
                          <div className={styles.eventDatesList}>
                            {programData.multiple_dates.map((date, index) => (
                              <span key={index} className={styles.eventDateTag}>
                                {new Date(date).toLocaleDateString()}
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    } else if (programData.event_start_date && programData.event_end_date) {
                      if (programData.event_start_date === programData.event_end_date) {
                        return (
                          <div className={styles.summaryItem}>
                            <strong>Event Date:</strong> {new Date(programData.event_start_date).toLocaleDateString()}
                          </div>
                        );
                      } else {
                        return (
                          <div className={styles.summaryItem}>
                            <strong>Event Date Range:</strong> {new Date(programData.event_start_date).toLocaleDateString()} - {new Date(programData.event_end_date).toLocaleDateString()}
                          </div>
                        );
                      }
                    }
                    return null;
                  })()}
                </div>
              </div>
            </div>
          ) : (
            // For non-program submissions, show data comparison
            <div className={styles.contentSections}>
              <div className={styles.contentSection}>
                <h4 className={styles.sectionTitle}>DATA CHANGES:</h4>
                {submissionData.section === 'advocacy' || submissionData.section === 'competency' ? (
                  <div className={styles.textDataContainer}>
                    <div className={styles.dataBlock}>
                      <h5>Previous Data:</h5>
                      <div className={styles.dataContent}>
                        {submissionData.previous_data || "No previous data"}
                      </div>
                    </div>
                    <div className={styles.dataBlock}>
                      <h5>Proposed Data:</h5>
                      <div className={styles.dataContent}>
                        {submissionData.proposed_data || "No proposed data"}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className={styles.jsonDataContainer}>
                    <div className={styles.dataBlock}>
                      <h5>Previous Data:</h5>
                      <pre className={styles.jsonData}>
                        {JSON.stringify(submissionData.previous_data, null, 2)}
                      </pre>
                    </div>
                    <div className={styles.dataBlock}>
                      <h5>Proposed Data:</h5>
                      <pre className={styles.jsonData}>
                        {JSON.stringify(submissionData.proposed_data, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        
        <div className={styles.modalFooter}>
          <button 
            onClick={onClose}
            className={styles.modalCloseFooterBtn}
          >
            Close
          </button>
        </div>
      </div>

      {/* Image Viewer Modal */}
      {imageViewerOpen && allImages.length > 0 && (
        <div className={styles.imageViewerOverlay} onClick={closeImageViewer}>
          <div className={styles.imageViewerModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.imageViewerHeader}>
              <div className={styles.imageInfo}>
                <span className={styles.imageTitle}>{allImages[currentImageIndex]?.alt}</span>
                <span className={styles.imageCounter}>
                  {currentImageIndex + 1} of {allImages.length}
                </span>
              </div>
              <button 
                onClick={closeImageViewer}
                className={styles.imageViewerCloseBtn}
              >
                <FaTimes />
              </button>
            </div>
            
            <div className={styles.imageViewerContent}>
              {allImages.length > 1 && (
                <button 
                  onClick={() => navigateImage('prev')}
                  className={`${styles.imageNavBtn} ${styles.prevBtn}`}
                >
                  <FaChevronLeft />
                </button>
              )}
              
              <div className={styles.imageViewerImageContainer}>
                <Image
                  src={allImages[currentImageIndex]?.src}
                  alt={allImages[currentImageIndex]?.alt}
                  width={800}
                  height={600}
                  style={{objectFit: 'contain', maxWidth: '100%', maxHeight: '100%'}}
                  className={styles.viewerImage}
                />
              </div>
              
              {allImages.length > 1 && (
                <button 
                  onClick={() => navigateImage('next')}
                  className={`${styles.imageNavBtn} ${styles.nextBtn}`}
                >
                  <FaChevronRight />
                </button>
              )}
            </div>
            
            {allImages.length > 1 && (
              <div className={styles.imageThumbnails}>
                {allImages.map((image, index) => (
                  <div
                    key={index}
                    className={`${styles.thumbnail} ${index === currentImageIndex ? styles.activeThumbnail : ''}`}
                    onClick={() => setCurrentImageIndex(index)}
                  >
                    <Image
                      src={image.src}
                      alt={image.alt}
                      width={60}
                      height={60}
                      style={{objectFit: 'cover', borderRadius: '4px'}}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ViewDetailsModal;
