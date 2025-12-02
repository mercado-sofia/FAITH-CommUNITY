'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { FiX, FiAlertTriangle } from 'react-icons/fi';
import styles from './ApprovalConfirmationModal.module.css';

const ApprovalConfirmationModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  actionType, // 'approve', 'reject', 'decline'
  itemName, // For individual actions
  selectedCount, // For bulk actions
  actionableCount, // Number of items that can actually be processed
  hasMixedStatus = false, // Whether selection contains mixed statuses
  showComment = false, // Whether to show comment field (required for reject/decline)
  isProcessing = false,
  customMessage = null
}) => {
  const [comment, setComment] = useState('');
  const [commentError, setCommentError] = useState('');

  // Prevent body scroll when modal is open and handle ESC key
  useEffect(() => {
    if (typeof document !== 'undefined' && document.body) {
      if (isOpen) {
        document.body.style.overflow = 'hidden';
        document.body.style.paddingRight = '0px';
      } else {
        document.body.style.overflow = 'unset';
        document.body.style.paddingRight = '0px';
      }

      // Cleanup on unmount
      return () => {
        document.body.style.overflow = 'unset';
        document.body.style.paddingRight = '0px';
      }
    }
  }, [isOpen]);

  // Handle ESC key to close modal
  useEffect(() => {
    if (!isOpen || isProcessing) return

    const handleEscape = (e) => {
      if (e.key === 'Escape' && onClose) {
        onClose()
      }
    }

    if (typeof document !== 'undefined') {
      document.addEventListener('keydown', handleEscape)
      return () => {
        document.removeEventListener('keydown', handleEscape)
      }
    }
  }, [isOpen, isProcessing, onClose]);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setComment('');
      setCommentError('');
    }
  }, [isOpen]);

  // Clear error when user starts typing
  useEffect(() => {
    if (comment.trim() && commentError) {
      setCommentError('');
    }
  }, [comment, commentError]);

  const handleBackdropClick = (e) => {
    // Prevent closing during loading
    if (isProcessing || !onClose) return
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const handleClose = () => {
    if (isProcessing || !onClose) return
    onClose()
  }

  const handleConfirm = () => {
    if (isProcessing || !onConfirm) return
    
    // Validate comment for reject/decline actions
    if (showComment && (actionType === 'reject' || actionType === 'decline')) {
      if (!comment.trim()) {
        setCommentError('Reason for rejection is required');
        return;
      }
    }
    
    // Pass comment to onConfirm if it's a reject/decline action
    if (showComment && (actionType === 'reject' || actionType === 'decline')) {
      onConfirm(comment.trim());
    } else {
      onConfirm();
    }
  }

  // Get action-specific content
  const getActionConfig = () => {
    const isMultiple = selectedCount > 1;
    const isIndividual = itemName && selectedCount === 1;
    
    switch (actionType) {
      case 'approve':
        const approveCount = actionableCount !== undefined ? actionableCount : selectedCount;
        const hasSkipped = hasMixedStatus && actionableCount !== undefined && actionableCount < selectedCount;
        return {
          title: isIndividual 
            ? `Approve ${itemName}'s Application`
            : `Approve ${isMultiple ? `${approveCount} Selected` : 'Selected'} ${isMultiple ? 'Items' : 'Item'}`,
          message: isIndividual 
            ? `Are you sure you want to approve ${itemName}'s ${customMessage || 'application'}?`
            : `Are you sure you want to approve ${approveCount} pending ${isMultiple ? 'items' : 'item'}?`,
          details: isIndividual 
            ? 'This will approve the application and it will be processed immediately.'
            : hasSkipped
              ? `This will approve ${approveCount} pending ${isMultiple ? 'items' : 'item'}. ${selectedCount - approveCount} already processed ${selectedCount - approveCount !== 1 ? 'items' : 'item'} will be skipped.`
              : 'This will approve all selected pending items and they will be processed immediately.',
          buttonText: isMultiple ? 'Approve All' : 'Approve',
          iconColor: 'approve'
        };
      case 'reject':
        const rejectCount = actionableCount !== undefined ? actionableCount : selectedCount;
        const hasRejectSkipped = hasMixedStatus && actionableCount !== undefined && actionableCount < selectedCount;
        return {
          title: isIndividual 
            ? `Reject ${itemName}'s Submission`
            : `Reject ${isMultiple ? `${rejectCount} Selected` : 'Selected'} ${isMultiple ? 'Items' : 'Item'}`,
          message: isIndividual 
            ? `Are you sure you want to reject ${itemName}'s ${customMessage || 'submission'}?`
            : `Are you sure you want to reject ${rejectCount} pending ${isMultiple ? 'items' : 'item'}?`,
          details: isIndividual 
            ? 'This will reject the submission and it will be returned to the organization.'
            : hasRejectSkipped
              ? `This will reject ${rejectCount} pending ${isMultiple ? 'items' : 'item'}. ${selectedCount - rejectCount} already processed ${selectedCount - rejectCount !== 1 ? 'items' : 'item'} will be skipped.`
              : 'This will reject all selected pending items and they will be returned to the organization.',
          buttonText: isMultiple ? 'Reject All' : 'Reject',
          iconColor: 'reject'
        };
      case 'decline':
        const declineCount = actionableCount !== undefined ? actionableCount : selectedCount;
        const hasDeclineSkipped = hasMixedStatus && actionableCount !== undefined && actionableCount < selectedCount;
        return {
          title: isIndividual 
            ? `Decline ${itemName}'s Application`
            : `Decline ${isMultiple ? `${declineCount} Selected` : 'Selected'} ${isMultiple ? 'Applications' : 'Application'}`,
          message: isIndividual 
            ? `Are you sure you want to decline ${itemName}'s ${customMessage || 'application'}?`
            : `Are you sure you want to decline ${declineCount} pending ${isMultiple ? 'applications' : 'application'}?`,
          details: isIndividual 
            ? 'This will decline the application and the volunteer will be notified.'
            : hasDeclineSkipped
              ? `This will decline ${declineCount} pending ${isMultiple ? 'applications' : 'application'}. ${selectedCount - declineCount} already processed ${selectedCount - declineCount !== 1 ? 'applications' : 'application'} will be skipped.`
              : 'This will decline all selected pending applications and volunteers will be notified.',
          buttonText: isMultiple ? 'Decline All' : 'Decline',
          iconColor: 'decline'
        };
      default:
        return null;
    }
  };

  const config = getActionConfig();
  if (!config) return null;

  const loadingText = actionType === 'approve' ? 'Approving...' : actionType === 'reject' ? 'Rejecting...' : actionType === 'decline' ? 'Declining...' : 'Processing...';

  const modalContent = (
    <div className={styles.modalOverlay} onClick={handleBackdropClick}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <div className={styles.titleContainer}>
            <div className={`${styles.warningIcon} ${styles[`warningIcon${config.iconColor.charAt(0).toUpperCase() + config.iconColor.slice(1)}`]}`}>
              <FiAlertTriangle />
            </div>
            <h2 className={styles.modalTitle}>{config.title}</h2>
          </div>
          <button 
            className={styles.closeButton}
            onClick={handleClose}
            disabled={isProcessing}
          >
            <FiX />
          </button>
        </div>
        
        <div className={styles.modalBody}>
          <p className={styles.confirmationText}>
            {config.message}
          </p>
          
          <p className={`${styles.infoText} ${styles[`infoText${config.iconColor.charAt(0).toUpperCase() + config.iconColor.slice(1)}`]}`}>
            {config.details}
          </p>

          {showComment && (actionType === 'reject' || actionType === 'decline') && (
            <div className={styles.commentSection}>
              <label htmlFor="rejectionComment" className={styles.commentLabel}>
                Reason for {actionType === 'reject' ? 'rejection' : 'decline'} (required):
              </label>
              <textarea
                id="rejectionComment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={`Please provide a reason for ${actionType === 'reject' ? 'rejecting' : 'declining'} ${selectedCount > 1 ? 'these items' : 'this item'}...`}
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
        </div>
        
        <div className={styles.modalFooter}>
          <button 
            className={styles.cancelButton}
            onClick={handleClose}
            disabled={isProcessing}
          >
            Cancel
          </button>
          <button 
            className={`${styles.confirmButton} ${styles[`confirmButton${config.iconColor.charAt(0).toUpperCase() + config.iconColor.slice(1)}`]}`}
            onClick={handleConfirm}
            disabled={isProcessing}
          >
            {isProcessing ? loadingText : config.buttonText}
          </button>
        </div>
      </div>
    </div>
  )

  // Use portal to render modal outside of the card's DOM hierarchy
  // Ensure document.body exists before creating portal (SSR safety)
  if (!isOpen) return null;
  
  if (typeof document !== 'undefined' && document.body) {
    return createPortal(modalContent, document.body);
  }
  
  // Fallback for SSR or if document.body doesn't exist
  return null;
}

export default ApprovalConfirmationModal

