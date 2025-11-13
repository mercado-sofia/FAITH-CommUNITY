'use client';

import { useEffect, useState } from 'react';
import { FiX, FiAlertTriangle } from 'react-icons/fi';
import styles from './styles/BulkActionConfirmationModal.module.css';

export default function BulkActionConfirmationModal({
  isOpen,
  actionType, // 'approve', 'reject', 'delete'
  selectedCount,
  actionableCount, // Number of items that can actually be processed
  hasMixedStatus, // Whether selection contains mixed statuses
  selectedItem, // For individual actions
  onConfirm,
  onCancel,
  isProcessing = false
}) {
  const [rejectComment, setRejectComment] = useState('');
  const [commentError, setCommentError] = useState('');

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
      setCommentError('');
    }
  }, [isOpen]);

  // Clear error when user starts typing
  useEffect(() => {
    if (rejectComment.trim() && commentError) {
      setCommentError('');
    }
  }, [rejectComment, commentError]);

  if (!isOpen) return null;

  const getActionConfig = () => {
    const isMultiple = selectedCount > 1;
    const isIndividual = selectedItem && selectedCount === 1;
    const itemText = isMultiple ? 'Items' : 'Item';
    const actionText = isMultiple ? 'All' : '';
    const itemName = isIndividual ? (selectedItem.org || selectedItem.organization_acronym || selectedItem.orgName || selectedItem.organization_name || 'this submission') : '';
    
    switch (actionType) {
      case 'approve':
        const approveCount = actionableCount !== undefined ? actionableCount : selectedCount;
        const hasSkipped = hasMixedStatus && actionableCount !== undefined && actionableCount < selectedCount;
        return {
          title: `Approve ${actionText} Selected ${itemText}`,
          message: isIndividual 
            ? `Are you sure you want to approve ${itemName}'s submission?`
            : `Are you sure you want to approve ${approveCount} pending submission${approveCount !== 1 ? 's' : ''}?`,
          details: isIndividual 
            ? 'This will approve the submission and it will be processed immediately.'
            : hasSkipped
              ? `This will approve ${approveCount} pending submission${approveCount !== 1 ? 's' : ''}. ${selectedCount - approveCount} already processed item${selectedCount - approveCount !== 1 ? 's' : ''} will be skipped.`
              : 'This will approve all selected pending submissions and they will be processed immediately.',
          buttonText: isMultiple ? 'Approve All' : 'Approve',
          buttonClass: styles.approveBtn
        };
      case 'reject':
        const rejectCount = actionableCount !== undefined ? actionableCount : selectedCount;
        const hasRejectSkipped = hasMixedStatus && actionableCount !== undefined && actionableCount < selectedCount;
        return {
          title: `Reject ${actionText} Selected ${itemText}`,
          message: isIndividual 
            ? `Are you sure you want to reject ${itemName}'s submission?`
            : `Are you sure you want to reject ${rejectCount} pending submission${rejectCount !== 1 ? 's' : ''}?`,
          details: isIndividual 
            ? 'This will reject the submission and it will be returned to the organization.'
            : hasRejectSkipped
              ? `This will reject ${rejectCount} pending submission${rejectCount !== 1 ? 's' : ''}. ${selectedCount - rejectCount} already processed item${selectedCount - rejectCount !== 1 ? 's' : ''} will be skipped.`
              : 'This will reject all selected pending submissions and they will be returned to the organization.',
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

  const handleConfirm = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isProcessing) {
      return; // Prevent double-clicks
    }
    
    if (actionType === 'reject' && !rejectComment.trim()) {
      setCommentError('Reason for rejection is required');
      return;
    }
    
    if (onConfirm && typeof onConfirm === 'function') {
      onConfirm(actionType === 'reject' ? rejectComment : undefined);
    }
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <div className={styles.titleContainer}>
            <div className={`${styles.warningIcon} ${styles[`warningIcon${actionType ? actionType.charAt(0).toUpperCase() + actionType.slice(1) : ''}`]}`}>
              <FiAlertTriangle />
            </div>
            <h2 className={styles.title}>{config.title}</h2>
          </div>
          <button 
            className={styles.closeBtn}
            onClick={onCancel}
            disabled={isProcessing}
          >
            <FiX />
          </button>
        </div>

        <div className={styles.content}>
          <div className={styles.warningText}>
            <p className={styles.message}>{config.message}</p>
            <p className={styles.details}>{config.details}</p>
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
                className={`${styles.commentInput} ${commentError ? styles.commentInputError : ''}`}
                rows={3}
                disabled={isProcessing}
              />
              {commentError && (
                <div className={styles.commentError}>
                  {commentError}
                </div>
              )}
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
            type="button"
            onClick={onCancel}
            className={styles.cancelBtn}
            disabled={isProcessing}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className={`${styles.confirmBtn} ${config.buttonClass}`}
            disabled={isProcessing}
          >
            {isProcessing ? (
              actionType === 'approve' ? 'Approving...' : actionType === 'reject' ? 'Rejecting...' : actionType === 'delete' ? 'Deleting...' : 'Processing...'
            ) : (
              config.buttonText
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
