import Image from 'next/image';
import { useState, useEffect } from 'react';
import { FaTimes, FaTag, FaCalendar, FaEye, FaExclamationTriangle, FaUsers, FaFile } from 'react-icons/fa';
import { formatDateShort } from '@/utils/dateUtils.js';
import { getProgramImageUrl } from '@/utils/uploadPaths';
import { API_CONFIG } from '../../../utils';
import DOMPurify from 'dompurify';
import styles from './SubmissionModal.module.css';

// Note: advocacy and competency are no longer part of the submission workflow

// Helper function to format time only with timezone-aware logic (matches formatDateTime logic)
const formatTimeOnly = (dateString) => {
  try {
    if (!dateString) return 'Not specified';
    
    let normalizedString = dateString.trim();
    
    // Check if this is an ISO format with timezone (TIMESTAMP field from backend)
    const hasTimezone = normalizedString.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(normalizedString);
    
    if (hasTimezone) {
      // This is a TIMESTAMP field (timezone-aware) - parse as UTC and convert to local time
      const date = new Date(normalizedString);
      if (isNaN(date.getTime())) {
        return 'Invalid time';
      }
      
      // Get local time components from the Date object
      let hour = date.getHours();
      const minute = date.getMinutes();
      
      // Convert to 12-hour format
      const originalHour = hour;
      const ampm = originalHour >= 12 ? 'PM' : 'AM';
      hour = hour % 12;
      hour = hour === 0 ? 12 : hour; // the hour '0' should be '12'
      
      // Format minutes with leading zero
      const minutesStr = minute.toString().padStart(2, '0');
      
      return `${hour}:${minutesStr} ${ampm}`;
    }
    
    // This is a DATETIME field (timezone-naive) - parse as local time without conversion
    // Try to match both formats: ISO (with T) and MySQL (with space)
    let match = normalizedString.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/);
    
    // If no match, try MySQL format: YYYY-MM-DD HH:mm:ss or YYYY-MM-DD HH:mm
    if (!match) {
      match = normalizedString.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})(?::(\d{2}))?/);
    }
    
    if (!match) {
      return 'Invalid time';
    }
    
    const [, , , , hour, minute] = match;
    let hourNum = parseInt(hour, 10);
    const minuteNum = parseInt(minute, 10);
    
    // Validate components
    if (isNaN(hourNum) || isNaN(minuteNum)) {
      return 'Invalid time';
    }
    
    // Additional validation: ensure hour is 0-23 and minute is 0-59
    if (hourNum < 0 || hourNum > 23 || minuteNum < 0 || minuteNum > 59) {
      return 'Invalid time';
    }
    
    // Convert to 12-hour format
    const originalHour = hourNum;
    const ampm = originalHour >= 12 ? 'PM' : 'AM';
    hourNum = hourNum % 12;
    hourNum = hourNum === 0 ? 12 : hourNum; // the hour '0' should be '12'
    
    // Format minutes with leading zero
    const minutesStr = minuteNum.toString().padStart(2, '0');
    
    return `${hourNum}:${minutesStr} ${ampm}`;
  } catch (error) {
    return 'Invalid time';
  }
};

// Helper function to parse JSON data safely
const parseJsonData = (data) => {
  if (typeof data === 'string') {
    try {
      return JSON.parse(data);
    } catch (e) {
      console.error('Error parsing JSON data:', e);
      return data;
    }
  }
  return data;
};

// Helper function to extract file name from URL
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

// Helper function to calculate program status from dates (for submissions)
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

