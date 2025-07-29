import { useState } from 'react';
import { FiX, FiTrash2 } from 'react-icons/fi';
import styles from './styles/BulkActionsBar.module.css';

export default function BulkActionsBar({ selectedCount, selectedItems, submissions, onCancel, onDelete, onClearSelection }) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  
  // Calculate counts by status
  const selectedSubmissions = Array.from(selectedItems).map(id => 
    submissions.find(s => s.id === id)
  ).filter(Boolean);
  
  const pendingCount = selectedSubmissions.filter(s => s.status === 'pending').length;
  const approvedCount = selectedSubmissions.filter(s => s.status === 'approved').length;
  const rejectedCount = selectedSubmissions.filter(s => s.status === 'rejected').length;

  const handleBulkDelete = () => {
    setShowDeleteConfirm(false);
    onDelete();
  };

  const handleBulkCancel = () => {
    setShowCancelConfirm(false);
    onCancel();
  };

  return (
    <div className={styles.bulkActionsBar}>
      <div className={styles.selectionInfo}>
        <div className={styles.selectionDetails}>
          <span className={styles.selectedCount}>
            {selectedCount} submission{selectedCount !== 1 ? 's' : ''} selected
          </span>
          {(pendingCount > 0 || approvedCount > 0 || rejectedCount > 0) && (
            <span className={styles.statusBreakdown}>
              {pendingCount > 0 && `${pendingCount} pending`}
              {pendingCount > 0 && (approvedCount > 0 || rejectedCount > 0) && ', '}
              {approvedCount > 0 && `${approvedCount} approved`}
              {approvedCount > 0 && rejectedCount > 0 && ', '}
              {rejectedCount > 0 && `${rejectedCount} rejected`}
            </span>
          )}
        </div>
        <button 
          className={styles.clearSelection}
          onClick={onClearSelection}
          title="Clear selection"
        >
          <FiX size={16} />
        </button>
      </div>
      
      <div className={styles.actions}>
        {pendingCount > 0 && (
          <button 
            className={styles.cancelAction}
            onClick={() => setShowCancelConfirm(true)}
            title={`Cancel ${pendingCount} pending submission${pendingCount !== 1 ? 's' : ''}`}
          >
            <FiX size={16} />
            Cancel {pendingCount} Pending
          </button>
        )}
        <button 
          className={styles.deleteAction}
          onClick={() => setShowDeleteConfirm(true)}
          title="Delete selected submissions"
        >
          <FiTrash2 size={16} />
          Delete Selected
        </button>
      </div>

      {/* Cancel Confirmation */}
      {showCancelConfirm && (
        <div className={styles.confirmOverlay}>
          <div className={styles.confirmModal}>
            <h4>Cancel {selectedCount} Submission{selectedCount !== 1 ? 's' : ''}?</h4>
            <p>This will withdraw the selected submissions from superadmin review.</p>
            <div className={styles.confirmActions}>
              <button 
                className={styles.confirmCancel}
                onClick={() => setShowCancelConfirm(false)}
              >
                Keep Submissions
              </button>
              <button 
                className={styles.confirmAction}
                onClick={handleBulkCancel}
              >
                Cancel Submissions
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className={styles.confirmOverlay}>
          <div className={styles.confirmModal}>
            <h4>Delete {selectedCount} Submission{selectedCount !== 1 ? 's' : ''}?</h4>
            <p className={styles.deleteWarning}>
              <strong>Warning:</strong> This will permanently delete the selected submissions. This action cannot be undone.
            </p>
            <div className={styles.confirmActions}>
              <button 
                className={styles.confirmCancel}
                onClick={() => setShowDeleteConfirm(false)}
              >
                Cancel
              </button>
              <button 
                className={styles.confirmDelete}
                onClick={handleBulkDelete}
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
