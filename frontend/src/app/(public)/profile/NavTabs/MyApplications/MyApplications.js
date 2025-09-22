'use client';

import { useState, useEffect } from 'react';
import { FaFileAlt, FaEllipsisH } from 'react-icons/fa';
import { FiCalendar } from 'react-icons/fi';
import { FaRegClock } from 'react-icons/fa6';
import Image from 'next/image';
import Link from 'next/link';
import { getApiUrl, getAuthHeaders } from '../../utils/profileApi';
import { formatDateShort, formatProgramDate } from '@/utils/dateUtils';
import { getProgramImageUrl } from '@/utils/uploadPaths';
import ApplicationDetailsModal from './ApplicationDetailsModal';
import ConfirmationModal from '../../components/ConfirmationModal';
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
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [applicationToDelete, setApplicationToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [applicationToComplete, setApplicationToComplete] = useState(null);
  const [isCompleting, setIsCompleting] = useState(false);

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


  const getStatusText = (status) => {
    switch (status.toLowerCase()) {
      case 'approved':
        return 'Approved';
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

  const canCancelApplication = (status) => {
    const lowerStatus = status.toLowerCase();
    return lowerStatus === 'pending' || lowerStatus === 'approved';
  };

  const canCompleteApplication = (status) => {
    const lowerStatus = status.toLowerCase();
    return lowerStatus === 'approved';
  };

  const canDeleteApplication = (status) => {
    const lowerStatus = status.toLowerCase();
    return lowerStatus !== 'completed'; // Completed applications cannot be deleted
  };


  const filteredApplications = applications.filter(app => {
    if (filter === 'all') return true;
    return app.status.toLowerCase() === filter.toLowerCase();
  });

  const handleViewDetails = (applicationId) => {
    if (isViewingDetails) return; // Prevent multiple clicks
    
    try {
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

  const handleDeleteApplication = (application) => {
    setApplicationToDelete(application);
    setDeleteModalOpen(true);
    setActiveDropdown(null);
  };

  const handleCompleteApplication = (application) => {
    setApplicationToComplete(application);
    setCompleteModalOpen(true);
    setActiveDropdown(null);
  };

  const handleCloseDeleteModal = () => {
    setDeleteModalOpen(false);
    setApplicationToDelete(null);
    setIsDeleting(false);
  };

  const handleCloseCompleteModal = () => {
    setCompleteModalOpen(false);
    setApplicationToComplete(null);
    setIsCompleting(false);
  };

  const handleConfirmDelete = async () => {
    if (!applicationToDelete) return;

    setIsDeleting(true);
    setFeedbackMessage(null);

    try {
      const response = await fetch(getApiUrl(`/api/users/applications/${applicationToDelete.id}`), {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Handle different responses based on application status
        if (applicationToDelete.status.toLowerCase() === 'approved') {
          // For approved applications, update status to cancelled instead of removing
          setApplications(prevApplications => 
            prevApplications.map(app => 
              app.id === applicationToDelete.id 
                ? { ...app, status: 'cancelled' }
                : app
            )
          );
          
          setFeedbackMessage({
            type: 'success',
            text: 'Application cancelled successfully'
          });
        } else {
          // For other applications, remove from the list
          setApplications(prevApplications => 
            prevApplications.filter(app => app.id !== applicationToDelete.id)
          );
          
          setFeedbackMessage({
            type: 'success',
            text: 'Application deleted successfully'
          });
        }
        
        handleCloseDeleteModal();
      } else {
        setFeedbackMessage({
          type: 'error',
          text: data.message || 'Failed to delete application'
        });
      }
    } catch (error) {
      setFeedbackMessage({
        type: 'error',
        text: 'Network error. Please try again.'
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleConfirmComplete = async () => {
    if (!applicationToComplete) return;

    setIsCompleting(true);
    setFeedbackMessage(null);

    try {
      const response = await fetch(getApiUrl(`/api/users/applications/${applicationToComplete.id}/complete`), {
        method: 'PUT',
        headers: getAuthHeaders()
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Update the application status in the local state
        setApplications(prevApplications => 
          prevApplications.map(app => 
            app.id === applicationToComplete.id 
              ? { ...app, status: 'completed' }
              : app
          )
        );
        
        setFeedbackMessage({
          type: 'success',
          text: 'Application marked as completed successfully'
        });
        
        handleCloseCompleteModal();
      } else {
        setFeedbackMessage({
          type: 'error',
          text: data.message || 'Failed to mark application as completed'
        });
      }
    } catch (error) {
      setFeedbackMessage({
        type: 'error',
        text: 'Network error. Please try again.'
      });
    } finally {
      setIsCompleting(false);
    }
  };

  const toggleDropdown = (applicationId) => {
    setActiveDropdown(activeDropdown === applicationId ? null : applicationId);
  };

  const closeDropdown = () => {
    setActiveDropdown(null);
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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (activeDropdown && !event.target.closest('.dropdown-container')) {
        closeDropdown();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [activeDropdown]);

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
          All ({applications.length})
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
          className={`${styles.filterTab} ${filter === 'declined' ? styles.active : ''}`}
          onClick={() => setFilter('declined')}
        >
          Declined ({applications.filter(app => app.status.toLowerCase() === 'declined').length})
        </button>
        <button
          className={`${styles.filterTab} ${filter === 'cancelled' ? styles.active : ''}`}
          onClick={() => setFilter('cancelled')}
        >
          Cancelled ({applications.filter(app => app.status.toLowerCase() === 'cancelled').length})
        </button>
        <button
          className={`${styles.filterTab} ${filter === 'completed' ? styles.active : ''}`}
          onClick={() => setFilter('completed')}
        >
          Completed ({applications.filter(app => app.status.toLowerCase() === 'completed').length})
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
              <div key={application.id} className={styles.applicationCard}>
                {/* Three Dots Menu - Positioned at card level */}
                <div className={`${styles.dropdownContainer} dropdown-container`}>
                  <button 
                    className={styles.threeDotsButton}
                    onClick={() => toggleDropdown(application.id)}
                    aria-label="More options"
                  >
                    <FaEllipsisH />
                  </button>
                  
                  {activeDropdown === application.id && (
                    <div className={styles.dropdownMenu}>
                      <button 
                        className={styles.dropdownItem}
                        onClick={() => {
                          handleViewDetails(application.id);
                          closeDropdown();
                        }}
                      >
                        View Details
                      </button>
                      {canCancelApplication(application.status) && (
                        <button 
                          className={styles.dropdownItem}
                          onClick={() => {
                            handleCancelApplication(application);
                            closeDropdown();
                          }}
                        >
                          Cancel Application
                        </button>
                      )}
                      {canCompleteApplication(application.status) && (
                        <button 
                          className={styles.dropdownItem}
                          onClick={() => {
                            handleCompleteApplication(application);
                            closeDropdown();
                          }}
                        >
                          Mark as Completed
                        </button>
                      )}
                      {canDeleteApplication(application.status) && (
                        <button 
                          className={`${styles.dropdownItem} ${styles.deleteItem}`}
                          onClick={() => {
                            handleDeleteApplication(application);
                            closeDropdown();
                          }}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div className={styles.applicationContent}>
                  {/* Left Content - Text Details */}
                  <div className={styles.applicationInfo}>
                    {/* Header Section with Date/Time */}
                    <div className={styles.applicationHeader}>
                      <div className={styles.dateTimeContainer}>
                        <div className={styles.dateSection}>
                          <FiCalendar className={styles.calendarIcon} />
                          <span className={styles.dateText}>
                            {formatProgramDate(application.programStartDate, application.programEndDate)}
                          </span>
                        </div>
                        {application.programStartTime && application.programEndTime && (
                          <>
                            <div className={styles.separator}></div>
                            <div className={styles.timeSection}>
                              <FaRegClock className={styles.clockIcon} />
                              <span className={styles.timeText}>
                                {application.programStartTime} - {application.programEndTime}
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Program Title */}
                    <div className={styles.applicationTitle}>
                      <h3>
                        <Link 
                          href={`/programs/${application.programSlug || application.programId}`}
                          className={styles.programTitleLink}
                        >
                          {application.programName}
                        </Link>
                      </h3>
                    </div>

                    {/* Organization Info */}
                    {application.organizationName && (
                      <div className={styles.organizationInfo}>
                        {application.organizationLogo ? (
                          <Image 
                            src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}${application.organizationLogo}`}
                            alt={`${application.organizationName} logo`}
                            width={20}
                            height={20}
                            className={styles.organizationLogo}
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.nextSibling.style.display = 'block';
                            }}
                          />
                        ) : null}
                        <div className={styles.organizationLogoFallback} style={{ display: application.organizationLogo ? 'none' : 'block' }}></div>
                        <Link 
                          href={`/programs/org/${application.organizationAcronym || application.organizationId}`}
                          className={styles.organizationLink}
                        >
                          <span className={styles.organizationName}>{application.organizationName}</span>
                          {application.organizationAcronym && (
                            <span className={styles.organizationAcronym}>({application.organizationAcronym})</span>
                          )}
                        </Link>
                      </div>
                    )}
                    
                    {/* Date Applied */}
                    <div className={styles.applicationDate}>
                      Date Applied: {formatDateShort(application.appliedAt)}
                    </div>

                    {/* Reason/Notes */}
                    {application.notes && (
                      <div className={styles.applicationReason}>
                        <p>{application.notes}</p>
                      </div>
                    )}

                    {application.feedback && (
                      <div className={styles.applicationReason}>
                        <p>{application.feedback}</p>
                      </div>
                    )}

                    {/* Status Badge - Bottom Right */}
                    <div className={styles.statusContainer}>
                      <span className={`${styles.statusBadge} ${styles[`status${application.status.charAt(0).toUpperCase() + application.status.slice(1).toLowerCase()}`]}`}>
                        {getStatusText(application.status)}
                      </span>
                    </div>
                  </div>

                  {/* Right Content - Program Image */}
                  <div className={styles.programImageThumbnail}>
                    {application.programImage ? (
                      <Image 
                        src={getProgramImageUrl(application.programImage)} 
                        alt={application.programName}
                        width={240}
                        height={200}
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
      <ConfirmationModal
        isOpen={cancelModalOpen}
        onClose={handleCloseCancelModal}
        onConfirm={handleConfirmCancel}
        actionType="cancel"
        itemName={applicationToCancel?.programName}
        isLoading={isCancelling}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={deleteModalOpen}
        onClose={handleCloseDeleteModal}
        onConfirm={handleConfirmDelete}
        actionType="delete"
        itemName={applicationToDelete?.programName}
        isLoading={isDeleting}
        message={
          applicationToDelete?.status?.toLowerCase() === 'approved' 
            ? "Are you sure you want to cancel your approved application? This will change the status to 'Cancelled' and the admin will be notified."
            : applicationToDelete?.status?.toLowerCase() === 'completed'
            ? "Completed applications cannot be deleted as they are kept for historical records."
            : "Are you sure you want to permanently delete your application? This will remove all application data and cannot be undone."
        }
      />

      {/* Complete Confirmation Modal */}
      <ConfirmationModal
        isOpen={completeModalOpen}
        onClose={handleCloseCompleteModal}
        onConfirm={handleConfirmComplete}
        actionType="complete"
        itemName={applicationToComplete?.programName}
        isLoading={isCompleting}
      />
    </div>
  );
}