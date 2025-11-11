'use client';

import React from 'react';
import { FaExclamationTriangle, FaTimes } from 'react-icons/fa';
import styles from './UnsaveChangesModal.module.css';

const UnsaveChangesModal = ({ isOpen, onConfirm, onCancel }) => {
  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onCancel}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div className={styles.titleSection}>
            <div className={styles.iconContainer}>
              <FaExclamationTriangle className={styles.warningIcon} />
            </div>
            <h2 className={styles.modalTitle}>Unsaved Changes</h2>
          </div>
          <button onClick={onCancel} className={styles.closeButton}>
            <FaTimes />
          </button>
        </div>

        <div className={styles.modalBody}>
          <p className={styles.message}>
            You have unsaved changes. Are you sure you want to close without saving?
          </p>
          <p className={styles.subMessage}>
            Your changes will be lost if you proceed.
          </p>
        </div>

        <div className={styles.modalFooter}>
          <button 
            onClick={onCancel} 
            className={styles.cancelButton}
          >
            Keep Editing
          </button>
          <button 
            onClick={onConfirm} 
            className={styles.confirmButton}
          >
            Discard Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default UnsaveChangesModal;
