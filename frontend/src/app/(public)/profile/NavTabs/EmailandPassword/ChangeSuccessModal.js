'use client';

import { FaCheckCircle, FaTimes } from 'react-icons/fa';
import { createPortal } from 'react-dom';
import styles from './EmailandPassword.module.css';

/**
 * Success modal for email and password change confirmation
 * EXCLUSIVELY for public users only
 * Admin and superadmin users have their own reusable success modal components
 */
export default function ChangeSuccessModal({ 
  isOpen, 
  onClose, 
  changeType, // 'email' or 'password'
  newEmail, 
  oldEmail 
}) {
  if (!isOpen) return null;

  const isEmailChange = changeType === 'email';
  const isPasswordChange = changeType === 'password';

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
          <h2>
            {isEmailChange ? 'Email Changed Successfully!' : 'Password Changed Successfully!'}
          </h2>
          <p>
            {isEmailChange 
              ? 'Your email address has been updated successfully.' 
              : 'Your password has been updated successfully.'
            }
          </p>
          
          {isEmailChange && (
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
          )}
          
          <div className={styles.successModalNote}>
            <p>
              {isEmailChange 
                ? 'Please use your new email address for future logins and communications.'
                : 'Please use your new password for future logins. Keep it secure and don\'t share it with anyone.'
              }
            </p>
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
