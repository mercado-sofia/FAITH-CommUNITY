'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { FaTimes, FaCalendarAlt, FaUser, FaCheckCircle, FaTimesCircle, FaExclamationCircle } from 'react-icons/fa';
import { getApiUrl, getAuthHeaders } from '../../utils/profileApi';
import { formatDateLong } from '@/utils/dateUtils';
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

  // Using centralized date utility for consistent long date formatting
  const formatDate = (dateString) => {
    return formatDateLong(dateString);
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

              {/* Application Date */}
              <div className={styles.section}>
                <h4 className={styles.sectionTitle}>
                  <FaCalendarAlt className={styles.sectionIcon} />
                  Date Applied
                </h4>
                <p className={styles.sectionContent}>{formatDate(application.appliedAt)}</p>
              </div>

              {/* Application Notes/Reason */}
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
