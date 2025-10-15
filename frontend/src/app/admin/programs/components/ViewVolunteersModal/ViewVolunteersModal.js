'use client';

import React, { useState } from 'react';
import { FaTimes, FaUser, FaEnvelope, FaPhone, FaMapMarkerAlt, FaBriefcase, FaIdCard, FaCalendar, FaCheck, FaTimes as FaX, FaClock, FaBan } from 'react-icons/fa';
import { useGetVolunteersByProgramQuery, useUpdateVolunteerStatusMutation } from '@/rtk/admin/volunteersApi';
import { SuccessModal } from '@/components';
import styles from './ViewVolunteersModal.module.css';

const ViewVolunteersModal = ({ program, isOpen, onClose }) => {
  const [successModal, setSuccessModal] = useState({ isVisible: false, message: '', type: 'success' });
  const [updatingStatus, setUpdatingStatus] = useState(null);

  // Fetch volunteers for this program
  const { 
    data: volunteersData, 
    isLoading, 
    error, 
    refetch 
  } = useGetVolunteersByProgramQuery(program?.id, {
    skip: !isOpen || !program?.id
  });

  // Debug logging
  React.useEffect(() => {
    if (isOpen && program?.id) {
      console.log('ViewVolunteersModal: Fetching volunteers for program:', program.id);
      console.log('ViewVolunteersModal: Program data:', program);
    }
  }, [isOpen, program?.id]);

  React.useEffect(() => {
    if (error) {
      console.error('ViewVolunteersModal: Error fetching volunteers:', error);
    }
  }, [error]);

  const [updateVolunteerStatus] = useUpdateVolunteerStatusMutation();

  const handleStatusUpdate = async (volunteerId, newStatus) => {
    setUpdatingStatus(volunteerId);
    try {
      await updateVolunteerStatus({ id: volunteerId, status: newStatus }).unwrap();
      setSuccessModal({
        isVisible: true,
        message: `Volunteer status updated to ${newStatus}`,
        type: 'success'
      });
      refetch();
    } catch (error) {
      setSuccessModal({
        isVisible: true,
        message: 'Failed to update volunteer status',
        type: 'error'
      });
    } finally {
      setUpdatingStatus(null);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Approved':
        return <FaCheck className={styles.statusIconApproved} />;
      case 'Declined':
        return <FaX className={styles.statusIconDeclined} />;
      case 'Pending':
        return <FaClock className={styles.statusIconPending} />;
      case 'Cancelled':
        return <FaBan className={styles.statusIconCancelled} />;
      case 'Completed':
        return <FaCheck className={styles.statusIconCompleted} />;
      default:
        return <FaClock className={styles.statusIconPending} />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Approved':
        return styles.statusApproved;
      case 'Declined':
        return styles.statusDeclined;
      case 'Pending':
        return styles.statusPending;
      case 'Cancelled':
        return styles.statusCancelled;
      case 'Completed':
        return styles.statusCompleted;
      default:
        return styles.statusPending;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (!isOpen || !program) return null;

  return (
    <>
      <div className={styles.modalOverlay} onClick={onClose}>
        <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
          {/* Modal Header */}
          <div className={styles.modalHeader}>
            <div className={styles.headerContent}>
              <h2 className={styles.modalTitle}>
                <FaUser className={styles.titleIcon} />
                Volunteers for "{program.title}"
              </h2>
              <p className={styles.programInfo}>
                {volunteersData?.program?.organization_name} • {volunteersData?.count || 0} volunteer{volunteersData?.count !== 1 ? 's' : ''}
              </p>
            </div>
            <button className={styles.closeButton} onClick={onClose}>
              <FaTimes />
            </button>
          </div>

          {/* Modal Body */}
          <div className={styles.modalBody}>
            {isLoading ? (
              <div className={styles.loadingState}>
                <div className={styles.spinner}></div>
                <p>Loading volunteers...</p>
              </div>
            ) : error ? (
              <div className={styles.errorState}>
                <p>Failed to load volunteers. Please try again.</p>
                <button className={styles.retryButton} onClick={refetch}>
                  Retry
                </button>
              </div>
            ) : !volunteersData?.volunteers || volunteersData.volunteers.length === 0 ? (
              <div className={styles.emptyState}>
                <FaUser className={styles.emptyIcon} />
                <h3>No Volunteers Yet</h3>
                <p>No volunteers have applied for this program yet.</p>
              </div>
            ) : (
              <div className={styles.volunteersList}>
                {volunteersData.volunteers.map((volunteer) => (
                  <div key={volunteer.id} className={styles.volunteerCard}>
                    <div className={styles.volunteerHeader}>
                      <div className={styles.volunteerInfo}>
                        <h4 className={styles.volunteerName}>
                          {volunteer.name || `${volunteer.first_name || ''} ${volunteer.last_name || ''}`.trim() || 'Unknown'}
                        </h4>
                        <div className={styles.volunteerMeta}>
                          <span className={styles.volunteerAge}>
                            {volunteer.age ? `${volunteer.age} years old` : 'Age not specified'}
                          </span>
                          {volunteer.gender && (
                            <span className={styles.volunteerGender}>
                              • {volunteer.gender}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className={styles.statusSection}>
                        <div className={`${styles.statusBadge} ${getStatusColor(volunteer.status)}`}>
                          {getStatusIcon(volunteer.status)}
                          {volunteer.status}
                        </div>
                      </div>
                    </div>

                    <div className={styles.volunteerDetails}>
                      <div className={styles.contactInfo}>
                        {volunteer.email && (
                          <div className={styles.contactItem}>
                            <FaEnvelope className={styles.contactIcon} />
                            <span>{volunteer.email}</span>
                          </div>
                        )}
                        {volunteer.contact && (
                          <div className={styles.contactItem}>
                            <FaPhone className={styles.contactIcon} />
                            <span>{volunteer.contact}</span>
                          </div>
                        )}
                        {volunteer.address && (
                          <div className={styles.contactItem}>
                            <FaMapMarkerAlt className={styles.contactIcon} />
                            <span>{volunteer.address}</span>
                          </div>
                        )}
                        {volunteer.occupation && (
                          <div className={styles.contactItem}>
                            <FaBriefcase className={styles.contactIcon} />
                            <span>{volunteer.occupation}</span>
                          </div>
                        )}
                        {volunteer.citizenship && (
                          <div className={styles.contactItem}>
                            <FaIdCard className={styles.contactIcon} />
                            <span>{volunteer.citizenship}</span>
                          </div>
                        )}
                      </div>

                      {volunteer.reason && (
                        <div className={styles.reasonSection}>
                          <h5>Application Reason:</h5>
                          <p className={styles.reasonText}>{volunteer.reason}</p>
                        </div>
                      )}

                      <div className={styles.applicationInfo}>
                        <div className={styles.dateInfo}>
                          <FaCalendar className={styles.dateIcon} />
                          <span>Applied: {formatDate(volunteer.date)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Status Update Actions */}
                    {volunteer.status === 'Pending' && (
                      <div className={styles.actionButtons}>
                        <button
                          className={styles.approveButton}
                          onClick={() => handleStatusUpdate(volunteer.id, 'Approved')}
                          disabled={updatingStatus === volunteer.id}
                        >
                          {updatingStatus === volunteer.id ? 'Updating...' : 'Approve'}
                        </button>
                        <button
                          className={styles.declineButton}
                          onClick={() => handleStatusUpdate(volunteer.id, 'Declined')}
                          disabled={updatingStatus === volunteer.id}
                        >
                          {updatingStatus === volunteer.id ? 'Updating...' : 'Decline'}
                        </button>
                      </div>
                    )}

                    {volunteer.status === 'Approved' && (
                      <div className={styles.actionButtons}>
                        <button
                          className={styles.completeButton}
                          onClick={() => handleStatusUpdate(volunteer.id, 'Completed')}
                          disabled={updatingStatus === volunteer.id}
                        >
                          {updatingStatus === volunteer.id ? 'Updating...' : 'Mark Complete'}
                        </button>
                        <button
                          className={styles.cancelButton}
                          onClick={() => handleStatusUpdate(volunteer.id, 'Cancelled')}
                          disabled={updatingStatus === volunteer.id}
                        >
                          {updatingStatus === volunteer.id ? 'Updating...' : 'Cancel'}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className={styles.modalFooter}>
            <button className={styles.closeModalButton} onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Success Modal */}
      <SuccessModal
        message={successModal.message}
        isVisible={successModal.isVisible}
        onClose={() => setSuccessModal({ isVisible: false, message: '', type: 'success' })}
        type={successModal.type}
        autoHideDuration={3000}
      />
    </>
  );
};

export default ViewVolunteersModal;
