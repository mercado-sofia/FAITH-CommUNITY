'use client';

import { useState, useRef, useEffect } from 'react';
import { FiTrash2, FiMoreHorizontal, FiUserX, FiX, FiUserCheck, FiXCircle } from 'react-icons/fi';
import { TbListDetails } from 'react-icons/tb';
import { IoCloseOutline } from "react-icons/io5";
import { formatDateTime } from '../../../../utils/dateUtils';
import ConfirmationModal from '../../components/ConfirmationModal';
import AdminDetailsModal from './AdminDetailsModal';
import styles from './styles/InvitationsTable.module.css';

export default function InvitationsTable({ 
  invitations, 
  onCancel,
  onDeactivate,
  onDelete,
  onBulkCancel,
  onBulkDelete,
  selectedItems,
  onSelectAll,
  onSelectItem,
  isCancelling,
  isDeleting,
  isDeactivating
}) {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedItemForDelete, setSelectedItemForDelete] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedItemForDetails, setSelectedItemForDetails] = useState(null);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const dropdownRefs = useRef({});

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
  const allSelectedAccepted = selectedInvitations.length > 0 && selectedInvitations.every(inv => inv.status === 'accepted');
  const hasPendingSelected = selectedInvitations.some(inv => inv.status === 'pending');
  const hasActiveSelected = selectedInvitations.some(inv => inv.status === 'accepted' && inv.admin_is_active !== false && inv.admin_is_active !== 0);
  const hasInactiveSelected = selectedInvitations.some(inv => inv.status === 'accepted' && (inv.admin_is_active === false || inv.admin_is_active === 0));
  
  // Count pending invitations for cancel action
  const pendingInvitationsCount = selectedInvitations.filter(inv => inv.status === 'pending').length;

  const cancelSelection = () => {
    if (onSelectAll) {
      onSelectAll({ target: { checked: false } });
    }
  };

  // Custom function to preserve exact date/time split format for UI
  const formatDate = (dateString) => {
    if (!dateString) return { datePart: 'N/A', timePart: 'N/A' };
    try {
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
    } catch (error) {
      return { datePart: 'Invalid', timePart: 'Invalid' };
    }
  };


  const getStatusColor = (invitation) => {
    // Debug: Log the invitation data to see what we're working with
    console.log('Invitation data:', {
      id: invitation.id,
      email: invitation.email,
      status: invitation.status,
      admin_is_active: invitation.admin_is_active,
      admin_is_active_type: typeof invitation.admin_is_active
    });
    
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
              Delete Selected
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
                    <div className={`${styles.statusBadge} ${getStatusColor(invitation)}`}>
                      <span>{getStatusText(invitation)}</span>
                    </div>
                  </td>
                  <td className={styles.actionsColumn}>
                    <div className={styles.actionButtons}>
                      <div className={styles.dropdownContainer} ref={el => dropdownRefs.current[invitation.id] = el}>
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
              ))
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
