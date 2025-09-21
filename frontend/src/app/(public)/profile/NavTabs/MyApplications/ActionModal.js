'use client';

import styles from './ActionModal.module.css';

export default function ActionModal({
  isOpen,
  onClose,
  onConfirm,
  modalType, // 'cancel' or 'delete'
  applicationName,
  isLoading
}) {
  if (!isOpen) return null;

  const getModalConfig = () => {
    switch (modalType) {
      case 'cancel':
        return {
          title: 'Cancel Application',
          message: `Are you sure you want to cancel your application for`,
          warningText: 'You can reapply to this program later if needed.',
          confirmButtonText: isLoading ? 'Cancelling...' : 'Cancel Application',
          cancelButtonText: 'Keep Application',
          confirmButtonClass: styles.deleteModalButton
        };
      case 'delete':
        return {
          title: 'Delete Application',
          message: `Are you sure you want to delete your application for`,
          warningText: 'This action cannot be undone.',
          confirmButtonText: isLoading ? 'Deleting...' : 'Delete',
          cancelButtonText: 'Cancel',
          confirmButtonClass: styles.deleteModalButton
        };
      default:
        return {
          title: 'Confirm Action',
          message: `Are you sure you want to perform this action for`,
          warningText: 'Please confirm your action.',
          confirmButtonText: isLoading ? 'Processing...' : 'Confirm',
          cancelButtonText: 'Cancel',
          confirmButtonClass: styles.deleteModalButton
        };
    }
  };

  const config = getModalConfig();

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h3>{config.title}</h3>
        </div>
        <div className={styles.modalBody}>
          <p>{config.message} <strong>{applicationName}</strong>?</p>
          <p className={styles.warningText}>{config.warningText}</p>
        </div>
        <div className={styles.modalActions}>
          <button 
            className={styles.cancelModalButton}
            onClick={onClose}
            disabled={isLoading}
          >
            {config.cancelButtonText}
          </button>
          <button 
            className={config.confirmButtonClass}
            onClick={onConfirm}
            disabled={isLoading}
          >
            {config.confirmButtonText}
          </button>
        </div>
      </div>
    </div>
  );
}
