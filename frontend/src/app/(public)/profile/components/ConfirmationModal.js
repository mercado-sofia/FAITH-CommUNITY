'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { PiWarningOctagonBold } from 'react-icons/pi';
import styles from './ConfirmationModal.module.css';

export default function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmButtonText,
  cancelButtonText,
  isLoading = false,
  loadingText,
  className = "",
  actionType = "delete", // 'delete', 'cancel', or 'complete'
  itemName = null // For displaying the specific item name
}) {
  // Get configuration based on action type
  const getActionConfig = () => {
    switch (actionType) {
      case 'cancel':
        return {
          title: title || "Cancel Application",
          message: message || "Are you sure you want to cancel your application? Once cancelled, you will no longer be considered for this program and cannot reapply.",
          confirmButtonText: confirmButtonText || "Yes",
          cancelButtonText: cancelButtonText || "No",
          loadingText: loadingText || "Cancelling...",
          isCancelAction: true
        };
      case 'complete':
        return {
          title: title || "Mark as Completed",
          message: message || "Are you sure you want to mark this application as completed? This indicates you have successfully finished the volunteer program.",
          confirmButtonText: confirmButtonText || "Mark Complete",
          cancelButtonText: cancelButtonText || "Cancel",
          loadingText: loadingText || "Marking Complete...",
          isCancelAction: false,
          isCompleteAction: true
        };
      case 'delete':
      default:
        return {
          title: title || "Delete Application",
          message: message || "Are you sure you want to permanently delete your application? This will remove all application data and cannot be undone.",
          confirmButtonText: confirmButtonText || "Delete",
          cancelButtonText: cancelButtonText || "Cancel",
          loadingText: loadingText || "Deleting...",
          isCancelAction: false
        };
    }
  };

  const config = getActionConfig();

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  // Handle body class for modal open state
  useEffect(() => {
    if (isOpen && typeof document !== 'undefined') {
      document.body.classList.add('modalOpen');
      
      // Cleanup function to remove class when modal closes
      return () => {
        document.body.classList.remove('modalOpen');
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div 
      className={`${styles.modalOverlay} ${className}`}
      onClick={handleOverlayClick}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <div className={`${styles.warningIconContainer} ${
            config.isCancelAction ? styles.cancelIconContainer : 
            config.isCompleteAction ? styles.completeIconContainer : 
            styles.deleteIconContainer
          }`}>
            <PiWarningOctagonBold />
          </div>
          <h2 id="modal-title" className={styles.modalTitle}>{config.title}</h2>
        </div>
        
        <div className={styles.confirmDeleteMessage}>
          <p>{config.message}</p>
        </div>

        <div className={styles.confirmDeleteButtons}>
          <button 
            type="button" 
            className={styles.cancelBtn}
            onClick={onClose}
            disabled={isLoading}
            tabIndex="-1"
          >
            {config.cancelButtonText}
          </button>
          <button 
            type="button" 
            className={`${
              config.isCancelAction ? styles.cancelActionBtn : 
              config.isCompleteAction ? styles.completeActionBtn : 
              styles.deleteBtn
            }`}
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? config.loadingText : config.confirmButtonText}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
