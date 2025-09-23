'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { FaTimes, FaUser, FaFileAlt, FaTimesCircle, FaCheckCircle } from 'react-icons/fa';
import { FiCalendar, FiClock } from 'react-icons/fi';
import Image from 'next/image';
import Link from 'next/link';
import { getApiUrl, getAuthHeaders } from '../../utils/profileApi';
import { formatDateLong, formatProgramDates } from '@/utils/dateUtils';
import { getOrganizationImageUrl } from '@/utils/uploadPaths';
import styles from './ApplicationDetailsModal.module.css';
import sharedStyles from './MyApplications.module.css';

export default function ApplicationDetailsModal({ isOpen, onClose, applicationId }) {
  const [application, setApplication] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchApplicationDetails = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(getApiUrl(`/api/users/applications/${applicationId}`), {
        headers: getAuthHeaders()
      });
      
      if (response.ok) {
        const data = await response.json();
        setApplication(data.application);
      } else {
        const errorData = await response.json();
        console.error('API Error:', errorData);
        setError(errorData.message || 'Failed to fetch application details');
      }
    } catch (err) {
      console.error('Network Error:', err);
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [applicationId]);

  useEffect(() => {
    if (isOpen && applicationId) {
      fetchApplicationDetails();
    } else if (!isOpen) {
      // Reset state when modal is closed
      setApplication(null);
      setError(null);
      setIsLoading(false);
    }
  }, [isOpen, applicationId, fetchApplicationDetails]);

  useEffect(() => {
    if (isOpen) {
      // Prevent body scroll and ensure modal covers entire screen
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.height = '100%';
    } else {
      // Restore body styles
      document.body.style.overflow = 'auto';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.height = '';
    }

    return () => {
      // Cleanup: always restore body styles
      document.body.style.overflow = 'auto';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.height = '';
    };
  }, [isOpen]);

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Using centralized date utility for consistent long date formatting
  const formatDate = (dateString) => {
    return formatDateLong(dateString);
  };


  const getStatusText = (status) => {
    switch (status?.toLowerCase()) {
      case 'approved':
        return 'Approved';
      case 'rejected':
      case 'declined':
        return 'Declined';
      case 'cancelled':
        return 'Cancelled';
      case 'completed':
        return 'Completed';
      case 'pending':
      default:
        return 'Pending Review';
    }
  };

  if (!isOpen) return null;

  const modalContent = (
    <div className={styles.modalOverlay} onClick={handleBackdropClick}>
      <div className={styles.modalContainer}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Application Details</h2>
          <button className={styles.closeButton} onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        <div className={styles.modalContent}>
          {isLoading ? (
            <div className={styles.loadingState}>
              <div className={sharedStyles.spinner}></div>
              <p>Loading application details...</p>
            </div>
          ) : error ? (
            <div className={styles.errorState}>
              <FaTimesCircle className={styles.errorIcon} />
              <h3>Error</h3>
              <p>{error}</p>
              <button className={styles.retryButton} onClick={fetchApplicationDetails}>
                Try Again
              </button>
            </div>
          ) : application ? (
            <div className={styles.applicationDetails}>
              {/* Program Header */}
              <div className={styles.programHeader}>
                <div className={styles.programTitleSection}>
                  <h3 className={styles.programTitle}>{application.programName}</h3>
                  <div className={styles.statusContainer}>
                    <span className={`${sharedStyles.statusBadge} ${sharedStyles[`status${application.status?.charAt(0).toUpperCase() + application.status?.slice(1)}`]}`}>
                      {getStatusText(application.status)}
                    </span>
                  </div>
                </div>
                
                {application.organizationName && (
                  <div className={styles.organizationInfo}>
                    {application.orgLogo && (
                      <Image 
                        src={getOrganizationImageUrl(application.orgLogo)}
                        alt={`${application.organizationName} logo`}
                        width={24}
                        height={24}
                        className={styles.organizationLogo}
                        style={{
                          borderRadius: '50%',
                          objectFit: 'cover',
                          overflow: 'hidden'
                        }}
                      />
                    )}
                    <Link 
                      href={`/programs/org/${application.organizationAcronym}`}
                      className={styles.organizationLink}
                    >
                      <span className={styles.organizationName}>{application.organizationName}</span>
                      {application.organizationAcronym && (
                        <span className={styles.organizationAcronym}>({application.organizationAcronym})</span>
                      )}
                    </Link>
                  </div>
                )}
              </div>

              {/* Program Details Grid */}
              <div className={styles.detailsGrid}>
                {/* Program Schedule */}
                <div className={styles.detailCard}>
                  <div className={styles.detailHeader}>
                    <FiCalendar className={styles.detailIcon} />
                    <h4 className={styles.detailTitle}>Program Schedule</h4>
                  </div>
                  <div className={styles.detailContent}>
                    <div className={styles.scheduleItem}>
                      <span className={styles.scheduleLabel}>Date:</span>
                      <span className={styles.scheduleValue}>
                        {formatProgramDates(application)}
                      </span>
                    </div>
                    {application.programStartTime && application.programEndTime && (
                      <div className={styles.scheduleItem}>
                        <span className={styles.scheduleLabel}>Time:</span>
                        <span className={styles.scheduleValue}>
                          <FiClock className={styles.timeIcon} />
                          {application.programStartTime} - {application.programEndTime}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Application Timeline */}
                <div className={styles.detailCard}>
                  <div className={styles.detailHeader}>
                    <FaFileAlt className={styles.detailIcon} />
                    <h4 className={styles.detailTitle}>Application Timeline</h4>
                  </div>
                  <div className={styles.detailContent}>
                    <div className={styles.timelineItem}>
                      <div className={styles.timelineDot}></div>
                      <div className={styles.timelineContent}>
                        <span className={styles.timelineLabel}>Application Submitted</span>
                        <span className={styles.timelineDate}>{formatDate(application.appliedAt)}</span>
                      </div>
                    </div>
                    {application.status !== 'pending' && (
                      <div className={styles.timelineItem}>
                        <div className={styles.timelineDot}></div>
                        <div className={styles.timelineContent}>
                          <span className={styles.timelineLabel}>
                            {application.status === 'approved' ? 'Application Approved' : 
                             application.status === 'rejected' || application.status === 'declined' ? 'Application Declined' : 
                             application.status === 'completed' ? 'Application Completed' :
                             'Application Cancelled'}
                          </span>
                          <span className={styles.timelineDate}>
                            {application.updatedAt ? formatDate(application.updatedAt) : 'Recently'}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Application Notes */}
              {application.notes && (
                <div className={styles.notesSection}>
                  <div className={styles.notesHeader}>
                    <FaUser className={styles.notesIcon} />
                    <h4 className={styles.notesTitle}>Your Application Notes</h4>
                  </div>
                  <div className={styles.notesContent}>
                    <p>{application.notes}</p>
                  </div>
                </div>
              )}

              {/* Feedback Section */}
              {application.feedback && (
                <div className={styles.feedbackSection}>
                  <div className={styles.feedbackHeader}>
                    <FaCheckCircle className={styles.feedbackIcon} />
                    <h4 className={styles.feedbackTitle}>Admin Feedback</h4>
                  </div>
                  <div className={styles.feedbackContent}>
                    <p>{application.feedback}</p>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>

        <div className={styles.modalFooter}>
          <button className={styles.closeModalButton} onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );

  // Ensure document.body exists before creating portal
  if (typeof document !== 'undefined' && document.body) {
    return createPortal(modalContent, document.body);
  }
  
  // Fallback for SSR or if document.body doesn't exist
  return null;
}
