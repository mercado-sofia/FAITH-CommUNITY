'use client';

import { useState } from 'react';
import { FaEnvelope, FaEye, FaEyeSlash, FaTimes, FaCheck } from 'react-icons/fa';
import { createPortal } from 'react-dom';
import { useProfileApi } from '../../../hooks/useApiCall';
import { useFormValidation } from '../../../hooks/useFormValidation';
import { useToast } from '../../common/Toast';
import LoadingSpinner from '../../common/LoadingSpinner';
import styles from './Email.module.css';

export default function Email({ userData, setUserData }) {
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showEmailPassword, setShowEmailPassword] = useState(false);
  
  // Email change states
  const [emailData, setEmailData] = useState({
    newEmail: '',
    currentPassword: ''
  });
  
  // Custom hooks
  const { changeEmail, isLoading } = useProfileApi();
  const { validateEmail, fieldErrors, setFieldError, clearAllErrors } = useFormValidation();
  const { showSuccess, showError } = useToast();

  const handleEmailChange = (e) => {
    const { name, value } = e.target;
    setEmailData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear field error when user starts typing
    if (fieldErrors[name]) {
      setFieldError(name, '');
    }
  };

  const togglePasswordVisibility = () => {
    setShowEmailPassword(!showEmailPassword);
  };

  const handleChangeEmail = async (e) => {
    e.preventDefault();
    
    // Reset field errors
    clearAllErrors();
    
    // Validation
    if (!emailData.newEmail || !emailData.currentPassword) {
      if (!emailData.newEmail) setFieldError('newEmail', 'This field is required');
      if (!emailData.currentPassword) setFieldError('currentPassword', 'This field is required');
      return;
    }

    if (emailData.newEmail === userData.email) {
      setFieldError('newEmail', 'New email must be different from current email');
      return;
    }

    // Email validation
    if (!validateEmail(emailData.newEmail)) {
      setFieldError('newEmail', 'Please enter a valid email address');
      return;
    }

    try {
      await changeEmail({
        newEmail: emailData.newEmail,
        currentPassword: emailData.currentPassword
      });

      showSuccess('Email changed successfully!');
      
      // Update user data in localStorage
      const updatedUserData = {
        ...userData,
        email: emailData.newEmail
      };
      localStorage.setItem('userData', JSON.stringify(updatedUserData));
      setUserData(updatedUserData);
      
      setEmailData({
        newEmail: '',
        currentPassword: ''
      });
      
      setTimeout(() => {
        setShowEmailModal(false);
        document.body.classList.remove(styles.modalOpen);
      }, 2000);
      
    } catch (error) {
      // Handle server error by showing field-specific error
      let errorMessage = 'Failed to change email';
      
      if (error.message) {
        if (error.message.toLowerCase().includes('password') && error.message.toLowerCase().includes('incorrect')) {
          errorMessage = 'Wrong password';
        } else if (error.message.toLowerCase().includes('unauthorized')) {
          errorMessage = 'Wrong password';
        } else {
          errorMessage = error.message;
        }
      }
      
      setFieldError('currentPassword', errorMessage);
    }
  };

  const closeEmailModal = () => {
    setShowEmailModal(false);
    setEmailData({
      newEmail: '',
      currentPassword: ''
    });
    setShowEmailPassword(false);
    clearAllErrors();
    document.body.classList.remove(styles.modalOpen);
  };

  return (
    <div className={styles.emailSection}>
      <div className={styles.sectionHeader}>
        <h2>Email</h2>
      </div>

      <div className={styles.emailContent}>
        {/* Current Email Display */}
        <div className={styles.infoItem}>
          <div className={styles.infoContent}>
            <label>Current Email</label>
            <p>{userData.email}</p>
          </div>
        </div>

        {/* Action Button */}
        <div className={styles.actionButtons}>
          <button 
            onClick={() => {
              setShowEmailModal(true);
              document.body.classList.add(styles.modalOpen);
            }} 
            className={styles.changeEmailButton}
          >
            <FaEnvelope />
            <span>Change Email</span>
          </button>
        </div>
      </div>

      {/* Change Email Modal */}
      {showEmailModal && createPortal(
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h2>Change Email Address</h2>
              <button 
                className={styles.modalCloseButton}
                onClick={closeEmailModal}
                type="button"
              >
                <FaTimes />
              </button>
            </div>
            
            <form onSubmit={handleChangeEmail} className={styles.emailForm}>

              <div className={styles.passwordField}>
                <label>Current Email</label>
                <input
                  type="email"
                  value={userData.email}
                  readOnly
                  className={styles.currentEmailInput}
                />
              </div>

              <div className={styles.passwordField}>
                <label>New Email Address</label>
                <input
                  type="email"
                  name="newEmail"
                  value={emailData.newEmail}
                  onChange={handleEmailChange}
                  placeholder="Enter new email address"
                  className={`${styles.emailInput} ${fieldErrors.newEmail ? styles.error : ''}`}
                />
                {fieldErrors.newEmail && (
                  <div className={styles.fieldErrorMessage}>
                    {fieldErrors.newEmail}
                  </div>
                )}
              </div>

              <div className={styles.passwordField}>
                <label>Current Password</label>
                <div className={styles.passwordInputWrapper}>
                  <input
                    type={showEmailPassword ? 'text' : 'password'}
                    name="currentPassword"
                    value={emailData.currentPassword}
                    onChange={handleEmailChange}
                    placeholder="Enter current password"
                    className={fieldErrors.currentPassword ? styles.error : ''}
                  />
                  <button
                    type="button"
                    className={styles.passwordToggle}
                    onClick={togglePasswordVisibility}
                    tabIndex={-1}
                  >
                    {showEmailPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
                {fieldErrors.currentPassword && (
                  <div className={styles.fieldErrorMessage}>
                    {fieldErrors.currentPassword}
                  </div>
                )}
              </div>

              <div className={styles.emailModalButtons}>
                <button 
                  type="button" 
                  className={styles.cancelButton}
                  onClick={closeEmailModal}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className={styles.changeEmailButton}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <LoadingSpinner size="small" message="" />
                      Changing...
                    </>
                  ) : (
                    'Change Email'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
