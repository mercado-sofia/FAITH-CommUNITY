'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FaTimes, FaExclamationTriangle } from 'react-icons/fa';
import styles from './CancelConfirmationModal.module.css';

export default function CancelConfirmationModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  applicationName,
  isLoading = false 
}) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }

    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isOpen]);

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget && !isLoading) {
      onClose();
    }
  };

  if (!isOpen) return null;

  const modalContent = (
    <div className={styles.modalOverlay} onClick={handleBackdropClick}>
      <div className={styles.modalContainer}>
        <div className={styles.modalHeader}>
          <div className={styles.warningIcon}>
            <FaExclamationTriangle />
          </div>
          <h2 className={styles.modalTitle}>Cancel Application</h2>
          <button 
            className={styles.closeButton} 
            onClick={onClose}
            disabled={isLoading}
          >
            <FaTimes />
          </button>
        </div>

        <div className={styles.modalContent}>
          <div className={styles.warningMessage}>
            <p className={styles.mainMessage}>
              Are you sure you want to cancel your application for:
            </p>
            <p className={styles.applicationName}>
              "{applicationName}"
            </p>
            <p className={styles.warningText}>
              This action cannot be undone. You will need to submit a new application if you want to apply again.
            </p>
          </div>
        </div>

        <div className={styles.modalFooter}>
          <button 
            className={styles.cancelButton}
            onClick={onClose}
            disabled={isLoading}
          >
            Keep Application
          </button>
          <button 
            className={styles.confirmButton}
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <div className={styles.spinner}></div>
                Cancelling...
              </>
            ) : (
              'Yes, Cancel Application'
            )}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
