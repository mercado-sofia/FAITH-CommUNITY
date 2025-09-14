'use client';

import { useState } from 'react';
import { FiTrash2, FiMail, FiClock, FiCheckCircle, FiXCircle, FiEye } from 'react-icons/fi';
import { IoCloseOutline } from "react-icons/io5";
import DeleteConfirmationModal from '../../components/DeleteConfirmationModal';
import AdminDetailsModal from './AdminDetailsModal';
import styles from './styles/InvitationsTable.module.css';

export default function InvitationsTable({ 
  invitations, 
  onCancel,
  onBulkCancel,
  selectedItems,
  onSelectAll,
  onSelectItem,
  isCancelling
}) {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedItemForDelete, setSelectedItemForDelete] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedItemForDetails, setSelectedItemForDetails] = useState(null);

  const handleCancelClick = (invitation) => {
    setSelectedItemForDelete(invitation);
    setShowDeleteModal(true);
  };

  const handleCancelConfirm = () => {
    if (selectedItemForDelete) {
      onCancel(selectedItemForDelete.id);
      setShowDeleteModal(false);
      setSelectedItemForDelete(null);
    }
  };

  const handleCancelCancel = () => {
    setShowDeleteModal(false);
    setSelectedItemForDelete(null);
  };

  const handleViewClick = (invitation) => {
    setSelectedItemForDetails(invitation);
    setShowDetailsModal(true);
  };


  const handleDeleteClick = (invitation) => {
    setSelectedItemForDelete(invitation);
    setShowDeleteModal(true);
  };

  const handleDetailsClose = () => {
    setShowDetailsModal(false);
    setSelectedItemForDetails(null);
  };

  const handleDetailsDelete = (adminId) => {
    onCancel(adminId);
  };

  const handleBulkCancel = () => {
    const selectedInvitationIds = Array.from(selectedItems);
    if (selectedInvitationIds.length === 0) return;
    if (onBulkCancel) {
      onBulkCancel(selectedInvitationIds);
    }
  };

  const cancelSelection = () => {
    if (onSelectAll) {
      onSelectAll({ target: { checked: false } });
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const datePart = date.toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric'
    });
    const timePart = date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
    return { datePart, timePart };
  };

  const getStatusIcon = (status) => {
    switch (status) {
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

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return styles.pending;
      case 'accepted':
        return styles.accepted;
      case 'expired':
        return styles.expired;
      default:
        return styles.pending;
    }
  };

  const isAllSelected = invitations.length > 0 && selectedItems.size === invitations.length;

  return (
    <>
      {/* Bulk Actions Bar */}
      {selectedItems.size > 0 && (
        <div className={styles.bulkActionsBar}>
          <div className={styles.bulkActionsLeft}>
            <span className={styles.selectedCount}>
              {selectedItems.size} Invitation{selectedItems.size !== 1 ? 's' : ''} selected
            </span>
          </div>
          <div className={styles.bulkActionsRight}>
            <button 
              className={`${styles.bulkButton} ${styles.cancelButton}`}
              onClick={handleBulkCancel}
              title="Cancel selected invitations"
            >
              <FiXCircle size={16} />
              Cancel Selected
            </button>
            <button 
              className={styles.cancelSelectionButton}
              onClick={cancelSelection}
              title="Cancel selection"
            >
              <IoCloseOutline />
            </button>
          </div>
        </div>
      )}

      <div className={styles.tableContainer}>
        <table className={styles.invitationsTable}>
          <thead>
            <tr>
              <th className={styles.checkboxColumn}>
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={onSelectAll}
                  className={styles.checkbox}
                />
              </th>
              <th className={styles.emailColumn}>Email</th>
              <th className={styles.sentColumn}>Sent</th>
              <th className={styles.expiresColumn}>Expires</th>
              <th className={styles.statusColumn}>Status</th>
              <th className={styles.actionsColumn}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {invitations.length === 0 ? (
              <tr>
                <td colSpan="6" className={styles.emptyState}>
                  <div className={styles.emptyContent}>
                    <p>No invitations have been sent yet.</p>
                  </div>
                </td>
              </tr>
            ) : (
              invitations.map((invitation) => (
                <tr key={invitation.id} className={styles.tableRow}>
                  <td className={styles.checkboxColumn}>
                    <input
                      type="checkbox"
                      checked={selectedItems.has(invitation.id)}
                      onChange={() => onSelectItem(invitation.id)}
                      className={styles.checkbox}
                    />
                  </td>
                  <td className={styles.emailColumn}>
                    <div className={styles.emailText}>
                      {invitation.email}
                    </div>
                  </td>
                  <td className={styles.sentColumn}>
                    <div className={styles.dateText}>
                      <span>{formatDate(invitation.created_at).datePart}</span>
                      <span>{formatDate(invitation.created_at).timePart}</span>
                    </div>
                  </td>
                  <td className={styles.expiresColumn}>
                    <div className={styles.dateText}>
                      <span>{formatDate(invitation.expires_at).datePart}</span>
                      <span>{formatDate(invitation.expires_at).timePart}</span>
                    </div>
                  </td>
                  <td className={styles.statusColumn}>
                    <div className={`${styles.statusBadge} ${getStatusColor(invitation.status)}`}>
                      {getStatusIcon(invitation.status)}
                      <span>{invitation.status.charAt(0).toUpperCase() + invitation.status.slice(1)}</span>
                    </div>
                  </td>
                  <td className={styles.actionsColumn}>
                    <div className={styles.actionButtons}>
                      <button
                        onClick={() => handleViewClick(invitation)}
                        className={`${styles.actionButton} ${styles.viewButton}`}
                        title="View details"
                      >
                        <FiEye size={16} />
                      </button>
                      
                      {invitation.status === 'pending' && (
                        <button
                          onClick={() => handleDeleteClick(invitation)}
                          className={`${styles.actionButton} ${styles.deleteButton}`}
                          disabled={isCancelling}
                          title="Cancel invitation"
                        >
                          <FiTrash2 size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Cancel Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        itemName={selectedItemForDelete?.email}
        itemType="invitation"
        onConfirm={handleCancelConfirm}
        onCancel={handleCancelCancel}
        isDeleting={isCancelling}
      />

      {/* Admin Details Modal */}
      <AdminDetailsModal
        isOpen={showDetailsModal}
        onClose={handleDetailsClose}
        adminData={selectedItemForDetails}
        onDelete={handleDetailsDelete}
        isDeleting={isCancelling}
      />
    </>
  );
}
