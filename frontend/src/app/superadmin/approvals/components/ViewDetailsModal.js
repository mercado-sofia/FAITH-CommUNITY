import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { FaTimes, FaEye, FaExpand, FaChevronLeft, FaChevronRight, FaFile, FaPlay } from 'react-icons/fa';
import { getProgramImageUrl, getOrganizationImageUrl } from '@/utils/uploadPaths';
import { formatDateTime, formatDateShort } from '../../../../utils/dateUtils';
import { getStatusBadgeConfig } from '@/utils/collaborationStatusUtils';
import DOMPurify from 'dompurify';
import logger from '@/utils/logger';
import styles from './styles/ViewDetailsModal.module.css';

// Helper function to calculate program status from dates (for program details)
const calculateProgramStatusFromDates = (event_start_date, event_end_date, multiple_dates) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Reset time to start of day for accurate comparison

  // Handle multiple dates
  if (multiple_dates && Array.isArray(multiple_dates) && multiple_dates.length > 0) {
    const dates = multiple_dates
      .filter(date => date) // Filter out null/undefined
      .map(dateStr => {
        const date = new Date(dateStr);
        date.setHours(0, 0, 0, 0);
        return date;
      })
      .sort((a, b) => a - b); // Sort chronologically
    
    if (dates.length === 0) {
      return 'Upcoming'; // Default if no valid dates
    }
    
    const earliestDate = dates[0];
    const latestDate = dates[dates.length - 1];
    
    // If today is before the earliest date, it's upcoming
    if (today < earliestDate) {
      return 'Upcoming';
    }
    // If today is after the latest date, it's completed
    if (today > latestDate) {
      return 'Completed';
    }
    // If today is between or on any of the dates, it's active
    return 'Active';
  }

  // Handle single date or date range
  if (event_start_date) {
    const startDate = new Date(event_start_date);
    startDate.setHours(0, 0, 0, 0);
    
    if (event_end_date) {
      const endDate = new Date(event_end_date);
      endDate.setHours(0, 0, 0, 0);
      
      // If today is before the start date, it's upcoming
      if (today < startDate) {
        return 'Upcoming';
      }
      // If today is after the end date, it's completed
      if (today > endDate) {
        return 'Completed';
      }
      // If today is between or on the dates, it's active
      return 'Active';
    } else {
      // Only start date provided
      // If today is before the start date, it's upcoming
      if (today < startDate) {
        return 'Upcoming';
      }
      // If today is on or after the start date, it's active
      // (We can't determine completion without an end date)
      return 'Active';
    }
  }

  // Default to upcoming if no dates are set
  return 'Upcoming';
};

// Helper function to get proper video URL
const getVideoUrl = (mediaPath) => {
  if (!mediaPath) return null;
  
  // If it's already a full URL, return as is
  if (typeof mediaPath === 'string' && (mediaPath.startsWith('http://') || mediaPath.startsWith('https://'))) {
    // If it's a Cloudinary URL but using image/upload, convert to video/upload
    if (mediaPath.includes('res.cloudinary.com') && mediaPath.includes('/image/upload/')) {
      return mediaPath.replace('/image/upload/', '/video/upload/');
    }
    return mediaPath;
  }
  
  // If it's a Cloudinary public_id, construct the video URL
  if (typeof mediaPath === 'string' && mediaPath.includes('faith-community/')) {
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'djty9l7zw';
    // Use video/upload for videos instead of image/upload
    return `https://res.cloudinary.com/${cloudName}/video/upload/${mediaPath}`;
  }
  
  // Return as is if it's a valid string
  return mediaPath || null;
};

// Note: advocacy and competency are no longer part of the approval workflow

