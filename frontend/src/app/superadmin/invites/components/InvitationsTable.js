'use client';

import { useState, useEffect } from 'react';
import { FiTrash2, FiMoreHorizontal, FiUserX, FiX, FiUserCheck, FiXCircle, FiMail } from 'react-icons/fi';
import { TbListDetails } from 'react-icons/tb';
import { IoCloseOutline } from "react-icons/io5";
import { formatDateTime } from '@/utils/shared/dateUtils';
import { ConfirmationModal } from '@/components';
import AdminDetailsModal from './AdminDetailsModal';
import styles from './styles/InvitationsTable.module.css';

export default function InvitationsTable({ 
  invitations, 
  onCancel,
  onResend,
  onDeactivate,
  onDelete,
  onBulkCancel,
  onBulkDelete,
  selectedItems,
  onSelectAll,
  onSelectItem,
  isCancelling,
  isResending,
  isDeleting,
  isDeactivating,
  startIndex = 0,
  sortBy = 'newest',
  totalCount = 0
}) {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedItemForDelete, setSelectedItemForDelete] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedItemForDetails, setSelectedItemForDetails] = useState(null);
  const [activeDropdown, setActiveDropdown] = useState(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Check if the click is on a dropdown container
      if (event.target.closest(`.${styles.dropdownContainer}`)) {
        return;
      }
      
      setActiveDropdown(null);
    };

    // Use mousedown instead of click to avoid conflicts
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleDropdownToggle = (invitationId) => {
    setActiveDropdown(activeDropdown === invitationId ? null : invitationId);
  };

  const handleViewClick = (invitation) => {
    setSelectedItemForDetails(invitation);
    setShowDetailsModal(true);
    setActiveDropdown(null);
  };

  const handleDeactivateClick = (invitation) => {
    setSelectedItemForDelete({ ...invitation, action: 'deactivate' });
    setShowDeleteModal(true);
    setActiveDropdown(null);
  };

  const handleCancelClick = (invitation) => {
    setSelectedItemForDelete({ ...invitation, action: 'cancel' });
    setShowDeleteModal(true);
    setActiveDropdown(null);
  };

  const handleResendClick = (invitation) => {
    if (onResend) {
      onResend(invitation.id);
    }
    setActiveDropdown(null);
  };

  const handleDeleteClick = (invitation) => {
    setSelectedItemForDelete({ ...invitation, action: 'delete' });
    setShowDeleteModal(true);
    setActiveDropdown(null);
  };

  const handleDeactivateConfirm = () => {
    if (selectedItemForDelete) {
      onDeactivate(selectedItemForDelete.id);
      setShowDeleteModal(false);
      setSelectedItemForDelete(null);
    }
  };

  const handleCancelConfirm = () => {
    if (selectedItemForDelete) {
      onCancel(selectedItemForDelete.id);
      setShowDeleteModal(false);
      setSelectedItemForDelete(null);
    }
  };

  const handleDeleteConfirm = () => {
    if (selectedItemForDelete) {
      onDelete(selectedItemForDelete.id);
      setShowDeleteModal(false);
      setSelectedItemForDelete(null);
    }
  };

  const handleCancelCancel = () => {
    setShowDeleteModal(false);
    setSelectedItemForDelete(null);
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
    
    // Filter to only include pending invitations for cancel action
    const pendingInvitationIds = selectedInvitationIds.filter(id => {
      const invitation = invitations.find(inv => inv.id === id);
      return invitation && invitation.status === 'pending';
    });
    
    if (pendingInvitationIds.length === 0) {
      // No pending invitations selected, don't proceed
      return;
    }
    
    if (onBulkCancel) {
      onBulkCancel(pendingInvitationIds);
    }
  };

  const handleBulkDelete = () => {
    const selectedInvitationIds = Array.from(selectedItems);
    if (selectedInvitationIds.length === 0) return;
    if (onBulkDelete) {
      onBulkDelete(selectedInvitationIds);
    }
  };

  // Check if all selected items are accepted
  const selectedInvitations = invitations.filter(inv => selectedItems.has(inv.id));
  const hasPendingSelected = selectedInvitations.some(inv => inv.status === 'pending');
  
  // Count pending invitations for cancel action
  const pendingInvitationsCount = selectedInvitations.filter(inv => inv.status === 'pending').length;

  const cancelSelection = () => {
    if (onSelectAll) {
      onSelectAll({ target: { checked: false } });
    }
  };

  const getStatusColor = (invitation) => {
    // If invitation is accepted but admin is inactive, show as inactive
    // Check for both boolean false and numeric 0 (MySQL returns booleans as 0/1)
    if (invitation.status === 'accepted' && (invitation.admin_is_active === false || invitation.admin_is_active === 0)) {
      return styles.inactive;
    }
    
    switch (invitation.status) {
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

  const getStatusText = (invitation) => {
    // If invitation is accepted but admin is inactive, show as inactive
    // Check for both boolean false and numeric 0 (MySQL returns booleans as 0/1)
    if (invitation.status === 'accepted' && (invitation.admin_is_active === false || invitation.admin_is_active === 0)) {
      return 'Inactive';
    }
    
    switch (invitation.status) {
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
            {hasPendingSelected && (
              <button 
                className={`${styles.bulkButton} ${styles.cancelButton}`}
                onClick={handleBulkCancel}
                title={`Cancel ${pendingInvitationsCount} pending invitation${pendingInvitationsCount !== 1 ? 's' : ''}`}
              >
                <FiXCircle size={16} />
                Cancel Selected ({pendingInvitationsCount})
              </button>
            )}
            <button 
              className={`${styles.bulkButton} ${styles.deleteButton}`}
              onClick={handleBulkDelete}
              title="Delete selected invitations and admin accounts"
            >
              <FiTrash2 size={16} />
              Delete
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
              <th className={styles.numberColumn}>#</th>
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
                <td colSpan="7" className={styles.emptyStateCell}>
                  <div className={styles.emptyState}>
                    <h3 className={styles.emptyStateTitle}>No invitations found</h3>
                    <p className={styles.emptyStateText}>
                      No invitations found matching your current filters. New invitations will appear here when you send them.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              invitations.map((invitation, index) => {
                const rowNumber = sortBy === 'oldest' 
                  ? totalCount - (startIndex + index)
                  : startIndex + index + 1;
                return (
                <tr key={invitation.id} className={styles.tableRow}>
                  <td className={styles.numberCell}>
                    {rowNumber}
                  </td>
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
                      {formatDateTime(invitation.created_at)}
                    </div>
                  </td>
                  <td className={styles.expiresColumn}>
                    <div className={styles.dateText}>
                      {formatDateTime(invitation.expires_at)}
                    </div>
                  </td>
                  <td className={styles.statusColumn}>
                    <div className={`${styles.statusBadge} ${getStatusColor(invitation)}`}>
                      <span>{getStatusText(invitation)}</span>
                    </div>
                  </td>
                  <td className={styles.actionsColumn}>
                    <div className={styles.actionButtons}>
                      <div className={styles.dropdownContainer}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDropdownToggle(invitation.id);
                          }}
                          className={`${styles.actionButton} ${styles.moreButton}`}
                          title="More actions"
                        >
                          <FiMoreHorizontal size={16} />
                        </button>
                        
                        {activeDropdown === invitation.id && (
                          <div className={styles.dropdownMenu}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewClick(invitation);
                              }}
                              className={styles.dropdownItem}
                            >
                              <TbListDetails size={16} />
                              View Details
                            </button>
                            
                            {invitation.status === 'accepted' && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeactivateClick(invitation);
                                }}
                                className={styles.dropdownItem}
                                disabled={isDeactivating}
                              >
                                {(invitation.admin_is_active === false || invitation.admin_is_active === 0) ? (
                                  <FiUserCheck size={16} />
                                ) : (
                                  <FiUserX size={16} />
                                )}
                                {(invitation.admin_is_active === false || invitation.admin_is_active === 0) ? 'Activate Account' : 'Deactivate Account'}
                              </button>
                            )}
                            
                            {invitation.status === 'pending' && (
                              <>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleResendClick(invitation);
                                  }}
                                  className={styles.dropdownItem}
                                  disabled={isResending}
                                >
                                  <FiMail size={16} />
                                  Resend
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCancelClick(invitation);
                                  }}
                                  className={styles.dropdownItem}
                                  disabled={isCancelling}
                                >
                                  <FiX size={16} />
                                  Cancel
                                </button>
                              </>
                            )}
                            
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteClick(invitation);
                              }}
                              className={`${styles.dropdownItem} ${styles.deleteItem}`}
                              disabled={isDeleting}
                            >
                              <FiTrash2 size={16} />
                              {invitation.admin_id ? 'Delete Admin Account' : 'Delete Invitation'}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Action Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        itemName={selectedItemForDelete?.email}
        itemType={selectedItemForDelete?.admin_id ? "admin account" : "invitation"}
        actionType={
          selectedItemForDelete?.action === 'deactivate' 
            ? (selectedItemForDelete?.admin_is_active === false || selectedItemForDelete?.admin_is_active === 0) 
              ? 'activate' 
              : 'deactivate'
            : selectedItemForDelete?.action || 'delete'
        }
        onConfirm={
          selectedItemForDelete?.action === 'delete' 
            ? handleDeleteConfirm 
            : selectedItemForDelete?.action === 'deactivate'
            ? handleDeactivateConfirm
            : handleCancelConfirm
        }
        onCancel={handleCancelCancel}
        isDeleting={
          selectedItemForDelete?.action === 'delete' 
            ? isDeleting 
            : selectedItemForDelete?.action === 'deactivate'
            ? isDeactivating
            : isCancelling
        }
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
