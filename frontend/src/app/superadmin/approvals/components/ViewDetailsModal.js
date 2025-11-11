import { useState } from 'react';
import Image from 'next/image';
import { FaTimes, FaEye, FaExpand, FaChevronLeft, FaChevronRight, FaFile } from 'react-icons/fa';
import { getProgramImageUrl } from '@/utils/uploadPaths';
import { formatDateTime } from '../../../../utils/dateUtils';
import { getStatusBadgeConfig } from '@/utils/collaborationStatusUtils';
import logger from '@/utils/logger';
import styles from './styles/ViewDetailsModal.module.css';

// Note: advocacy and competency are no longer part of the approval workflow

const ViewDetailsModal = ({ 
  isOpen, 
  onClose, 
  submissionData,
  onApprove,
  onReject
}) => {
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [allImages, setAllImages] = useState([]);
  
  if (!isOpen || !submissionData) return null;

  const getSectionDisplayName = (section) => {
    // Note: advocacy and competency are no longer part of the approval workflow
    const sectionMap = {
      'organization': 'Organization Information',
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
      logger.error('Error parsing highlights data', error, { context: 'ViewDetailsModal' });
      return null;
    }
  };

  const programData = getProgramData();
  const highlightsData = getHighlightsData();

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
          <div className={styles.modalHeaderRight}>
            {getStatusBadge(submissionData.status || 'pending')}
            <button 
              onClick={onClose}
              className={styles.modalCloseBtn}
            >
              ×
            </button>
          </div>
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
              </span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Date:</span>
              <span className={styles.infoValue}>{formatDateTime(submissionData.submitted_at)}</span>
            </div>
          </div>

          {/* Content sections based on submission type */}
          {submissionData.section === 'programs' && programData ? (
            <div className={styles.contentSections}>
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

              {/* Title Section */}
              {programData.title && (
                <div className={styles.contentSection}>
                  <h4 className={styles.sectionTitle}>TITLE:</h4>
                  <div className={styles.titleBox}>
                    {programData.title}
                  </div>
                </div>
              )}

              {/* Description Section */}
              {programData.description && (
                <div className={styles.contentSection}>
                  <h4 className={styles.sectionTitle}>DESCRIPTION:</h4>
                  <div className={styles.descriptionBox}>
                    {programData.description}
                  </div>
                </div>
              )}

              {/* Collaboration Section - Show admin users collaborating */}
              {((programData.is_collaborative || (programData.collaborators && Array.isArray(programData.collaborators) && programData.collaborators.length > 0)) && programData.collaborators && Array.isArray(programData.collaborators) && programData.collaborators.length > 0) && (
                <div className={styles.contentSection}>
                  <h4 className={styles.sectionTitle}>COLLABORATING ADMIN USERS:</h4>
                  <div className={styles.collaboratorsContainer}>
                    {programData.collaborators.map((collaborator, index) => {
                      // Handle both ID and object formats
                      // Try multiple field name variations for organization name
                      const orgName = collaborator.organization_name || 
                                     collaborator.orgName || 
                                     collaborator.org_name ||
                                     (collaborator.organization && (collaborator.organization.orgName || collaborator.organization.name)) ||
                                     'Unknown Organization';
                      
                      const orgEmail = collaborator.email || 
                                      collaborator.admin_email || 
                                      collaborator.organization_email ||
                                      (collaborator.organization && collaborator.organization.email) ||
                                      'No email provided';
                      
                      const orgAcronym = collaborator.organization_acronym || 
                                        collaborator.org || 
                                        collaborator.org_acronym ||
                                        (collaborator.organization && collaborator.organization.org) ||
                                        '';
                      
                      // Format organization name with acronym: "Org Name (Acronym)"
                      const orgDisplayName = orgAcronym 
                        ? `${orgName} (${orgAcronym})`
                        : orgName;
                      
                      const collabStatus = collaborator.collaboration_status || collaborator.status || 'pending';
                      
                      return (
                        <div key={index} className={styles.collaboratorItem}>
                          <div className={styles.collaboratorInfo}>
                            <div className={styles.collaboratorHeader}>
                              <div className={styles.collaboratorName}>{orgDisplayName}</div>
                              {collabStatus && (
                                <span className={`${styles.collabStatusBadge} ${styles[`status${collabStatus.charAt(0).toUpperCase() + collabStatus.slice(1)}`]}`}>
                                  {collabStatus}
                                </span>
                              )}
                            </div>
                            <div className={styles.collaboratorDetails}>
                              <div className={styles.collaboratorEmail}>
                                <strong>Email:</strong> {orgEmail}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Program Details Summary - Last Section */}
              <div className={styles.contentSection}>
                <h4 className={styles.sectionTitle}>PROGRAM DETAILS:</h4>
                <div className={styles.programSummary}>
                  <div className={styles.summaryRow}>
                    <div className={styles.summaryItem}>
                      <strong>Category:</strong> {programData.category || 'N/A'}
                    </div>
                    <div className={styles.summaryItem}>
                      <strong>Status:</strong> {submissionData.status || programData.status || 'N/A'}
                    </div>
                    <div className={styles.summaryItem}>
                      <strong>Collaboration:</strong> 
                      {(programData.is_collaborative || (programData.collaborators && Array.isArray(programData.collaborators) && programData.collaborators.length > 0)) 
                        ? <span className={styles.collabBadge}>Collaborative Program</span>
                        : <span className={styles.nonCollabBadge}>Single Organization</span>
                      }
                    </div>
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
                                {formatDateTime(date)}
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    } else if (programData.event_start_date && programData.event_end_date) {
                      if (programData.event_start_date === programData.event_end_date) {
                        return (
                          <div className={styles.summaryItem}>
                            <strong>Event Date:</strong> {formatDateTime(programData.event_start_date)}
                          </div>
                        );
                      } else {
                        return (
                          <div className={styles.summaryItem}>
                            <strong>Event Date Range:</strong> {formatDateTime(programData.event_start_date)} - {formatDateTime(programData.event_end_date)}
                          </div>
                        );
                      }
                    }
                    return null;
                  })()}
                </div>
              </div>

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

              {/* Associated Program Section */}
              {highlightsData.program_id && (
                <div className={styles.contentSection}>
                  <h4 className={styles.sectionTitle}>ASSOCIATED PROGRAM:</h4>
                  <div className={styles.descriptionBox}>
                    {highlightsData.program_title || `Program #${highlightsData.program_id}`}
                  </div>
                </div>
              )}

              {/* Media Section */}
              <div className={styles.contentSection}>
                <h4 className={styles.sectionTitle}>MEDIA:</h4>
                {highlightsData && highlightsData.media_files && Array.isArray(highlightsData.media_files) && highlightsData.media_files.length > 0 ? (
                  <div className={styles.mediaContainer}>
                    {highlightsData.media_files.map((media, index) => {
                      const mediaUrl = media.url || media.filename;
                      const isVideo = media.type === 'video' || 
                                     media.mimetype?.startsWith('video/') ||
                                     /\.(mp4|avi|mov|wmv|flv|webm|mkv)$/i.test(media.filename || media.url || '');
                      const isImage = media.type === 'image' || 
                                     media.mimetype?.startsWith('image/') ||
                                     /\.(jpg|jpeg|png|gif|webp)$/i.test(media.filename || media.url || '');
                      
                      if (isVideo && mediaUrl) {
                        return (
                          <div key={index} className={styles.videoWrapper}>
                            <video
                              controls
                              className={styles.videoPlayer}
                              preload="metadata"
                            >
                              <source src={mediaUrl} type={media.mimetype || 'video/mp4'} />
                              Your browser does not support the video tag.
                            </video>
                          </div>
                        );
                      } else if (isImage && mediaUrl) {
                        return (
                          <div 
                            key={index} 
                            className={styles.additionalImageWrapper}
                            onClick={() => openImageViewer(highlightsData.media_files
                              .filter(m => {
                                const mUrl = m.url || m.filename;
                                const mIsImage = m.type === 'image' || 
                                               m.mimetype?.startsWith('image/') ||
                                               /\.(jpg|jpeg|png|gif|webp)$/i.test(m.filename || m.url || '');
                                return mIsImage && mUrl;
                              })
                              .map(m => ({
                                src: m.url || m.filename || '/defaults/default-profile.png',
                                alt: m.filename || `Media ${index + 1}`,
                                type: 'media'
                              })), highlightsData.media_files
                              .filter(m => {
                                const mUrl = m.url || m.filename;
                                const mIsImage = m.type === 'image' || 
                                               m.mimetype?.startsWith('image/') ||
                                               /\.(jpg|jpeg|png|gif|webp)$/i.test(m.filename || m.url || '');
                                return mIsImage && mUrl;
                              })
                              .findIndex(m => (m.url || m.filename) === mediaUrl))}
                          >
                            <Image 
                              src={mediaUrl} 
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
                      } else {
                        return (
                          <div key={index} className={styles.mediaPlaceholder}>
                            <FaFile className={styles.fileIcon} />
                            <span>{media.type || 'File'}</span>
                          </div>
                        );
                      }
                    })}
                  </div>
                ) : (
                  <div className={styles.descriptionBox}>
                    {highlightsData ? 'No media files found' : 'No highlight data available'}
                  </div>
                )}
              </div>
            </div>
          ) : submissionData.section === 'Post Act Report' ? (
            // For Post Act Report, show only the uploaded file
            <div className={styles.contentSections}>
              <div className={styles.contentSection}>
                <h4 className={styles.sectionTitle}>UPLOADED FILE:</h4>
                <div className={styles.descriptionBox}>
                  {(() => {
                    try {
                      const proposedData = typeof submissionData.proposed_data === 'string' 
                        ? JSON.parse(submissionData.proposed_data) 
                        : submissionData.proposed_data;
                      const fileUrl = proposedData?.file_url;
                      
                      if (!fileUrl) {
                        return <div className={styles.noData}>No file available</div>;
                      }
                      
                      // Extract file name from URL
                      const getFileNameFromUrl = (url) => {
                        try {
                          const urlParts = url.split('/');
                          const fileNameWithParams = urlParts[urlParts.length - 1];
                          // Remove query parameters but keep extension
                          const fileName = fileNameWithParams.split('?')[0];
                          // Ensure filename has proper extension
                          if (fileName && !fileName.includes('.')) {
                            // If no extension found, try to extract from original filename in URL
                            const extension = url.split('.').pop()?.split('?')[0]?.toLowerCase();
                            if (extension && extension.length <= 5) {
                              return `Post Act Report.${extension}`;
                            }
                          }
                          return fileName || 'Post Act Report';
                        } catch {
                          return 'Post Act Report';
                        }
                      };
                      
                      const fileName = getFileNameFromUrl(fileUrl);
                      
                      // Determine if it's an image or non-image file
                      const fileExtension = fileUrl.split('.').pop()?.toLowerCase().split('?')[0];
                      const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'svg'].includes(fileExtension);
                      const isPdf = fileExtension === 'pdf';
                      const isDocument = ['doc', 'docx'].includes(fileExtension);
                      
                      // Handle file click - download non-image files, open images in new tab
                      const handleFileClick = async (e) => {
                        if (!isImage) {
                          e.preventDefault();
                          try {
                            // Fetch the file from S3
                            const response = await fetch(fileUrl, {
                              method: 'GET',
                              headers: {
                                'Accept': '*/*'
                              }
                            });
                            
                            if (!response.ok) {
                              throw new Error('Failed to download file');
                            }
                            
                            // Get the blob with correct MIME type from S3
                            const blob = await response.blob();
                            
                            // Create download link with proper file type
                            const downloadUrl = window.URL.createObjectURL(blob);
                            const link = document.createElement('a');
                            link.href = downloadUrl;
                            link.download = fileName;
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                            
                            // Clean up the object URL
                            window.URL.revokeObjectURL(downloadUrl);
                          } catch (error) {
                            // Fallback: try direct download
                            const link = document.createElement('a');
                            link.href = fileUrl;
                            link.download = fileName;
                            link.target = '_blank';
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                          }
                        }
                        // For images, default behavior (open in new tab) works fine with S3
                      };
                      
                      return (
                        <a
                          href={fileUrl}
                          onClick={handleFileClick}
                          target={isImage ? '_blank' : undefined}
                          rel={isImage ? 'noreferrer noopener' : undefined}
                          className={styles.fileCard}
                        >
                          <div className={styles.fileIconWrapper}>
                            <FaFile className={styles.fileIcon} />
                          </div>
                          <div className={styles.fileInfo}>
                            <div className={styles.fileName}>{fileName}</div>
                            <div className={styles.fileSize}>
                              {isImage ? 'View File' : 'Download File'}
                            </div>
                          </div>
                        </a>
                      );
                    } catch (error) {
                      return <div className={styles.noData}>No file available</div>;
                    }
                  })()}
                </div>
              </div>
            </div>
          ) : (
            // For other non-program/highlights approvals, show data comparison
            <div className={styles.contentSections}>
              <div className={styles.contentSection}>
                <h4 className={styles.sectionTitle}>DATA CHANGES:</h4>
                {/* Note: advocacy and competency are no longer part of the approval workflow */}
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
              </div>
            </div>
          )}
        </div>
        
        <div className={styles.modalFooter}>
          <div className={styles.modalFooterActions}>
            {(submissionData.status === 'pending' || submissionData.status === 'pending_superadmin_approval') && (
              <>
                <button 
                  onClick={() => {
                    if (onReject) {
                      // Call the handler first to set state and open confirmation modal
                      onReject(submissionData);
                      // Close the details modal after a small delay to allow state to be set
                      setTimeout(() => {
                        onClose();
                      }, 50);
                    }
                  }}
                  className={styles.modalRejectBtn}
                >
                  Reject
                </button>
                <button 
                  onClick={() => {
                    if (onApprove) {
                      // Call the handler first to set state and open confirmation modal
                      onApprove(submissionData);
                      // Close the details modal after a small delay to allow state to be set
                      setTimeout(() => {
                        onClose();
                      }, 50);
                    }
                  }}
                  className={styles.modalApproveBtn}
                >
                  Approve
                </button>
              </>
            )}
            <button 
              onClick={onClose}
              className={styles.modalCloseFooterBtn}
            >
              Close
            </button>
          </div>
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
