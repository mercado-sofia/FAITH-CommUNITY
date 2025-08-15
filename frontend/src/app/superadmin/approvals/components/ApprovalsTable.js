'use client';

import { useState } from 'react';
import styles from './styles/ApprovalsTable.module.css';
import ViewDetailsModal from './ViewDetailsModal';

export default function ApprovalsTable({ approvals, onApprove, onReject, onBulkApprove, onBulkReject, onBulkDelete }) {
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedItemForReject, setSelectedItemForReject] = useState(null);
  const [rejectComment, setRejectComment] = useState('');
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedItemForDetails, setSelectedItemForDetails] = useState(null);
  const [showBulkRejectModal, setShowBulkRejectModal] = useState(false);
  const [bulkRejectComment, setBulkRejectComment] = useState('');
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedItems(new Set(approvals.map(item => item.id)));
    } else {
      setSelectedItems(new Set());
    }
  };

  const handleSelectItem = (id) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedItems(newSelected);
  };

  const getSectionDisplayName = (section) => {
    switch(section) {
      case 'advocacy': return 'Advocacy';
      case 'competency': return 'Competency';
      case 'organization': return 'Organization';
      case 'org_heads': return 'Org Heads';
      case 'programs': return 'Programs';
      default: return section;
    }
  };

  const getStatusBadge = (status) => {
    const statusClass = status === 'pending' ? styles.statusPending : 
                       status === 'approved' ? styles.statusApproved : 
                       styles.statusRejected;
    
    return (
      <span className={`${styles.statusBadge} ${statusClass}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const handleRejectClick = (item) => {
    setSelectedItemForReject(item);
    setShowRejectModal(true);
  };

  const handleRejectSubmit = () => {
    if (selectedItemForReject) {
      onReject(selectedItemForReject.id, rejectComment);
      setShowRejectModal(false);
      setRejectComment('');
      setSelectedItemForReject(null);
    }
  };

  const handleRejectCancel = () => {
    setShowRejectModal(false);
    setRejectComment('');
    setSelectedItemForReject(null);
  };

  const handleViewDetails = (item) => {
    setSelectedItemForDetails(item);
    setShowDetailsModal(true);
  };

  const handleDetailsClose = () => {
    setShowDetailsModal(false);
    setSelectedItemForDetails(null);
  };

  // Bulk action handlers
  const handleBulkApprove = () => {
    if (selectedItems.size === 0) return;
    const selectedIds = Array.from(selectedItems);
    onBulkApprove(selectedIds);
    setSelectedItems(new Set());
  };

  const handleBulkRejectClick = () => {
    if (selectedItems.size === 0) return;
    setShowBulkRejectModal(true);
  };

  const handleBulkRejectSubmit = () => {
    if (selectedItems.size === 0) return;
    const selectedIds = Array.from(selectedItems);
    onBulkReject(selectedIds, bulkRejectComment);
    setSelectedItems(new Set());
    setShowBulkRejectModal(false);
    setBulkRejectComment('');
  };

  const handleBulkRejectCancel = () => {
    setShowBulkRejectModal(false);
    setBulkRejectComment('');
  };

  const handleBulkDelete = () => {
    if (selectedItems.size === 0) return;
    setShowBulkDeleteModal(true);
  };

  const handleBulkDeleteConfirm = () => {
    if (selectedItems.size === 0) return;
    const selectedIds = Array.from(selectedItems);
    onBulkDelete(selectedIds);
    setSelectedItems(new Set());
    setShowBulkDeleteModal(false);
  };

  const handleBulkDeleteCancel = () => {
    setShowBulkDeleteModal(false);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <>
      {/* Bulk Actions Bar */}
      {selectedItems.size > 0 && (
        <div className={styles.bulkActionsBar}>
          <div className={styles.bulkActionsLeft}>
            <span className={styles.selectedCount}>
              {selectedItems.size} item{selectedItems.size !== 1 ? 's' : ''} selected
            </span>
          </div>
          <div className={styles.bulkActionsRight}>
            <button 
              onClick={handleBulkApprove}
              className={`${styles.bulkActionBtn} ${styles.bulkApproveBtn}`}
            >
              Accept All
            </button>
            <button 
              onClick={handleBulkRejectClick}
              className={`${styles.bulkActionBtn} ${styles.bulkRejectBtn}`}
            >
              Reject All
            </button>
            <button 
              onClick={handleBulkDelete}
              className={`${styles.bulkActionBtn} ${styles.bulkDeleteBtn}`}
            >
              Delete All
            </button>
          </div>
        </div>
      )}
      
      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.selectColumn}>
                <input
                  type="checkbox"
                  checked={selectedItems.size === approvals.length && approvals.length > 0}
                  onChange={handleSelectAll}
                  className={styles.checkbox}
                />
              </th>
              <th className={styles.organizationColumn}>Organization</th>
              <th className={styles.sectionColumn}>Section</th>
              <th className={styles.dateColumn}>Date</th>
              <th className={styles.statusColumn}>Status</th>
              <th className={styles.viewDetailsColumn}></th>
              <th className={styles.actionsColumn}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {approvals.map((item) => (
              <tr key={item.id} className={styles.tableRow}>
                <td className={styles.selectCell}>
                  <input
                    type="checkbox"
                    checked={selectedItems.has(item.id)}
                    onChange={() => handleSelectItem(item.id)}
                    className={styles.checkbox}
                  />
                </td>
                <td className={styles.organizationCell}>
                  <span className={styles.orgAcronym}>
                    {item.org || `ORG${item.organization_id}`}
                  </span>
                </td>
                <td className={styles.sectionCell}>
                  {getSectionDisplayName(item.section)}
                </td>
                <td className={styles.dateCell}>
                  {formatDate(item.submitted_at)}
                </td>
                <td className={styles.statusCell}>
                  {getStatusBadge(item.status || 'pending')}
                </td>
                <td className={styles.viewDetailsCell}>
                  <button 
                    className={styles.viewDetailsBtn}
                    onClick={() => handleViewDetails(item)}
                  >
                    View Details
                  </button>
                </td>
                <td className={styles.actionsCell}>
                  <div className={styles.actionButtons}>
                    <button
                      onClick={() => onApprove(item.id)}
                      className={`${styles.actionBtn} ${styles.acceptBtn}`}
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => handleRejectClick(item)}
                      className={`${styles.actionBtn} ${styles.rejectBtn}`}
                    >
                      Reject
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Reject Submission</h3>
              <button 
                onClick={handleRejectCancel}
                className={styles.modalCloseBtn}
              >
                ×
              </button>
            </div>
            <div className={styles.modalBody}>
              <p className={styles.modalDescription}>
                Are you sure you want to reject this submission? You can optionally provide a reason below.
              </p>
              <textarea
                value={rejectComment}
                onChange={(e) => setRejectComment(e.target.value)}
                placeholder="Enter rejection reason (optional)..."
                className={styles.rejectTextarea}
                rows={4}
              />
            </div>
            <div className={styles.modalFooter}>
              <button 
                onClick={handleRejectCancel}
                className={styles.modalCancelBtn}
              >
                Cancel
              </button>
              <button 
                onClick={handleRejectSubmit}
                className={styles.modalRejectBtn}
              >
                Reject Submission
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Reject Modal */}
      {showBulkRejectModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Reject Selected Submissions</h3>
              <button 
                onClick={handleBulkRejectCancel}
                className={styles.modalCloseBtn}
              >
                ×
              </button>
            </div>
            <div className={styles.modalBody}>
              <p className={styles.modalDescription}>
                Are you sure you want to reject {selectedItems.size} submission{selectedItems.size !== 1 ? 's' : ''}? You can optionally provide a reason below.
              </p>
              <textarea
                value={bulkRejectComment}
                onChange={(e) => setBulkRejectComment(e.target.value)}
                placeholder="Enter rejection reason (optional)..."
                className={styles.rejectTextarea}
                rows={4}
              />
            </div>
            <div className={styles.modalFooter}>
              <button 
                onClick={handleBulkRejectCancel}
                className={styles.modalCancelBtn}
              >
                Cancel
              </button>
              <button 
                onClick={handleBulkRejectSubmit}
                className={styles.modalRejectBtn}
              >
                Reject All Submissions
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation Modal */}
      {showBulkDeleteModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Delete Selected Submissions</h3>
              <button 
                onClick={handleBulkDeleteCancel}
                className={styles.modalCloseBtn}
              >
                ×
              </button>
            </div>
            <div className={styles.modalBody}>
              <p className={styles.modalDescription}>
                Are you sure you want to delete {selectedItems.size} submission{selectedItems.size !== 1 ? 's' : ''}? This action cannot be undone.
              </p>
            </div>
            <div className={styles.modalFooter}>
              <button 
                onClick={handleBulkDeleteCancel}
                className={styles.modalCancelBtn}
              >
                Cancel
              </button>
              <button 
                onClick={handleBulkDeleteConfirm}
                className={styles.modalDeleteBtn}
              >
                Delete All Submissions
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Details Modal */}
      <ViewDetailsModal 
        isOpen={showDetailsModal}
        onClose={handleDetailsClose}
        submissionData={selectedItemForDetails}
      />
    </>
  );
}
