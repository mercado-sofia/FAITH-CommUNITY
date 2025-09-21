'use client';

import { useState, useEffect } from 'react';
import { FaFileAlt, FaCalendarAlt } from 'react-icons/fa';
import Image from 'next/image';
import { getApiUrl, getAuthHeaders } from '../../utils/profileApi';
import { formatDateShort, formatProgramDate } from '@/utils/dateUtils';
import { getProgramImageUrl } from '@/utils/uploadPaths';
import ApplicationDetailsModal from './ApplicationDetailsModal';
import CancelConfirmationModal from './CancelConfirmationModal';
import styles from './MyApplications.module.css';

export default function MyApplications() {
  const [applications, setApplications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, pending, approved, rejected
  const [selectedApplicationId, setSelectedApplicationId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [applicationToCancel, setApplicationToCancel] = useState(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState(null);
  const [isViewingDetails, setIsViewingDetails] = useState(false);

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      const token = localStorage.getItem('userToken');
      
      if (!token) {
        setIsLoading(false);
        return;
      }
      
      const response = await fetch(getApiUrl('/api/users/applications'), {
        headers: getAuthHeaders()
      });

      if (response.ok) {
        const data = await response.json();
        setApplications(data.applications || []);
      } else {
        setApplications([]);
      }
    } catch (error) {
      setApplications([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Removed status icons for cleaner look

  const getStatusText = (status) => {
    switch (status.toLowerCase()) {
      case 'approved':
        return 'Approved';
      case 'rejected':
        return 'Rejected';
      case 'cancelled':
        return 'Cancelled';
      case 'pending':
      default:
        return 'Pending Review';
    }
  };

  const canCancelApplication = (status) => {
    const lowerStatus = status.toLowerCase();
    return lowerStatus === 'pending' || lowerStatus === 'approved';
  };

  // Using centralized date utilities - formatDate and formatProgramDate are now imported

  const filteredApplications = applications.filter(app => {
    if (filter === 'all') return true;
    return app.status.toLowerCase() === filter;
  });

  const handleViewDetails = (applicationId) => {
    if (isViewingDetails) return; // Prevent multiple clicks
    
    try {
      console.log('Opening details for application ID:', applicationId);
      setIsViewingDetails(true);
      setSelectedApplicationId(applicationId);
      setIsModalOpen(true);
    } catch (error) {
      console.error('Error opening application details:', error);
      setFeedbackMessage({
        type: 'error',
        text: 'Failed to open application details'
      });
      setIsViewingDetails(false);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedApplicationId(null);
    setIsViewingDetails(false);
  };

  const handleCancelApplication = (application) => {
    setApplicationToCancel(application);
    setCancelModalOpen(true);
  };

  const handleCloseCancelModal = () => {
    setCancelModalOpen(false);
    setApplicationToCancel(null);
    setIsCancelling(false);
  };

  const handleConfirmCancel = async () => {
    if (!applicationToCancel) return;

    setIsCancelling(true);
    setFeedbackMessage(null);

    try {
      const response = await fetch(getApiUrl(`/api/users/applications/${applicationToCancel.id}/cancel`), {
        method: 'PUT',
        headers: getAuthHeaders()
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Update the application status in the local state
        setApplications(prevApplications => 
          prevApplications.map(app => 
            app.id === applicationToCancel.id 
              ? { ...app, status: 'cancelled' }
              : app
          )
        );
        
        setFeedbackMessage({
          type: 'success',
          text: 'Application cancelled successfully'
        });
        
        handleCloseCancelModal();
      } else {
        setFeedbackMessage({
          type: 'error',
          text: data.message || 'Failed to cancel application'
        });
      }
    } catch (error) {
      setFeedbackMessage({
        type: 'error',
        text: 'Network error. Please try again.'
      });
    } finally {
      setIsCancelling(false);
    }
  };

  // Clear feedback message after 5 seconds
  useEffect(() => {
    if (feedbackMessage) {
      const timer = setTimeout(() => {
        setFeedbackMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [feedbackMessage]);

  if (isLoading) {
    return (
      <div className={styles.myApplicationsSection}>
        <div className={styles.sectionHeader}>
          <h2>My Applications</h2>
        </div>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Loading applications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.myApplicationsSection}>
      <div className={styles.sectionHeader}>
        <h2>My Applications</h2>
      </div>

      {/* Filter Tabs */}
      <div className={styles.filterTabs}>
        <button
          className={`${styles.filterTab} ${filter === 'all' ? styles.active : ''}`}
          onClick={() => setFilter('all')}
        >
          All Applications ({applications.length})
        </button>
        <button
          className={`${styles.filterTab} ${filter === 'pending' ? styles.active : ''}`}
          onClick={() => setFilter('pending')}
        >
          Pending ({applications.filter(app => app.status.toLowerCase() === 'pending').length})
        </button>
        <button
          className={`${styles.filterTab} ${filter === 'approved' ? styles.active : ''}`}
          onClick={() => setFilter('approved')}
        >
          Approved ({applications.filter(app => app.status.toLowerCase() === 'approved').length})
        </button>
        <button
          className={`${styles.filterTab} ${filter === 'rejected' ? styles.active : ''}`}
          onClick={() => setFilter('rejected')}
        >
          Rejected ({applications.filter(app => app.status.toLowerCase() === 'rejected').length})
        </button>
      </div>

      {/* Feedback Message */}
      {feedbackMessage && (
        <div className={`${styles.feedbackMessage} ${styles[feedbackMessage.type]}`}>
          <span>{feedbackMessage.text}</span>
          <button 
            className={styles.closeFeedback}
            onClick={() => setFeedbackMessage(null)}
          >
            ×
          </button>
        </div>
      )}

      {/* Applications List */}
      <div className={styles.applicationsList}>
        {filteredApplications.length === 0 ? (
          <div className={styles.emptyState}>
            <FaFileAlt className={styles.emptyIcon} />
            <p>No applications found</p>
            <span>
              {filter === 'all' 
                ? "You haven't applied to any programs yet" 
                : `No ${filter} applications found`
              }
            </span>
          </div>
        ) : (
          <div className={styles.applicationsContainer}>
            {filteredApplications.map((application) => (
              <div key={application.id} className={`${styles.applicationCard} ${application.status.toLowerCase() === 'pending' ? styles.pendingCard : ''}`}>
                <div className={styles.applicationContent}>
                  {/* Program Image Thumbnail */}
                  <div className={styles.programImageThumbnail}>
                    {application.programImage ? (
                      <Image 
                        src={getProgramImageUrl(application.programImage)} 
                        alt={application.programName}
                        width={120}
                        height={90}
                        className={styles.thumbnailImage}
                        style={{ objectFit: 'cover' }}
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div className={styles.placeholderImage} style={{ display: application.programImage ? 'none' : 'flex' }}>
                      <FaFileAlt className={styles.placeholderIcon} />
                    </div>
                  </div>

                  <div className={styles.applicationInfo}>
                    <div className={styles.applicationHeader}>
                      {/* Program Date with Calendar Icon */}
                      {application.programStartDate && (
                        <div className={styles.programDateRow}>
                          <FaCalendarAlt className={styles.calendarIcon} />
                          <span className={styles.programDateText}>
                            {formatProgramDate(application.programStartDate, application.programEndDate)}
                          </span>
                        </div>
                      )}
                      
                      {/* Program Title */}
                      <div className={styles.applicationTitle}>
                        <h3>{application.programName}</h3>
                      </div>

                      {/* Organization Info */}
                      {application.organizationName && (
                        <div className={styles.organizationInfo}>
                          {application.organizationLogo ? (
                            <Image
                              src={`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080'}${application.organizationLogo}`}
                              alt={`${application.organizationName} logo`}
                              className={styles.organizationLogo}
                              width={24}
                              height={24}
                              style={{ objectFit: 'contain' }}
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'block';
                              }}
                            />
                          ) : null}
                          <div className={styles.organizationLogoFallback} style={{ display: application.organizationLogo ? 'none' : 'block' }}></div>
                          <span className={styles.organizationName}>{application.organizationName}</span>
                          {application.organizationAcronym && (
                            <span className={styles.organizationAcronym}>({application.organizationAcronym})</span>
                          )}
                        </div>
                      )}
                      
                      {/* Application Meta */}
                      <div className={styles.applicationMeta}>
                        <span className={styles.applicationDate}>
                          Date Applied: {formatDateShort(application.appliedAt)}
                        </span>
                        <span className={`${styles.statusBadge} ${styles[`status${application.status.charAt(0).toUpperCase() + application.status.slice(1)}`]}`}>
                          {getStatusText(application.status)}
                        </span>
                      </div>
                    </div>

                {application.notes && (
                  <div className={styles.applicationNotes}>
                    <p>{application.notes}</p>
                  </div>
                )}

                {application.feedback && (
                  <div className={styles.applicationFeedback}>
                    <p>{application.feedback}</p>
                  </div>
                )}

                    <div className={styles.applicationActions}>
                      <button 
                        className={styles.viewButton}
                        onClick={() => handleViewDetails(application.id)}
                        disabled={isViewingDetails}
                        aria-label={`View details for ${application.programName} application`}
                      >
                        {isViewingDetails ? 'Loading...' : 'View Details'}
                      </button>
                      {canCancelApplication(application.status) && (
                        <button 
                          className={styles.cancelButton}
                          onClick={() => handleCancelApplication(application)}
                          aria-label={`Cancel ${application.programName} application`}
                        >
                          Cancel Application
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Application Details Modal */}
      <ApplicationDetailsModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        applicationId={selectedApplicationId}
      />

      {/* Cancel Confirmation Modal */}
      <CancelConfirmationModal
        isOpen={cancelModalOpen}
        onClose={handleCloseCancelModal}
        onConfirm={handleConfirmCancel}
        applicationName={applicationToCancel?.programName}
        isLoading={isCancelling}
      />
    </div>
  );
}
