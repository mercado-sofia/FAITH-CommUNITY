import { useState } from 'react';
import { FiX, FiTrash2 } from 'react-icons/fi';
import { ConfirmationModal } from '@/components';
import CancelConfirmationModal from '../modals/CancelConfirmationModal';
import styles from './BulkActionsBar.module.css';

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

      {/* Cancel Confirmation Modal */}
      <CancelConfirmationModal
        isOpen={showCancelConfirm}
        itemName={`${pendingCount} submission${pendingCount !== 1 ? 's' : ''}`}
        itemType="submission"
        onConfirm={handleBulkCancel}
        onCancel={() => setShowCancelConfirm(false)}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteConfirm}
        itemName={`${selectedCount} submission${selectedCount !== 1 ? 's' : ''}`}
        itemType="submission"
        onConfirm={handleBulkDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
}
