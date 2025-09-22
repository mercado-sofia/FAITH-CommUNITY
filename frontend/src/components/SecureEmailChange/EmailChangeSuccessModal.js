'use client';

import { FaCheckCircle, FaTimes } from 'react-icons/fa';
import { createPortal } from 'react-dom';
import styles from './SecureEmailChange.module.css';

/**
 * Success modal for email change confirmation
 * Used primarily for public users
 */
export default function EmailChangeSuccessModal({ isOpen, onClose, newEmail, oldEmail }) {
  if (!isOpen) return null;

  return createPortal(
    <div className={styles.successModalOverlay} onClick={onClose}>
      <div className={styles.successModal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.successModalHeader}>
          <div className={styles.successIcon}>
            <FaCheckCircle />
          </div>
          <button 
            className={styles.successModalCloseButton}
            onClick={onClose}
            type="button"
          >
            <FaTimes />
          </button>
        </div>
        
        <div className={styles.successModalContent}>
          <h2>Email Changed Successfully!</h2>
          <p>Your email address has been updated successfully.</p>
          
          <div className={styles.emailChangeDetails}>
            <div className={styles.emailChangeItem}>
              <span className={styles.emailChangeLabel}>Previous Email:</span>
              <span className={styles.emailChangeValue}>{oldEmail}</span>
            </div>
            <div className={styles.emailChangeItem}>
              <span className={styles.emailChangeLabel}>New Email:</span>
              <span className={styles.emailChangeValue}>{newEmail}</span>
            </div>
          </div>
          
          <div className={styles.successModalNote}>
            <p>Please use your new email address for future logins and communications.</p>
          </div>
        </div>
        
        <div className={styles.successModalButtons}>
          <button 
            type="button" 
            className={styles.successModalButton}
            onClick={onClose}
          >
            Got it!
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
