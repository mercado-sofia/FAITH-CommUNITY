'use client';

import { useState, useEffect } from 'react';
import { FaEnvelope, FaTimes, FaSpinner, FaLock, FaEye, FaEyeSlash } from 'react-icons/fa';
import styles from './styles/EmailChangeModal.module.css';
import SuccessModal from '../../components/SuccessModal';

// Utility functions
const sanitizeEmail = (email) => {
  return email.replace(/[<>]/g, '');
};

// Enhanced error handling
const handleApiError = (error) => {
  if (error.status === 401) {
    return {
      type: 'authentication',
      message: 'Your session has expired. Please log in again.',
      action: 'redirect_to_login'
    };
  } else if (error.status === 403) {
    return {
      type: 'authorization',
      message: 'You do not have permission to perform this action.',
      action: 'show_error'
    };
  } else if (error.status === 409) {
    return {
      type: 'conflict',
      message: 'This email address is already in use.',
      action: 'show_error'
    };
  } else if (error.status >= 500) {
    return {
      type: 'server_error',
      message: 'Server error. Please try again later.',
      action: 'show_error'
    };
  } else {
    return {
      type: 'unknown',
      message: error.message || 'An unexpected error occurred.',
      action: 'show_error'
    };
  }
};

export default function EmailChangeModal({ 
  isOpen, 
  onClose, 
  onSuccess,
  currentUser
}) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [emailData, setEmailData] = useState({
    newEmail: ''
  });
  const [errors, setErrors] = useState({});
  const [errorMessage, setErrorMessage] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [modalMode, setModalMode] = useState('email'); // 'email' or 'password'
  const [isVerifying, setIsVerifying] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordVisibility, setPasswordVisibility] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    if (isOpen) {
      // Reset form when modal opens
      setEmailData({
        newEmail: currentUser?.email || currentUser?.username || ''
      });
      setErrors({});
      setErrorMessage('');
      setModalMode('email');
      setIsVerifying(false);
      setPassword('');
      setPasswordVisibility(false);
      setPasswordError('');
      setShowSuccessModal(false); // Reset success modal state
    }
  }, [isOpen, currentUser]);

  useEffect(() => {
    if (isOpen) {
      // Lock body scroll when modal is open
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.left = '0';
      document.body.style.right = '0';
      document.body.style.overflow = 'hidden';
      
      return () => {
        // Restore body scroll when modal closes
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.left = '';
        document.body.style.right = '';
        document.body.style.overflow = '';
        window.scrollTo(0, scrollY);
      };
    }
  }, [isOpen]);

  const handleEmailInputChange = (e) => {
    const { name, value } = e.target;
    const sanitizedValue = sanitizeEmail(value);
    
    setEmailData(prev => ({
      ...prev,
      [name]: sanitizedValue
    }));
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateEmailChange = () => {
    const newErrors = {};
    
    if (!emailData.newEmail.trim()) {
      newErrors.newEmail = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailData.newEmail)) {
      newErrors.newEmail = 'Please enter a valid email address';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChangeEmail = async () => {
    if (validateEmailChange()) {
      // Check if there are actual changes
      const hasChanges = emailData.newEmail !== (currentUser?.email || currentUser?.username || '');

      if (hasChanges) {
        // Switch to password confirmation mode
        setModalMode('password');
      } else {
        // No changes, just close the modal
        onClose();
      }
    }
  };

  const handlePasswordConfirm = async () => {
    if (!password.trim()) {
      setPasswordError('Password is required');
      return;
    }

    try {
      setIsVerifying(true);
      setPasswordError('');
      
      const token = localStorage.getItem('superAdminToken');
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
      
      if (!token) {
        throw new Error('Authentication required. Please log in again.');
      }

      // Verify password first
      const verifyResponse = await fetch(`${baseUrl}/api/superadmin/auth/verify-password/${currentUser.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ password })
      });

      if (!verifyResponse.ok) {
        const errorData = await verifyResponse.json().catch(() => ({}));
        if (verifyResponse.status === 401) {
          throw new Error('Incorrect password. Please try again.');
        } else {
          throw new Error(errorData.message || 'Password verification failed');
        }
      }

      // Update email using superadmin API
      const updateResponse = await fetch(`${baseUrl}/api/superadmin/auth/email/${currentUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          newEmail: emailData.newEmail
        })
      });

      if (!updateResponse.ok) {
        const errorData = await updateResponse.json().catch(() => ({}));
        const errorInfo = handleApiError({ status: updateResponse.status, message: errorData.message });
        throw new Error(errorInfo.message);
      }
      
      // Close modal and show success
      onClose();
      setShowSuccessModal(true);
      onSuccess();
      
    } catch (error) {
      setPasswordError(error.message || 'Password verification failed');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleCancel = () => {
    setEmailData({
      newEmail: currentUser?.email || currentUser?.username || ''
    });
    setErrors({});
    setErrorMessage('');
    setModalMode('email');
    setIsVerifying(false);
    setPassword('');
    setPasswordVisibility(false);
    setPasswordError('');
    setShowSuccessModal(false); // Reset success modal state
    onClose();
  };

  const handleBackToEmail = () => {
    setModalMode('email');
    setPassword('');
    setPasswordVisibility(false);
    setPasswordError('');
  };

  const handlePasswordChange = (e) => {
    setPassword(e.target.value);
    if (passwordError) {
      setPasswordError('');
    }
  };

  const togglePasswordVisibility = () => {
    setPasswordVisibility(prev => !prev);
  };

  return (
    <>
      {isOpen && (
        <div className={styles.modalOverlay} onClick={handleCancel}>
          <div className={styles.modalContainer} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.headerContent}>
                <div className={styles.headerIcon}>
                  {modalMode === 'email' ? <FaEnvelope /> : <FaLock />}
                </div>
                <div className={styles.headerText}>
                  <h2>{modalMode === 'email' ? 'Change Email Address' : 'Confirm Password'}</h2>
                  <p>{modalMode === 'email' ? 'Update your email address for notifications and login' : 'Enter your current password to confirm the changes'}</p>
                </div>
              </div>
              <button 
                className={styles.closeButton}
                onClick={handleCancel}
                disabled={isUpdating || isVerifying}
              >
                <FaTimes />
              </button>
            </div>

            <div className={styles.modalContent}>
              {modalMode === 'email' ? (
                <>
                  {errorMessage && (
                    <div className={`${styles.message} ${styles.error}`}>
                      {errorMessage}
                    </div>
                  )}

                  <div className={styles.form}>
                    <div className={styles.fieldGroup}>
                      <label className={styles.label}>Current Email</label>
                      <input
                        type="email"
                        value={currentUser?.email || currentUser?.username || ''}
                        disabled
                        className={styles.disabledInput}
                      />
                    </div>

                    <div className={styles.fieldGroup}>
                      <label className={styles.label}>New Email Address</label>
                      <input
                        type="email"
                        name="newEmail"
                        value={emailData.newEmail}
                        onChange={handleEmailInputChange}
                        className={`${styles.input} ${errors.newEmail ? styles.inputError : ''}`}
                        placeholder="Enter your new email address"
                        disabled={isUpdating}
                      />
                      {errors.newEmail && <span className={styles.errorText}>{errors.newEmail}</span>}
                    </div>

                    <div className={styles.actionButtons}>
                      <button 
                        className={styles.cancelButton}
                        onClick={handleCancel}
                        disabled={isUpdating}
                      >
                        Cancel
                      </button>
                      <button 
                        className={styles.saveButton}
                        onClick={handleChangeEmail}
                        disabled={isUpdating}
                      >
                        {isUpdating ? <FaSpinner className={styles.spinner} /> : null}
                        Update Email
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {passwordError && (
                    <div className={`${styles.message} ${styles.error}`}>
                      {passwordError}
                    </div>
                  )}

                  <div className={styles.form}>
                    <div className={styles.fieldGroup}>
                      <label className={styles.label}>
                        Current Password <span className={styles.required}>*</span>
                      </label>
                      <div className={styles.passwordInputContainer}>
                        <input
                          type={passwordVisibility ? "text" : "password"}
                          value={password}
                          onChange={handlePasswordChange}
                          className={`${styles.input} ${styles.passwordInput} ${passwordError ? styles.inputError : ''}`}
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
                        onClick={handleBackToEmail}
                        disabled={isVerifying}
                      >
                        Back
                      </button>
                      <button 
                        type="button"
                        className={styles.saveButton}
                        onClick={handlePasswordConfirm}
                        disabled={isVerifying}
                      >
                        {isVerifying ? <FaSpinner className={styles.spinner} /> : null}
                        Confirm Changes
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Success Modal - Always rendered, shown when needed */}
      <SuccessModal
        message="Email address updated successfully!"
        isVisible={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        type="success"
        autoHideDuration={2000}
      />
    </>
  );
}