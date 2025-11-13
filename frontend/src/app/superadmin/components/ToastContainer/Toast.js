"use client";

import { FiX, FiAlertCircle, FiInfo, FiAlertTriangle } from 'react-icons/fi';
import { FaCircleCheck } from 'react-icons/fa6';
import styles from './Toast.module.css';

export default function Toast({ heading, body, message, type = 'success', onClose }) {
  const handleClose = () => {
    onClose?.();
  };

  // Support both new format (heading/body) and old format (message)
  const displayHeading = heading || (message ? 'Admin Invitation Accepted' : '');
  const displayBody = body || message || '';

  return (
    <div className={`${styles.toast} ${styles[type]} ${styles.show}`}>
      <div className={styles.toastContent}>
        <div className={styles.toastIcon}>
          {type === 'success' && (
            <div className={styles.iconContainer}>
              <FaCircleCheck />
            </div>
          )}
          {type === 'error' && <FiAlertCircle />}
          {type === 'warning' && <FiAlertTriangle />}
          {type === 'info' && <FiInfo />}
        </div>
        <div className={styles.toastText}>
          {displayHeading && (
            <div className={styles.toastHeading}>
              {displayHeading}
            </div>
          )}
          {displayBody && (
            <div className={styles.toastBody}>
              {displayBody}
            </div>
          )}
        </div>
        <button 
          className={styles.toastClose} 
          onClick={handleClose}
          aria-label="Close toast"
        >
          <FiX />
        </button>
      </div>
    </div>
  );
}

