import React, { useState } from 'react';
import Image from 'next/image';
import { FaTimes, FaCheck, FaEye, FaExpand, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { getProgramImageUrl } from '@/utils/uploadPaths';
import { formatDateTime } from '../../../../utils/dateUtils';
import { getStatusBadgeConfig, getStatusDisplayText } from '@/utils/collaborationStatusUtils';
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

  // Using centralized date utility - format remains exactly the same
  const formatDate = (dateString) => {
    return formatDateTime(dateString);
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
    const config = getStatusBadgeConfig(status);
    return (
      <span className={`${styles.statusBadge} ${styles[config.className]}`}>
        {config.text}
      </span>
    );
  };

  // Parse program data for display
  const getProgramData = () => {
    if (submissionData.section !== 'programs') return null;
    try {
      // Try different possible field names for the data
      const dataField = submissionData.proposed_data || submissionData.data || submissionData.new_data;
      return typeof dataField === 'string' 
        ? JSON.parse(dataField) 
        : dataField;
    } catch (error) {
      return null;
    }
  };

  // Parse highlights data for display
  const getHighlightsData = () => {
    if (submissionData.section !== 'highlights') return null;
    try {
      // Try different possible field names for the data
      const dataField = submissionData.proposed_data || submissionData.data || submissionData.new_data;
      const parsedData = typeof dataField === 'string' 
        ? JSON.parse(dataField) 
        : dataField;
      
      // Parse media_files if it's a JSON string
      if (parsedData && parsedData.media_files) {
        if (typeof parsedData.media_files === 'string') {
          parsedData.media_files = JSON.parse(parsedData.media_files);
        }
      }
      
      return parsedData;
    } catch (error) {
      console.error('Error parsing highlights data:', error);
      return null;
    }
  };

  const programData = getProgramData();
  const highlightsData = getHighlightsData();
  
  // Debug logging for highlights data
  if (submissionData.section === 'highlights') {
    console.log('Highlights submission data:', submissionData);
    console.log('Parsed highlights data:', highlightsData);
    if (highlightsData && highlightsData.media_files) {
      console.log('Media files:', highlightsData.media_files);
      console.log('Media files type:', typeof highlightsData.media_files);
      console.log('Is array:', Array.isArray(highlightsData.media_files));
    }
  }

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
        src: getProgramImageUrl(programData.image) || '/defaults/default-profile.png',
        alt: 'Main Program Image',
        type: 'main'
      });
    }
    
    if (programData.additionalImages && Array.isArray(programData.additionalImages)) {
      programData.additionalImages.forEach((image, index) => {
        images.push({
          src: getProgramImageUrl(image) || '/defaults/default-profile.png',
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
                {submissionData.orgName || submissionData.organization_acronym || submissionData.org || 'Unknown Organization'} 
                {submissionData.organization_id && ` (Org #${submissionData.organization_id})`}
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
                        src={getProgramImageUrl(programData.image) || '/defaults/default-profile.png'} 
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
                          src={getProgramImageUrl(image) || '/defaults/default-profile.png'} 
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
                                {formatDate(date)}
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    } else if (programData.event_start_date && programData.event_end_date) {
                      if (programData.event_start_date === programData.event_end_date) {
                        return (
                          <div className={styles.summaryItem}>
                            <strong>Event Date:</strong> {formatDate(programData.event_start_date)}
                          </div>
                        );
                      } else {
                        return (
                          <div className={styles.summaryItem}>
                            <strong>Event Date Range:</strong> {formatDate(programData.event_start_date)} - {formatDate(programData.event_end_date)}
                          </div>
                        );
                      }
                    }
                    return null;
                  })()}
                </div>
              </div>

              {/* Collaborators Section */}
              {programData.collaborators && Array.isArray(programData.collaborators) && programData.collaborators.length > 0 && (
                <div className={styles.contentSection}>
                  <h4 className={styles.sectionTitle}>COLLABORATORS ({programData.collaborators.length}):</h4>
                  <div className={styles.collaboratorsContainer}>
                    {programData.collaborators.map((collaborator, index) => (
                      <div key={index} className={styles.collaboratorItem}>
                        <div className={styles.collaboratorInfo}>
                          <div className={styles.collaboratorName}>
                            {collaborator.organization_name || collaborator.organization_acronym || 'Unknown Organization'}
                          </div>
                          <div className={styles.collaboratorEmail}>
                            {collaborator.email || 'No email provided'}
                          </div>
                          {collaborator.organization_acronym && (
                            <div className={styles.collaboratorAcronym}>
                              ({collaborator.organization_acronym})
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          ) : submissionData.section === 'highlights' && highlightsData ? (
            // For highlights approvals, show formatted highlight data
            <div className={styles.contentSections}>
              {/* Title Section */}
              {highlightsData.title && (
                <div className={styles.contentSection}>
                  <h4 className={styles.sectionTitle}>TITLE:</h4>
                  <div className={styles.descriptionBox}>
                    {highlightsData.title}
                  </div>
                </div>
              )}

              {/* Description Section */}
              {highlightsData.description && (
                <div className={styles.contentSection}>
                  <h4 className={styles.sectionTitle}>DESCRIPTION:</h4>
                  <div className={styles.descriptionBox}>
                    {highlightsData.description}
                  </div>
                </div>
              )}

              {/* Media Section */}
              <div className={styles.contentSection}>
                <h4 className={styles.sectionTitle}>MEDIA:</h4>
                {highlightsData && highlightsData.media_files && Array.isArray(highlightsData.media_files) && highlightsData.media_files.length > 0 ? (
                  <div className={styles.additionalImagesContainer}>
                    {highlightsData.media_files.map((media, index) => {
                      const imageUrl = media.url || media.filename || '/defaults/default-profile.png';
                      return (
                        <div 
                          key={index} 
                          className={styles.additionalImageWrapper}
                          onClick={() => openImageViewer(highlightsData.media_files.map(m => ({
                            src: m.url || m.filename || '/defaults/default-profile.png',
                            alt: m.filename || `Media ${index + 1}`,
                            type: 'media'
                          })), index)}
                        >
                          <Image 
                            src={imageUrl} 
                            alt={media.filename || `Media ${index + 1}`} 
                            width={120}
                            height={120}
                            style={{objectFit: 'cover', borderRadius: '8px'}} 
                            className={styles.additionalImage}
                            onError={(e) => {
                              e.target.src = '/defaults/default-profile.png';
                            }}
                          />
                          <div className={styles.imageOverlay}>
                            <FaEye className={styles.viewIcon} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className={styles.descriptionBox}>
                    {highlightsData ? 'No media files found' : 'No highlight data available'}
                  </div>
                )}
              </div>
            </div>
          ) : (
            // For other non-program/highlights approvals, show data comparison
            <div className={styles.contentSections}>
              <div className={styles.contentSection}>
                <h4 className={styles.sectionTitle}>DATA CHANGES:</h4>
                {submissionData.section === 'advocacy' || submissionData.section === 'competency' ? (
                  <div className={styles.textDataContainer}>
                    <div className={styles.dataBlock}>
                      <h5>Previous Data:</h5>
                      <div className={styles.dataContent}>
                        {submissionData.previous_data || submissionData.old_data || "No previous data"}
                      </div>
                    </div>
                    <div className={styles.dataBlock}>
                      <h5>Proposed Data:</h5>
                      <div className={styles.dataContent}>
                        {submissionData.proposed_data || submissionData.data || submissionData.new_data || "No proposed data"}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className={styles.jsonDataContainer}>
                    <div className={styles.dataBlock}>
                      <h5>Previous Data:</h5>
                      <pre className={styles.jsonData}>
                        {JSON.stringify(submissionData.previous_data || submissionData.old_data, null, 2)}
                      </pre>
                    </div>
                    <div className={styles.dataBlock}>
                      <h5>Proposed Data:</h5>
                      <pre className={styles.jsonData}>
                        {JSON.stringify(submissionData.proposed_data || submissionData.data || submissionData.new_data, null, 2)}
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