// Video Player Component with Play Button
const VideoPlayer = ({ videoUrl, media, index }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [shouldLoad, setShouldLoad] = useState(false);
  const videoRef = useRef(null);

  const handlePlayClick = () => {
    if (!videoUrl) {
      console.error('No video URL provided');
      setHasError(true);
      return;
    }


    // Set shouldLoad to true to render the video element
    setShouldLoad(true);
    setIsLoading(true);
    
    // Use useEffect-like approach with setTimeout to ensure the video element is rendered
    setTimeout(() => {
      if (videoRef.current) {
        videoRef.current.load();
        videoRef.current.play()
          .then(() => {
            setIsLoading(false);
            setIsPlaying(true);
          })
          .catch(err => {
            console.error('Error playing video:', err);
            console.error('Video element state:', {
              networkState: videoRef.current.networkState,
              readyState: videoRef.current.readyState,
              error: videoRef.current.error
            });
            setIsLoading(false);
            setHasError(true);
          });
      } else {
        console.error('Video element not found after render');
        setIsLoading(false);
        setHasError(true);
      }
    }, 200);
  };

  const handleVideoError = (e) => {
    console.error('Video playback error:', e);
    const errorDetails = {
      code: videoRef.current?.error?.code,
      message: videoRef.current?.error?.message,
      networkState: videoRef.current?.networkState,
      readyState: videoRef.current?.readyState,
      videoUrl: videoUrl
    };
    console.error('Video error details:', errorDetails);
    setIsLoading(false);
    setHasError(true);
    setIsPlaying(false);
    logger.error('Video playback failed', { videoUrl, media, errorDetails }, { context: 'ViewDetailsModal' });
  };

  const handleVideoLoaded = () => {
    setHasError(false);
    setIsLoading(false);
  };

  const handleVideoPlay = () => {
    setIsPlaying(true);
    setIsLoading(false);
  };

  const handleVideoPause = () => {
    setIsPlaying(false);
  };

  const handleRetry = () => {
    setHasError(false);
    setIsPlaying(false);
    setIsLoading(false);
    setShouldLoad(false);
    // Reset after a brief moment
    setTimeout(() => {
      handlePlayClick();
    }, 100);
  };

  // Show placeholder if not loading, not playing, and no error
  const showPlaceholder = !isLoading && !isPlaying && !hasError;
  // Show video if it should be loaded and (playing or loading)
  const showVideo = shouldLoad && (isPlaying || isLoading) && !hasError;

  return (
    <div className={styles.videoWrapper}>
      {showPlaceholder && (
        <div className={styles.videoPlaceholder} onClick={handlePlayClick}>
          <div className={styles.playButtonOverlay}>
            <FaPlay className={styles.playButtonIcon} />
            <span className={styles.playButtonText}>Click to play video</span>
          </div>
        </div>
      )}
      {isLoading && !hasError && (
        <div className={styles.videoLoading}>
          <div className={styles.loadingSpinner}></div>
          <span>Loading video...</span>
        </div>
      )}
      {hasError && (
        <div className={styles.videoError}>
          <FaFile className={styles.fileIcon} />
          <span>Unable to load video</span>
          <div className={styles.errorDetails}>
            {videoRef.current?.error && (
              <span className={styles.errorMessage}>
                {videoRef.current.error.code === 4 
                  ? 'Video format not supported' 
                  : videoRef.current.error.message || 'Video failed to load'}
              </span>
            )}
          </div>
          <button 
            onClick={handleRetry}
            className={styles.retryButton}
          >
            Retry
          </button>
        </div>
      )}
      {shouldLoad && videoUrl && (
        <video
          ref={videoRef}
          controls
          className={styles.videoPlayer}
          preload="none"
          playsInline
          onError={handleVideoError}
          onLoadedData={handleVideoLoaded}
          onCanPlay={handleVideoLoaded}
          onPlay={handleVideoPlay}
          onPause={handleVideoPause}
          style={{ display: showVideo ? 'block' : 'none' }}
        >
          <source src={videoUrl} type={media.mimetype || 'video/mp4'} />
          <source src={videoUrl} type="video/mp4" />
          <source src={videoUrl} type="video/webm" />
          Your browser does not support the video tag.
        </video>
      )}
    </div>
  );
};

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
  const [programTitle, setProgramTitle] = useState(null);
  const [loadingProgram, setLoadingProgram] = useState(false);

  const getSectionDisplayName = (section) => {
    // Note: advocacy and competency are no longer part of the approval workflow
    const sectionMap = {
      'organization': 'Organization Information',
      'programs': 'Program'
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
    if (!submissionData || submissionData.section !== 'programs') return null;
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
    if (!submissionData || submissionData.section !== 'highlights') return null;
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

  // Fetch program title when highlightsData has program_id
  useEffect(() => {
    const fetchProgramTitle = async () => {
      if (!highlightsData?.program_id) {
        setProgramTitle(null);
        return;
      }

      // If program_title is already in highlightsData, use it
      if (highlightsData.program_title) {
        setProgramTitle(highlightsData.program_title);
        return;
      }

      // Otherwise, fetch from API
      setLoadingProgram(true);
      try {
        const { API_BASE_URL } = await import('@/config/api');
        const response = await fetch(`${API_BASE_URL || ''}/api/projects/superadmin/${highlightsData.program_id}`, {
          credentials: 'include', // CRITICAL: Include httpOnly cookies
          headers: {
            'Content-Type': 'application/json',
            // No Authorization header needed - httpOnly cookies handle authentication
          },
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data?.title) {
            setProgramTitle(result.data.title);
          }
        }
      } catch (error) {
        logger.error('Error fetching program title', error, { context: 'ViewDetailsModal' });
      } finally {
        setLoadingProgram(false);
      }
    };

    fetchProgramTitle();
  }, [highlightsData?.program_id, highlightsData?.program_title]);

  // Early return after all hooks to maintain hook order
  if (!isOpen || !submissionData) return null;

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
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Section</span>
              <span className={styles.infoValue}>{getSectionDisplayName(submissionData.section)}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Submitted By</span>
              <div className={styles.orgValueContainer}>
                {submissionData.organization_logo ? (() => {
                  const logoUrl = getOrganizationImageUrl(submissionData.organization_logo, 'logo');
                  if (logoUrl && logoUrl !== 'ORGANIZATION_LOGO_UNAVAILABLE') {
                    return (
                      <div className={styles.orgLogoWrapper}>
                        <Image
                          src={logoUrl}
                          alt={`${submissionData.orgName || submissionData.organization_acronym || submissionData.org || 'Organization'} logo`}
                          width={24}
                          height={24}
                          className={styles.orgLogo}
                          onError={(e) => {
                            e.target.style.display = 'none';
                            if (e.target.nextSibling) {
                              e.target.nextSibling.style.display = 'flex';
                            }
                          }}
                        />
                        <div 
                          className={styles.orgLogoPlaceholder}
                          style={{ display: 'none' }}
                        >
                          {(submissionData.organization_acronym || submissionData.org || '?').charAt(0).toUpperCase()}
                        </div>
                      </div>
                    );
                  }
                  return null;
                })() : null}
                {!submissionData.organization_logo && (
                  <div className={styles.orgLogoWrapper}>
                    <div className={styles.orgLogoPlaceholder}>
                      {(submissionData.organization_acronym || submissionData.org || '?').charAt(0).toUpperCase()}
                    </div>
                  </div>
                )}
                <span className={styles.infoValue}>
                  {submissionData.orgName || submissionData.organization_acronym || submissionData.org || 'Unknown Organization'}
                </span>
              </div>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Date</span>
              <span className={styles.infoValue}>
                {formatDateShort(
                  submissionData.submitted_at instanceof Date 
                    ? submissionData.submitted_at.toISOString() 
                    : submissionData.submitted_at
                )}
              </span>
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
                  <div 
                    className={styles.descriptionBox}
                    dangerouslySetInnerHTML={{ 
                      __html: programData.description 
                        ? DOMPurify.sanitize(programData.description) 
                        : '<p>No description provided</p>' 
                    }} 
                  />
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
                      <strong>Status:</strong> {(() => {
                        // Calculate program status from dates (not submission status)
                        const programStatus = calculateProgramStatusFromDates(
                          programData.event_start_date,
                          programData.event_end_date,
                          programData.multiple_dates
                        );
                        return programStatus;
                      })()}
                    </div>
                    {(programData.is_collaborative || (programData.collaborators && Array.isArray(programData.collaborators) && programData.collaborators.length > 0)) && (
                      <div className={styles.summaryItem}>
                        <strong>Collaboration:</strong> 
                        <span className={styles.collabBadge}>Collaborative Program</span>
                      </div>
                    )}
                  </div>
                  {(() => {
                    // Format event dates for display
                    if (programData.multiple_dates && Array.isArray(programData.multiple_dates) && programData.multiple_dates.length > 0) {
                      // Filter out invalid dates
                      const validDates = programData.multiple_dates.filter(date => {
                        if (!date) return false;
                        const dateObj = new Date(date);
                        return !isNaN(dateObj.getTime());
                      });
                      
                      if (validDates.length > 0) {
                        return (
                          <div className={styles.summaryItem}>
                            <strong>Event Dates:</strong>
                            <div className={styles.eventDatesList}>
                              {validDates.map((date, index) => {
                                const formatted = formatDateTime(date);
                                // Only show if formatDateTime didn't return "Invalid date"
                                if (formatted === 'Invalid date') return null;
                                return (
                                  <span key={index} className={styles.eventDateTag}>
                                    {formatted}
                                  </span>
                                );
                              }).filter(Boolean)}
                            </div>
                          </div>
                        );
                      }
                    } else if (programData.event_start_date && programData.event_end_date) {
                      // Validate both dates before formatting
                      const startDate = new Date(programData.event_start_date);
                      const endDate = new Date(programData.event_end_date);
                      const startValid = !isNaN(startDate.getTime());
                      const endValid = !isNaN(endDate.getTime());
                      
                      if (startValid && endValid) {
                        const startFormatted = formatDateTime(programData.event_start_date);
                        const endFormatted = formatDateTime(programData.event_end_date);
                        
                        // Only show if both dates formatted successfully
                        if (startFormatted !== 'Invalid date' && endFormatted !== 'Invalid date') {
                          if (programData.event_start_date === programData.event_end_date) {
                            return (
                              <div className={styles.summaryItem}>
                                <strong>Event Date:</strong> {startFormatted}
                              </div>
                            );
                          } else {
                            return (
                              <div className={styles.summaryItem}>
                                <strong>Event Date Range:</strong> {startFormatted} - {endFormatted}
                              </div>
                            );
                          }
                        }
                      } else if (startValid) {
                        // Only start date is valid
                        const startFormatted = formatDateTime(programData.event_start_date);
                        if (startFormatted !== 'Invalid date') {
                          return (
                            <div className={styles.summaryItem}>
                              <strong>Event Date:</strong> {startFormatted}
                            </div>
                          );
                        }
                      }
                    } else if (programData.event_start_date) {
                      // Only start date exists
                      const startDate = new Date(programData.event_start_date);
                      if (!isNaN(startDate.getTime())) {
                        const startFormatted = formatDateTime(programData.event_start_date);
                        if (startFormatted !== 'Invalid date') {
                          return (
                            <div className={styles.summaryItem}>
                              <strong>Event Date:</strong> {startFormatted}
                            </div>
                          );
                        }
                      }
                    }
                    return null;
                  })()}
                </div>
              </div>

              {/* Post Act Report Section */}
              {programData.postActReport && programData.postActReport.file_url && (
                <div className={styles.contentSection}>
                  <h4 className={styles.sectionTitle}>POST ACT REPORT:</h4>
                  <div className={styles.postActReportContainer}>
                    <div className={styles.postActReportInfo}>
                      <FaFile className={styles.fileIcon} />
                      <div className={styles.postActReportDetails}>
                        <span className={styles.postActReportLabel}>Post Act Report File</span>
                        <a 
                          href={programData.postActReport.file_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className={styles.postActReportLink}
                        >
                          View/Download Post Act Report
                        </a>
                      </div>
                    </div>
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
                  <div 
                    className={styles.descriptionBox}
                    dangerouslySetInnerHTML={{ 
                      __html: highlightsData.description 
                        ? DOMPurify.sanitize(highlightsData.description) 
                        : '<p>No description provided</p>' 
                    }} 
                  />
                </div>
              )}

              {/* Associated Program Section */}
              {highlightsData.program_id && (
                <div className={styles.contentSection}>
                  <h4 className={styles.sectionTitle}>ASSOCIATED PROGRAM:</h4>
                  <div className={styles.descriptionBox}>
                    {loadingProgram ? (
                      <span>Loading...</span>
                    ) : programTitle ? (
                      programTitle
                    ) : highlightsData.program_title ? (
                      highlightsData.program_title
                    ) : (
                      `Program #${highlightsData.program_id}`
                    )}
                  </div>
                </div>
              )}

              {/* Year Section */}
              {highlightsData.year && (
                <div className={styles.contentSection}>
                  <h4 className={styles.sectionTitle}>YEAR:</h4>
                  <div className={styles.descriptionBox}>
                    {highlightsData.year}
                  </div>
                </div>
              )}

              {/* Media Section */}
              <div className={styles.contentSection}>
                <h4 className={styles.sectionTitle}>MEDIA:</h4>
                {highlightsData && highlightsData.media_files && Array.isArray(highlightsData.media_files) && highlightsData.media_files.length > 0 ? (
                  <div className={styles.mediaContainer}>
                    {highlightsData.media_files.map((media, index) => {
                      const rawMediaUrl = media.url || media.filename;
                      const isVideo = media.type === 'video' || 
                                     media.mimetype?.startsWith('video/') ||
                                     /\.(mp4|avi|mov|wmv|flv|webm|mkv)$/i.test(media.filename || media.url || '');
                      const isImage = media.type === 'image' || 
                                     media.mimetype?.startsWith('image/') ||
                                     /\.(jpg|jpeg|png|gif|webp)$/i.test(media.filename || media.url || '');
                      
                      if (isVideo && rawMediaUrl) {
                        const videoUrl = getVideoUrl(rawMediaUrl);
                        return <VideoPlayer key={index} videoUrl={videoUrl} media={media} index={index} />;
                      } else if (isImage && rawMediaUrl) {
                        const mediaUrl = rawMediaUrl;
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
            // All submissions in the submission flow are new - show only proposed data
            <div className={styles.contentSections}>
              <div className={styles.contentSection}>
                <h4 className={styles.sectionTitle}>SUBMISSION DETAILS:</h4>
                <div className={styles.jsonDataContainer}>
                    <div className={styles.dataBlock}>
                      <h5>Submission Data:</h5>
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
