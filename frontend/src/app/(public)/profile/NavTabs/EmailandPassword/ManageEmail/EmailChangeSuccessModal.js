'use client';

import { useEffect, useState } from 'react';
import { FaCheck, FaTimes } from 'react-icons/fa';
import { createPortal } from 'react-dom';
import styles from './EmailChangeSuccessModal.module.css';

export default function EmailChangeSuccessModal({ 
  isOpen, 
  onClose, 
  newEmail,
  oldEmail 
}) {
  const [mounted, setMounted] = useState(false);

  // Ensure component is mounted before rendering portal
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen && mounted) {
      document.body.classList.add('modalOpen');
    } else if (mounted) {
      document.body.classList.remove('modalOpen');
    }

    return () => {
      if (mounted) {
        document.body.classList.remove('modalOpen');
      }
    };
  }, [isOpen, mounted]);

  // Don't render anything until component is mounted and we have required data
  if (!mounted || !isOpen || !newEmail || !oldEmail) return null;

  // Ensure document.body exists before creating portal
  if (typeof document === 'undefined' || !document.body) {
    return null;
  }

  return createPortal(
    <div className={styles.modalOverlay}>
      <div className={styles.modalContainer}>
        <div className={styles.modalContent}>
          {/* Success Icon */}
          <div className={styles.successIcon}>
            <FaCheck />
          </div>

          {/* Title */}
          <h2 className={styles.modalTitle}>
            Email Changed Successfully!
          </h2>

          {/* Message */}
          <p className={styles.modalMessage}>
            Your email has been successfully changed.
          </p>

          {/* Email Details */}
          <div className={styles.emailDetails}>
            <div className={styles.emailRow}>
              <span className={styles.emailLabel}>Previous Email:</span>
              <span className={styles.emailValue}>{oldEmail}</span>
            </div>
            <div className={styles.emailRow}>
              <span className={styles.emailLabel}>New Email:</span>
              <span className={styles.emailValue}>{newEmail}</span>
            </div>
          </div>

          {/* Close Button */}
          <button 
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Close confirmation"
          >
            <FaTimes />
          </button>

          {/* Action Button */}
          <button 
            className={styles.actionButton}
            onClick={onClose}
          >
            Got it
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
