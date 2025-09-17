'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { FaTimes, FaCalendarAlt, FaBuilding, FaFileAlt, FaUser, FaClock, FaCheckCircle, FaTimesCircle, FaExclamationCircle } from 'react-icons/fa';
import { getApiUrl, getAuthHeaders } from '../../utils/profileApi';
import styles from './ApplicationDetailsModal.module.css';

export default function ApplicationDetailsModal({ isOpen, onClose, applicationId }) {
  const [application, setApplication] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchApplicationDetails = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('Fetching application details for ID:', applicationId);
      const response = await fetch(getApiUrl(`/api/users/applications/${applicationId}`), {
        headers: getAuthHeaders()
      });

      console.log('Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Application data received:', data);
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

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'approved':
        return <FaCheckCircle className={styles.statusIconApproved} />;
      case 'rejected':
        return <FaTimesCircle className={styles.statusIconRejected} />;
      case 'pending':
      default:
        return <FaExclamationCircle className={styles.statusIconPending} />;
    }
  };

  const getStatusText = (status) => {
    switch (status?.toLowerCase()) {
      case 'approved':
        return 'Approved';
      case 'rejected':
        return 'Rejected';
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
              <div className={styles.spinner}></div>
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
              {/* Program Image */}
              {application.programImage && (
                <div className={styles.programImageContainer}>
                  <Image 
                    src={application.programImage} 
                    alt={application.programName}
                    className={styles.programImage}
                    width={400}
                    height={300}
                    style={{ objectFit: 'cover' }}
                  />
                </div>
              )}

              {/* Program Title and Status */}
              <div className={styles.programHeader}>
                <h3 className={styles.programTitle}>{application.programName}</h3>
                <div className={styles.statusContainer}>
                  {getStatusIcon(application.status)}
                  <span className={`${styles.statusBadge} ${styles[`status${application.status?.charAt(0).toUpperCase() + application.status?.slice(1)}`]}`}>
                    {getStatusText(application.status)}
                  </span>
                </div>
              </div>

              {/* Program Description */}
              {application.programDescription && (
                <div className={styles.section}>
                  <h4 className={styles.sectionTitle}>
                    <FaFileAlt className={styles.sectionIcon} />
                    Program Description
                  </h4>
                  <p className={styles.sectionContent}>{application.programDescription}</p>
                </div>
              )}

              {/* Program Category */}
              {application.programCategory && (
                <div className={styles.section}>
                  <h4 className={styles.sectionTitle}>
                    <FaFileAlt className={styles.sectionIcon} />
                    Category
                  </h4>
                  <span className={styles.categoryBadge}>{application.programCategory}</span>
                </div>
              )}

              {/* Program Dates */}
              {(application.programStartDate || application.programEndDate) && (
                <div className={styles.section}>
                  <h4 className={styles.sectionTitle}>
                    <FaCalendarAlt className={styles.sectionIcon} />
                    Program Dates
                  </h4>
                  <div className={styles.dateInfo}>
                    {application.programStartDate && (
                      <div className={styles.dateItem}>
                        <span className={styles.dateLabel}>Start Date:</span>
                        <span className={styles.dateValue}>{formatDate(application.programStartDate)}</span>
                      </div>
                    )}
                    {application.programEndDate && (
                      <div className={styles.dateItem}>
                        <span className={styles.dateLabel}>End Date:</span>
                        <span className={styles.dateValue}>{formatDate(application.programEndDate)}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Organization Info */}
              {application.organizationName && (
                <div className={styles.section}>
                  <h4 className={styles.sectionTitle}>
                    <FaBuilding className={styles.sectionIcon} />
                    Organization
                  </h4>
                  <div className={styles.organizationInfo}>
                    {application.organizationLogo && (
                      <Image 
                        src={application.organizationLogo} 
                        alt={application.organizationName}
                        className={styles.organizationLogo}
                        width={60}
                        height={60}
                        style={{ objectFit: 'contain' }}
                      />
                    )}
                    <div className={styles.organizationDetails}>
                      <span className={styles.organizationName}>{application.organizationName}</span>
                      {application.organizationAcronym && (
                        <span className={styles.organizationAcronym}>({application.organizationAcronym})</span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Application Notes */}
              {application.notes && (
                <div className={styles.section}>
                  <h4 className={styles.sectionTitle}>
                    <FaUser className={styles.sectionIcon} />
                    Your Application Notes
                  </h4>
                  <div className={styles.notesContainer}>
                    <p className={styles.notesContent}>{application.notes}</p>
                  </div>
                </div>
              )}

              {/* Application Timeline */}
              <div className={styles.section}>
                <h4 className={styles.sectionTitle}>
                  <FaClock className={styles.sectionIcon} />
                  Application Timeline
                </h4>
                <div className={styles.timelineContainer}>
                  <div className={styles.timelineItem}>
                    <div className={styles.timelineDot}></div>
                    <div className={styles.timelineContent}>
                      <span className={styles.timelineLabel}>Applied</span>
                      <span className={styles.timelineDate}>{formatDate(application.appliedAt)}</span>
                    </div>
                  </div>
                  {application.updatedAt && application.updatedAt !== application.appliedAt && (
                    <div className={styles.timelineItem}>
                      <div className={styles.timelineDot}></div>
                      <div className={styles.timelineContent}>
                        <span className={styles.timelineLabel}>Last Updated</span>
                        <span className={styles.timelineDate}>{formatDate(application.updatedAt)}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
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
