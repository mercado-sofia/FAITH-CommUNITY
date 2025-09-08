'use client';

import { useState } from 'react';
import { FaEnvelope, FaEye, FaEyeSlash, FaTimes, FaCheck } from 'react-icons/fa';
import { createPortal } from 'react-dom';
import styles from './Email.module.css';

export default function Email({ userData, setUserData }) {
  const [showEmailModal, setShowEmailModal] = useState(false);
  
  // Email change states
  const [emailData, setEmailData] = useState({
    newEmail: '',
    currentPassword: ''
  });
  const [emailError, setEmailError] = useState('');
  const [emailSuccess, setEmailSuccess] = useState('');
  const [isChangingEmail, setIsChangingEmail] = useState(false);
  const [showEmailPassword, setShowEmailPassword] = useState(false);

  const handleEmailChange = (e) => {
    const { name, value } = e.target;
    setEmailData(prev => ({
      ...prev,
      [name]: value
    }));
    setEmailError('');
    setEmailSuccess('');
  };

  const togglePasswordVisibility = () => {
    setShowEmailPassword(!showEmailPassword);
  };

  const handleChangeEmail = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!emailData.newEmail || !emailData.currentPassword) {
      setEmailError('All fields are required');
      return;
    }

    if (emailData.newEmail === userData.email) {
      setEmailError('New email must be different from current email');
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailData.newEmail)) {
      setEmailError('Please enter a valid email address');
      return;
    }

    setIsChangingEmail(true);
    setEmailError('');
    setEmailSuccess('');

    try {
      const token = localStorage.getItem('userToken');
      const response = await fetch('http://localhost:8080/api/users/email', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          newEmail: emailData.newEmail,
          currentPassword: emailData.currentPassword
        })
      });

      const data = await response.json();

      if (response.ok) {
        setEmailSuccess('Email changed successfully!');
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
          setEmailSuccess('');
          document.body.classList.remove(styles.modalOpen);
        }, 2000);
      } else {
        setEmailError(data.message || 'Failed to change email');
      }
    } catch (error) {
      setEmailError('An error occurred while changing email');
    } finally {
      setIsChangingEmail(false);
    }
  };

  const closeEmailModal = () => {
    setShowEmailModal(false);
    setEmailData({
      newEmail: '',
      currentPassword: ''
    });
    setEmailError('');
    setEmailSuccess('');
    setShowEmailPassword(false);
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
              {emailError && (
                <div className={styles.emailError}>
                  <FaTimes className={styles.errorIcon} />
                  {emailError}
                </div>
              )}
              
              {emailSuccess && (
                <div className={styles.emailSuccess}>
                  <FaCheck className={styles.successIcon} />
                  {emailSuccess}
                </div>
              )}

              <div className={styles.passwordField}>
                <label>New Email Address</label>
                <input
                  type="email"
                  name="newEmail"
                  value={emailData.newEmail}
                  onChange={handleEmailChange}
                  placeholder="Enter new email address"
                  required
                  className={styles.emailInput}
                />
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
                    required
                  />
                  <button
                    type="button"
                    className={styles.passwordToggle}
                    onClick={togglePasswordVisibility}
                  >
                    {showEmailPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
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
                  disabled={isChangingEmail}
                >
                  {isChangingEmail ? 'Changing...' : 'Change Email'}
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
