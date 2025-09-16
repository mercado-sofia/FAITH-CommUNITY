'use client';

import { useEffect, useState } from 'react';
import { FiX, FiAlertTriangle } from 'react-icons/fi';
import { FaSpinner } from 'react-icons/fa';
import styles from './styles/BulkActionConfirmationModal.module.css';

export default function BulkActionConfirmationModal({
  isOpen,
  actionType, // 'approve', 'reject', 'delete'
  selectedCount,
  selectedItem, // For individual actions
  onConfirm,
  onCancel,
  isProcessing = false
}) {
  const [rejectComment, setRejectComment] = useState('');

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [isOpen]);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setRejectComment('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const getActionConfig = () => {
    const isMultiple = selectedCount > 1;
    const isIndividual = selectedItem && selectedCount === 1;
    const itemText = isMultiple ? 'Items' : 'Item';
    const actionText = isMultiple ? 'All' : '';
    const itemName = isIndividual ? (selectedItem.org || 'this submission') : '';
    
    switch (actionType) {
      case 'approve':
        return {
          title: `Approve ${actionText} Selected ${itemText}`,
          message: isIndividual 
            ? `Are you sure you want to approve ${itemName}'s submission?`
            : `Are you sure you want to approve ${selectedCount} selected submission${selectedCount !== 1 ? 's' : ''}?`,
          details: isIndividual 
            ? 'This will approve the submission and it will be processed immediately.'
            : 'This will approve all selected submissions and they will be processed immediately.',
          buttonText: isMultiple ? 'Approve All' : 'Approve',
          buttonClass: styles.approveBtn
        };
      case 'reject':
        return {
          title: `Reject ${actionText} Selected ${itemText}`,
          message: isIndividual 
            ? `Are you sure you want to reject ${itemName}'s submission?`
            : `Are you sure you want to reject ${selectedCount} selected submission${selectedCount !== 1 ? 's' : ''}?`,
          details: isIndividual 
            ? 'This will reject the submission and it will be returned to the organization.'
            : 'This will reject all selected submissions and they will be returned to the organization.',
          buttonText: isMultiple ? 'Reject All' : 'Reject',
          buttonClass: styles.rejectBtn,
          showComment: true
        };
      case 'delete':
        return {
          title: `Delete ${actionText} Selected ${itemText}`,
          message: isIndividual 
            ? `Are you sure you want to permanently delete ${itemName}'s submission?`
            : `Are you sure you want to permanently delete ${selectedCount} selected submission${selectedCount !== 1 ? 's' : ''}?`,
          details: isIndividual 
            ? 'This action cannot be undone. The submission will be permanently removed from the system.'
            : 'This action cannot be undone. All selected submissions will be permanently removed from the system.',
          buttonText: isMultiple ? 'Delete All' : 'Delete',
          buttonClass: styles.deleteBtn,
          isDestructive: true
        };
      default:
        return null;
    }
  };

  const config = getActionConfig();
  if (!config) return null;

  const handleConfirm = () => {
    if (actionType === 'reject' && !rejectComment.trim()) {
      alert('Please provide a reason for rejection.');
      return;
    }
    onConfirm(actionType === 'reject' ? rejectComment : undefined);
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2 className={styles.title}>{config.title}</h2>
          <button 
            className={styles.closeBtn}
            onClick={onCancel}
            disabled={isProcessing}
          >
            <FiX />
          </button>
        </div>

        <div className={styles.content}>
          <div className={styles.warningSection}>
            <div className={styles.warningIcon}>
              <FiAlertTriangle />
            </div>
            <div className={styles.warningText}>
              <p className={styles.message}>{config.message}</p>
              <p className={styles.details}>{config.details}</p>
            </div>
          </div>

          {config.showComment && (
            <div className={styles.commentSection}>
              <label htmlFor="rejectComment" className={styles.commentLabel}>
                Reason for rejection (required):
              </label>
              <textarea
                id="rejectComment"
                value={rejectComment}
                onChange={(e) => setRejectComment(e.target.value)}
                placeholder="Please provide a reason for rejecting these approvals..."
                className={styles.commentInput}
                rows={3}
                disabled={isProcessing}
              />
            </div>
          )}

          {config.isDestructive && (
            <div className={styles.destructiveWarning}>
              <strong>⚠️ This is a destructive action that cannot be undone!</strong>
            </div>
          )}
        </div>

        <div className={styles.actions}>
          <button
            onClick={onCancel}
            className={styles.cancelBtn}
            disabled={isProcessing}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className={`${styles.confirmBtn} ${config.buttonClass}`}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <>
                <FaSpinner className={styles.spinner} />
                Processing...
              </>
            ) : (
              config.buttonText
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
