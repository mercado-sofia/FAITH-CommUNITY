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

  // Build status breakdown text
  const statusParts = [];
  if (pendingCount > 0) statusParts.push(`${pendingCount} pending`);
  if (approvedCount > 0) statusParts.push(`${approvedCount} approved`);
  if (rejectedCount > 0) statusParts.push(`${rejectedCount} rejected`);
  
  const statusText = statusParts.join(', ');

  return (
    <div className={styles.bulkActionsBar}>
      <div className={styles.bulkActionsLeft}>
        <span className={styles.selectedCount}>
          {selectedCount} submission{selectedCount !== 1 ? 's' : ''} selected
        </span>
        {statusText && (
          <span className={styles.statusBreakdown}>
            ({statusText})
          </span>
        )}
      </div>
      
      <div className={styles.bulkActionsRight}>
        {pendingCount > 0 && (
          <button 
            className={`${styles.actionButton} ${styles.cancelAction}`}
            onClick={() => setShowCancelConfirm(true)}
            disabled={pendingCount === 0}
            title={pendingCount === 0 ? 'No pending submissions selected' : `Cancel ${pendingCount} pending submission${pendingCount !== 1 ? 's' : ''}`}
          >
            <FiX size={14} />
            <span>Cancel {pendingCount > 0 ? `(${pendingCount})` : ''}</span>
          </button>
        )}
        <button 
          className={`${styles.actionButton} ${styles.deleteAction}`}
          onClick={() => setShowDeleteConfirm(true)}
          title="Delete selected submissions"
        >
          <FiTrash2 size={14} />
        </button>
        <button 
          className={styles.cancelButton}
          onClick={onClearSelection}
          title="Clear selection"
        >
          <FiX size={20} />
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
                className={`${styles.confirmButton} ${styles.confirmCancel}`}
                onClick={() => setShowCancelConfirm(false)}
              >
                Keep Submissions
              </button>
              <button 
                className={`${styles.confirmButton} ${styles.confirmAction}`}
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
            <p>This action cannot be undone. The selected submissions will be permanently removed.</p>
            <div className={styles.confirmActions}>
              <button 
                className={`${styles.confirmButton} ${styles.confirmCancel}`}
                onClick={() => setShowDeleteConfirm(false)}
              >
                Keep Submissions
              </button>
              <button 
                className={`${styles.confirmButton} ${styles.confirmAction}`}
                onClick={handleBulkDelete}
              >
                Delete Submissions
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