export default function SubmissionModal({ data, onClose }) {
  const [fullSubmissionData, setFullSubmissionData] = useState(null);
  const [loadingFullData, setLoadingFullData] = useState(false);
  const [programTitle, setProgramTitle] = useState(null);
  const [loadingProgram, setLoadingProgram] = useState(false);

  // Fetch full submission data if we have minimal data
  useEffect(() => {
    const fetchFullSubmissionData = async () => {
      // Check if we have minimal data or if we need to fetch full details
      const isMinimalData = data._isMinimalData || 
                           (data.proposed_data && typeof data.proposed_data === 'object' && 
                            (data.proposed_data._hasData === true || 
                             data.proposed_data.has_post_act_report === true ||
                             data.proposed_data.has_file === true));
      
      // Always fetch full data to ensure we have complete information
      // This is especially important for post-act reports and large data
      if (data.id) {
        setLoadingFullData(true);
        try {
          const response = await fetch(`${API_CONFIG.BASE_URL}/api/submissions/details/${data.id}`, {
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
            },
          });

          if (response.ok) {
            const result = await response.json();
            if (result.success && result.data) {
              setFullSubmissionData(result.data);
            }
          } else {
            console.warn(`Failed to fetch full submission data: ${response.status}`);
            // Fall back to provided data if fetch fails
            setFullSubmissionData(data);
          }
        } catch (error) {
          console.error('Error fetching full submission data:', error);
          // Fall back to provided data if fetch fails
          setFullSubmissionData(data);
        } finally {
          setLoadingFullData(false);
        }
      } else {
        // No ID available, use provided data
        setFullSubmissionData(data);
      }
    };

    fetchFullSubmissionData();
  }, [data]);

  // Use full data if available, otherwise use provided data
  const submissionData = fullSubmissionData || data;

  // Fetch program title when program_id is available but program_title is not
  useEffect(() => {
    const fetchProgramTitle = async () => {
      // Use full submission data if available
      const currentData = submissionData || data;
      
      if (currentData.section !== 'highlights') {
        setProgramTitle(null);
        setLoadingProgram(false);
        return;
      }
      
      // Parse proposed_data to get program_id and program_title
      const proposedData = parseJsonData(currentData.proposed_data);
      const programId = proposedData?.program_id;
      const existingProgramTitle = proposedData?.program_title;

      // If we already have a program_title, use it
      if (existingProgramTitle) {
        setProgramTitle(existingProgramTitle);
        setLoadingProgram(false);
        return;
      }

      // If no program_id, clear the title
      if (!programId) {
        setProgramTitle(null);
        setLoadingProgram(false);
        return;
      }

      // Fetch program title from API
      setLoadingProgram(true);
      try {
        // No need to check token - cookies handle authentication
        const response = await fetch(`${API_CONFIG.BASE_URL}/api/admin/programs/single/${programId}`, {
          credentials: 'include', // CRITICAL: Include httpOnly cookies
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const result = await response.json();
          // Check title in priority order: result.data?.title first, then result.title
          const title = result.data?.title || result.title;
          if (title) {
            setProgramTitle(title);
          }
        } else {
          console.warn(`Failed to fetch program title: ${response.status} ${response.statusText}`);
        }
      } catch (error) {
        console.error('Error fetching program title:', error);
      } finally {
        setLoadingProgram(false);
      }
    };

    fetchProgramTitle();
  }, [submissionData, data]);

  const formatData = (dataObj) => {
    // Use full submission data if available
    const currentData = submissionData || data;
    
    // Handle different data types based on section
    // Note: organization and org_heads are not part of the submission flow
    if (currentData.section === 'programs') {
      return (
        <>
        <div className={styles.programLayout}>
          {/* Left side - Image */}
          <div className={styles.programImageSection}>
            {dataObj.image ? (
              getProgramImageUrl(dataObj.image) === 'IMAGE_UNAVAILABLE' ? (
                <div className={styles.programImagePlaceholder}>
                  <FaExclamationTriangle />
                  <span>Image unavailable</span>
                </div>
              ) : (
                <Image 
                  src={getProgramImageUrl(dataObj.image)} 
                  alt="Program image" 
                  className={styles.programMainImage}
                  width={300}
                  height={200}
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
              )
            ) : (
              <div className={styles.programImagePlaceholder}>
                <FaEye />
                <span>No image available</span>
              </div>
            )}
            <div className={styles.programImageError} style={{display: 'none'}}>
              <FaExclamationTriangle />
              <span>Image unavailable</span>
            </div>
          </div>

          {/* Right side - Details */}
          <div className={styles.programDetailsSection}>
            {/* Status Badge - Top Right Corner - Show Program Status (Upcoming, Active, Completed) */}
            {(() => {
              // Calculate program status from dates (not submission status)
              // For submissions, we need to calculate based on event dates
              const programStatus = calculateProgramStatusFromDates(
                dataObj.event_start_date,
                dataObj.event_end_date,
                dataObj.multiple_dates
              );
              
              return (
                <span className={`${styles.statusIndicator} ${styles[programStatus.toLowerCase()]}`}>
                  {programStatus}
                </span>
              );
            })()}
            
            {/* Program Title */}
            <div className={styles.programTitle}>{dataObj.title}</div>

            {/* Category and Event Date in same row */}
            <div className={styles.programDetailItem}>
              {/* Category */}
              {dataObj.category && (
                <div className={styles.detailContent}>
                  <span className={styles.detailLabel}>
                    Category
                  </span>
                  <span className={styles.detailValue}>{dataObj.category}</span>
                </div>
              )}
              
              {/* Event Dates */}
              {(() => {
                if (dataObj.multiple_dates && Array.isArray(dataObj.multiple_dates) && dataObj.multiple_dates.length > 0) {
                  return (
                    <div className={styles.detailContent}>
                      <span className={styles.detailLabel}>
                        <FaCalendar className={styles.detailIcon} />
                        Event Date(s)
                      </span>
                      <div className={styles.eventDatesList}>
                        {dataObj.multiple_dates.map((date, index) => (
                          <span key={index} className={styles.eventDateTag}>
                            {formatDateShort(date)}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                } else if (dataObj.event_start_date && dataObj.event_end_date) {
                  if (dataObj.event_start_date === dataObj.event_end_date) {
                    return (
                      <div className={styles.detailContent}>
                        <span className={styles.detailLabel}>
                          <FaCalendar className={styles.detailIcon} />
                          Event Date
                        </span>
                        <span className={styles.detailValue}>
                          {formatDateShort(dataObj.event_start_date)}
                        </span>
                      </div>
                    );
                  } else {
                    return (
                      <div className={styles.detailContent}>
                        <span className={styles.detailLabel}>
                          <FaCalendar className={styles.detailIcon} />
                          Event Date Range
                        </span>
                        <span className={styles.detailValue}>
                          {formatDateShort(dataObj.event_start_date)} - {formatDateShort(dataObj.event_end_date)}
                        </span>
                      </div>
                    );
                  }
                } else if (dataObj.event_dates && dataObj.event_dates.length > 0) {
                  return (
                    <div className={styles.detailContent}>
                      <span className={styles.detailLabel}>
                        <FaCalendar className={styles.detailIcon} />
                        Event Date
                      </span>
                      <div className={styles.eventDatesList}>
                        {dataObj.event_dates.map((date, index) => (
                          <span key={index} className={styles.eventDateTag}>
                            {formatDateShort(date)}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                }
                return null;
              })()}
            </div>

            {/* Description */}
            {dataObj.description && (
              <div className={styles.programDescription}>
                <div className={styles.descriptionLabel}>Description</div>
                <div 
                  className={styles.descriptionText}
                  dangerouslySetInnerHTML={{ 
                    __html: DOMPurify.sanitize(dataObj.description) 
                  }} 
                />
              </div>
            )}

            {/* Additional Images */}
            {dataObj.additionalImages && Array.isArray(dataObj.additionalImages) && dataObj.additionalImages.length > 0 && (
              <div className={styles.additionalImagesSection}>
                <div className={styles.additionalImagesLabel}>Additional Images ({dataObj.additionalImages.length})</div>
                <div className={styles.additionalImagesGrid}>
                  {dataObj.additionalImages.map((image, index) => (
                    <div key={index} className={styles.additionalImagePreview}>
                      {getProgramImageUrl(image, 'additional') === 'IMAGE_UNAVAILABLE' ? (
                        <div className={styles.imageError}>
                          <FaExclamationTriangle />
                          <span>Image {index + 1} unavailable</span>
                        </div>
                      ) : (
                        <Image 
                          src={getProgramImageUrl(image, 'additional')} 
                          alt={`Additional image ${index + 1}`} 
                          className={styles.additionalImage}
                          width={120}
                          height={120}
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'block';
                          }}
                        />
                      )}
                      <div className={styles.imageError} style={{display: 'none'}}>
                        <FaExclamationTriangle />
                        <span>Image {index + 1} unavailable</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Collaboration Section */}
            {dataObj.collaborators && Array.isArray(dataObj.collaborators) && dataObj.collaborators.length > 0 && (
              <div className={styles.collaborationSection}>
                <div className={styles.collaborationLabel}>
                  <FaUsers className={styles.collaborationIcon} />
                  Collaborators ({dataObj.collaborators.length})
                </div>
                <div className={styles.collaboratorsList}>
                  {dataObj.collaborators.map((collaborator, index) => (
                    <div key={collaborator.id || index} className={styles.collaboratorItem}>
                      <div className={styles.collaboratorInfo}>
                        <span className={styles.collaboratorEmail}>{collaborator.email || 'Unknown Email'}</span>
                        <span className={styles.collaboratorOrg}>
                          ({collaborator.organization_acronym || collaborator.organization_name || 'Unknown Org'})
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Rejection Comment for Programs */}
            {submissionData.status === 'rejected' && submissionData.rejection_reason && (
              <div className={styles.rejectionSection}>
                <div className={styles.rejectionLabel}>Rejection Reason</div>
                <div className={styles.rejectionComment}>
                  {submissionData.rejection_reason}
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Post Act Report Section - Outside programLayout to span full width */}
        {dataObj.postActReport && dataObj.postActReport.file_url && (
          <div className={styles.postActReportSection}>
            <div className={styles.postActReportLabel}>
              <FaFile className={styles.postActReportIcon} />
              Post Act Report
            </div>
            <div className={styles.postActReportContent}>
              <a 
                href={dataObj.postActReport.file_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className={styles.postActReportLink}
              >
                View/Download Post Act Report
              </a>
            </div>
          </div>
        )}
        </>
      );
    } else if (currentData.section === 'highlights') {
      // Parse media_files
      let mediaFiles = [];
      if (Array.isArray(dataObj.media_files)) {
        mediaFiles = dataObj.media_files;
      } else if (dataObj.media_files) {
        const parsed = parseJsonData(dataObj.media_files);
        mediaFiles = Array.isArray(parsed) ? parsed : [];
      } else if (dataObj.media) {
        mediaFiles = Array.isArray(dataObj.media) ? dataObj.media : [];
      }

      return (
        <div className={styles.highlightLayout}>
          {/* Highlight Title */}
          <div className={styles.highlightTitle}>{dataObj.title || 'Untitled Highlight'}</div>

          {/* Highlight Details */}
          <div className={styles.highlightDetails}>
            {/* Description */}
            {dataObj.description && (
              <div className={styles.highlightDetailItem}>
                <div className={styles.detailLabel}>Description</div>
                <div 
                  className={styles.detailValue}
                  dangerouslySetInnerHTML={{ 
                    __html: DOMPurify.sanitize(dataObj.description) 
                  }} 
                />
              </div>
            )}

            {/* Associated Program */}
            {dataObj.program_id && (
              <div className={styles.highlightDetailItem}>
                <div className={styles.detailLabel}>
                  <FaTag className={styles.detailIcon} />
                  Associated Program
                </div>
                <div className={styles.detailValue}>
                  {loadingProgram ? (
                    <span>Loading...</span>
                  ) : dataObj.program_title || programTitle || `Program #${dataObj.program_id}`}
                </div>
              </div>
            )}
          </div>

          {/* Media Files */}
          {mediaFiles.length > 0 && (
            <div className={styles.mediaSection}>
              <div className={styles.mediaLabel}>
                <FaFile className={styles.mediaIcon} />
                Media Files ({mediaFiles.length})
              </div>
              <div className={styles.mediaGrid}>
                {mediaFiles.map((file, index) => {
                  const fileUrl = file.url || file.filename;
                  const fileName = file.filename || file.originalName || `File ${index + 1}`;
                  const isImage = file.mimetype?.startsWith('image/') || 
                                 /\.(jpg|jpeg|png|gif|webp)$/i.test(fileName);
                  const isVideo = file.mimetype?.startsWith('video/') || 
                                 /\.(mp4|avi|mov|wmv|flv|webm)$/i.test(fileName);

                  return (
                    <div key={index} className={styles.mediaItem}>
                      {isImage && fileUrl ? (
                        <Image
                          src={fileUrl}
                          alt={fileName}
                          className={styles.mediaImage}
                          width={150}
                          height={150}
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                          }}
                        />
                      ) : isVideo && fileUrl ? (
                        <div className={styles.mediaVideoPlaceholder}>
                          <FaFile />
                          <span>Video File</span>
                        </div>
                      ) : (
                        <div className={styles.mediaFilePlaceholder}>
                          <FaFile />
                          <span>File</span>
                        </div>
                      )}
                      <div className={styles.mediaError} style={{display: 'none'}}>
                        <FaExclamationTriangle />
                        <span>Unavailable</span>
                      </div>
                      <div className={styles.mediaFileName}>{fileName}</div>
                      {fileUrl && (
                        <a
                          href={fileUrl}
                          target="_blank"
                          rel="noreferrer noopener"
                          className={styles.mediaLink}
                        >
                          View
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      );
    }

    // Fallback to JSON display
    return (
      <pre className={styles.jsonData}>
        {JSON.stringify(dataObj, null, 2)}
      </pre>
    );
  };

  return (
    <div className={styles.modalBackdrop}>
      <div className={styles.modalContainer}>
        {/* Header */}
        <div className={styles.modalHeader}>
          <div className={styles.headerContent}>
            <h2 className={styles.modalTitle}>
              {submissionData?.section ? submissionData.section.charAt(0).toUpperCase() + submissionData.section.slice(1) : 'Submission'} Submission Details
            </h2>
            <p className={styles.modalSubtitle}>
              Review the submission information and changes
            </p>
          </div>
          <button className={styles.closeButton} onClick={onClose} aria-label="Close modal">
            <FaTimes />
          </button>
        </div>

        {/* Content */}
        <div className={styles.modalContent}>
          {/* Loading state */}
          {loadingFullData && (
            <div className={styles.loadingContainer}>
              <p>Loading submission details...</p>
            </div>
          )}

          {/* Submission Meta */}
          {!loadingFullData && (
            <>
          <div className={styles.submissionMeta}>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Status</span>
              <span className={`${styles.statusBadge} ${styles[submissionData.status]}`}>
                {submissionData.status.charAt(0).toUpperCase() + submissionData.status.slice(1)}
              </span>
            </div>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Submitted</span>
              <span className={styles.metaValue}>
                {formatDateShort(submissionData.submitted_at)}
              </span>
            </div>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Time</span>
              <span className={styles.metaValue}>
                {formatTimeOnly(submissionData.submitted_at)}
              </span>
            </div>
          </div>

          {/* Rejection Feedback */}
          {submissionData.status === 'rejected' && submissionData.rejection_reason && (
            <div className={styles.rejectionAlert}>
              <div className={styles.alertIcon}>
                <FaExclamationTriangle />
              </div>
              <div className={styles.alertContent}>
                <h4 className={styles.alertTitle}>Rejection Feedback</h4>
                <p className={styles.alertMessage}>{submissionData.rejection_reason}</p>
              </div>
            </div>
          )}

          {/* Data Comparison */}
          {submissionData.section === 'Post Act Report' ? (
            // For Post Act Report, show only the uploaded file
            <div className={styles.dataComparisonSingle}>
              <div className={styles.dataSection}>
                <h3 className={styles.sectionTitle}>Uploaded File</h3>
                <div className={styles.dataContent}>
                  {(() => {
                    try {
                      const proposedData = parseJsonData(submissionData.proposed_data);
                      const fileUrl = proposedData?.file_url;
                      
                      if (!fileUrl) {
                        return <div className={styles.noData}>No file available</div>;
                      }
                      
                      const fileName = getFileNameFromUrl(fileUrl);
                      
                      // Determine if it's an image or non-image file
                      const fileExtension = fileUrl.split('.').pop()?.toLowerCase().split('?')[0];
                      const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'svg'].includes(fileExtension);
                      
                      // S3 URLs work directly with proper Content-Type headers - no URL conversion needed
                      // For images: open in new tab
                      // For non-image files (PDFs, DOC, DOCX): download via fetch to ensure correct file type
                      const handleFileClick = async (e) => {
                        if (!isImage) {
                          e.preventDefault();
                          try {
                            // Fetch the file from S3 (serves with correct Content-Type automatically)
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
                            link.download = fileName; // Use filename with extension
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                            
                            // Clean up the object URL
                            window.URL.revokeObjectURL(downloadUrl);
                          } catch (error) {
                            // Fallback: try direct download (S3 URLs work directly)
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
            // All submissions in the submission flow are new - no previous data comparison
            (() => {
              const sectionTitles = {
                'programs': 'Program Details',
                'highlights': 'Highlight Details',
                'Post Act Report': 'Post Act Report'
              };
              
              return (
                <div className={styles.dataComparisonSingle}>
                  <div className={styles.dataSection}>
                    <h3 className={styles.sectionTitle}>
                      {sectionTitles[submissionData.section] || 'Submission Details'}
                    </h3>
                    <div className={styles.dataContent}>
                      {formatData(parseJsonData(submissionData.proposed_data))}
                    </div>
                  </div>
                </div>
              );
            })()
          )}
            </>
          )}
        </div>

      </div>

    </div>
  );
}