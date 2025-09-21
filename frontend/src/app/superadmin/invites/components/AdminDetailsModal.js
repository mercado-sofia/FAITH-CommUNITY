'use client';

import { useState } from 'react';
import { FiX, FiMail, FiHome, FiUser, FiCalendar, FiCheckCircle, FiClock, FiXCircle, FiUserX } from 'react-icons/fi';
import { formatDateTime } from '../../../../utils/dateUtils';
import styles from './styles/AdminDetailsModal.module.css';

const AdminDetailsModal = ({ 
  isOpen, 
  onClose, 
  adminData,
  onDelete,
  isDeleting
}) => {
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  if (!isOpen || !adminData) return null;

  // Using centralized date utility - format remains exactly the same
  const formatDate = (dateString) => {
    return formatDateTime(dateString);
  };

  const getStatusIcon = (adminData) => {
    // If invitation is accepted but admin is inactive, show inactive icon
    if (adminData.status === 'accepted' && (adminData.admin_is_active === false || adminData.admin_is_active === 0)) {
      return <FiUserX className={styles.statusIcon} />;
    }
    
    switch (adminData.status) {
      case 'pending':
        return <FiClock className={styles.statusIcon} />;
      case 'accepted':
        return <FiCheckCircle className={styles.statusIcon} />;
      case 'expired':
        return <FiXCircle className={styles.statusIcon} />;
      default:
        return <FiClock className={styles.statusIcon} />;
    }
  };

  const getStatusColor = (adminData) => {
    // If invitation is accepted but admin is inactive, show as inactive
    if (adminData.status === 'accepted' && (adminData.admin_is_active === false || adminData.admin_is_active === 0)) {
      return styles.inactive;
    }
    
    switch (adminData.status) {
      case 'pending':
        return styles.pending;
      case 'accepted':
        return styles.active;
      case 'expired':
        return styles.expired;
      default:
        return styles.pending;
    }
  };

  const getStatusText = (adminData) => {
    // If invitation is accepted but admin is inactive, show as inactive
    if (adminData.status === 'accepted' && (adminData.admin_is_active === false || adminData.admin_is_active === 0)) {
      return 'Inactive';
    }
    
    switch (adminData.status) {
      case 'pending':
        return 'Pending';
      case 'accepted':
        return 'Active';
      case 'expired':
        return 'Expired';
      default:
        return 'Pending';
    }
  };

  const handleDeleteClick = () => {
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = () => {
    if (onDelete) {
      onDelete(adminData.id);
    }
    setShowDeleteModal(false);
    onClose();
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
  };


  return (
    <>
      <div className={styles.modalOverlay}>
        <div className={styles.modalContent}>
          <div className={styles.modalHeader}>
            <h2>Admin Account Details</h2>
            <button
              onClick={onClose}
              className={styles.closeButton}
            >
              <FiX size={20} />
            </button>
          </div>

          <div className={styles.modalBody}>
            {/* Status Badge */}
            <div className={styles.statusSection}>
              <div className={`${styles.statusBadge} ${getStatusColor(adminData)}`}>
                {getStatusIcon(adminData)}
                <span>{getStatusText(adminData)}</span>
              </div>
            </div>

            {/* Two Column Layout */}
            <div className={styles.twoColumnLayout}>
              {/* Left Column - Account Information */}
              <div className={styles.leftColumn}>
                <div className={styles.infoSection}>
                  <h3 className={styles.sectionTitle}>Account Information</h3>
                  
                  <div className={styles.infoRow}>
                    <div className={styles.infoItem}>
                      <FiMail className={styles.infoIcon} />
                      <div className={styles.infoContent}>
                        <label>Email Address</label>
                        <span className={styles.infoValue}>{adminData.email}</span>
                      </div>
                    </div>
                  </div>

                  <div className={styles.infoRow}>
                    <div className={styles.infoItem}>
                      <FiHome className={styles.infoIcon} />
                      <div className={styles.infoContent}>
                        <label>Organization</label>
                        <span className={styles.infoValue}>{adminData.org || 'Not specified'}</span>
                      </div>
                    </div>
                  </div>

                  <div className={styles.infoRow}>
                    <div className={styles.infoItem}>
                      <FiHome className={styles.infoIcon} />
                      <div className={styles.infoContent}>
                        <label>Organization Name</label>
                        <span className={styles.infoValue}>{adminData.orgName || 'Not specified'}</span>
                      </div>
                    </div>
                  </div>

                  <div className={styles.infoRow}>
                    <div className={styles.infoItem}>
                      <FiUser className={styles.infoIcon} />
                      <div className={styles.infoContent}>
                        <label>Role</label>
                        <span className={styles.infoValue}>Admin</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column - Timeline Information */}
              <div className={styles.rightColumn}>
                <div className={styles.infoSection}>
                  <h3 className={styles.sectionTitle}>Timeline</h3>
                  
                  <div className={styles.infoRow}>
                    <div className={styles.infoItem}>
                      <FiCalendar className={styles.infoIcon} />
                      <div className={styles.infoContent}>
                        <label>Invitation Sent</label>
                        <span className={styles.infoValue}>{formatDate(adminData.created_at)}</span>
                      </div>
                    </div>
                  </div>

                  <div className={styles.infoRow}>
                    <div className={styles.infoItem}>
                      <FiCalendar className={styles.infoIcon} />
                      <div className={styles.infoContent}>
                        <label>Expires</label>
                        <span className={styles.infoValue}>{formatDate(adminData.expires_at)}</span>
                      </div>
                    </div>
                  </div>

                  {adminData.accepted_at && (
                    <div className={styles.infoRow}>
                      <div className={styles.infoItem}>
                        <FiCheckCircle className={styles.infoIcon} />
                        <div className={styles.infoContent}>
                          <label>Accepted</label>
                          <span className={styles.infoValue}>{formatDate(adminData.accepted_at)}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className={styles.modalFooter}>
            <div className={styles.footerActions}>
              {adminData.status === 'pending' && (
                <button
                  onClick={handleDeleteClick}
                  className={styles.deleteButton}
                  disabled={isDeleting}
                >
                  {isDeleting ? 'Deleting...' : 'Cancel Invitation'}
                </button>
              )}
              
              <button
                onClick={onClose}
                className={styles.cancelButton}
                disabled={isDeleting}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.confirmationModal}>
            <div className={styles.confirmationHeader}>
              <h3>Confirm Deletion</h3>
            </div>
            <div className={styles.confirmationBody}>
              <p>Are you sure you want to delete the invitation for <strong>{adminData.email}</strong>?</p>
              <p className={styles.warningText}>This action cannot be undone.</p>
            </div>
            <div className={styles.confirmationFooter}>
              <button
                onClick={handleDeleteCancel}
                className={styles.cancelButton}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className={styles.confirmDeleteButton}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AdminDetailsModal;
