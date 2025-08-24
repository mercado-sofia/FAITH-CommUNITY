'use client';

import { useState, useEffect } from 'react';
import { FaLock, FaEye, FaEyeSlash, FaTimes } from 'react-icons/fa';
import styles from './styles/PasswordConfirmModal.module.css';

export default function PasswordConfirmModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  isVerifying = false 
}) {
  const [password, setPassword] = useState('');
  const [passwordVisibility, setPasswordVisibility] = useState(false);
  const [error, setError] = useState('');

  // Reset password field when modal opens
  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setError('');
      setPasswordVisibility(false);
    }
  }, [isOpen]);

  const handlePasswordChange = (e) => {
    const newPassword = e.target.value;
    setPassword(newPassword);
    
    // Clear error when user starts typing
    if (error) {
      setError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!password.trim()) {
      setError('Password is required');
      return;
    }

    if (isVerifying) {
      return; // Prevent multiple submissions
    }

    setError('');
    try {
      await onConfirm(password);
    } catch (error) {
      // Display the error message from password verification
      setError(error.message || 'Password verification failed');
      // Don't close modal on error - let user try again
    }
  };

  const handleClose = () => {
    setPassword('');
    setError('');
    setPasswordVisibility(false);
    onClose();
  };

  const togglePasswordVisibility = () => {
    setPasswordVisibility(prev => !prev);
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={handleClose}>
      <div className={styles.modalContainer} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div className={styles.headerContent}>
            <div className={styles.headerIcon}>
              <FaLock />
            </div>
            <div className={styles.headerText}>
              <h2>Confirm Password</h2>
              <p>Enter your current password to confirm the changes</p>
            </div>
          </div>
          <button 
            className={styles.closeButton}
            onClick={handleClose}
            disabled={isVerifying}
          >
            <FaTimes />
          </button>
        </div>

        <div className={styles.modalContent}>
          <form onSubmit={handleSubmit}>
            {error && (
              <div className={`${styles.message} ${styles.error}`}>
                {error}
              </div>
            )}

            <div className={styles.fieldGroup}>
              <label className={styles.label}>
                Current Password <span className={styles.required}>*</span>
              </label>
              <div className={styles.passwordInputContainer}>
                <input
                  type={passwordVisibility ? "text" : "password"}
                  value={password}
                  onChange={handlePasswordChange}
                  className={`${styles.input} ${styles.passwordInput} ${error ? styles.inputError : ''}`}
                  placeholder="Enter your current password"
                  disabled={isVerifying}
                  autoFocus
                />
                <button
                  type="button"
                  className={styles.passwordToggle}
                  onClick={togglePasswordVisibility}
                  disabled={isVerifying}
                  tabIndex={-1}
                >
                  {passwordVisibility ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
              <div className={styles.helperText}>
                Required to confirm any changes to your profile
              </div>
            </div>

            <div className={styles.actionButtons}>
              <button 
                type="button"
                className={styles.cancelButton}
                onClick={handleClose}
                disabled={isVerifying}
              >
                Cancel
              </button>
              <button 
                type="submit"
                className={styles.saveButton}
                disabled={isVerifying}
              >
                {isVerifying ? 'Verifying...' : 'Confirm Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
