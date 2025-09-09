'use client';

import { useState } from 'react';
import { FaLock, FaEye, FaEyeSlash, FaTimes, FaCheck } from 'react-icons/fa';
import { createPortal } from 'react-dom';
import { getApiUrl, getAuthHeaders } from '../../../utils/api';
import styles from './Password.module.css';

// Password Requirements Component
const PasswordRequirements = ({ password }) => {
  const requirements = [
    {
      id: 'length',
      text: 'Minimum of 8 characters',
      met: password.length >= 8
    },
    {
      id: 'lowercase',
      text: 'At least one lowercase letter (a-z)',
      met: /[a-z]/.test(password)
    },
    {
      id: 'uppercase',
      text: 'At least one uppercase letter (A-Z)',
      met: /[A-Z]/.test(password)
    },
    {
      id: 'number',
      text: 'At least one number (0-9)',
      met: /\d/.test(password)
    }
  ];

  return (
    <div className={styles.passwordRequirements}>
      <h4 className={styles.passwordRequirementsTitle}>Password Requirements:</h4>
      <ul className={styles.requirementsList}>
        {requirements.map((requirement) => (
          <li key={requirement.id} className={styles.requirementItem}>
            <div className={`${styles.requirementIcon} ${requirement.met ? styles.met : styles.notMet}`}>
              {requirement.met ? <FaCheck /> : <FaTimes />}
            </div>
            <span className={`${styles.requirementText} ${requirement.met ? styles.met : styles.notMet}`}>
              {requirement.text}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default function Password({ userData, setUserData }) {
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  
  // Password change states
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [fieldErrors, setFieldErrors] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
    setPasswordSuccess('');
    // Clear field error when user starts typing
    if (fieldErrors[name]) {
      setFieldErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    
    // Reset field errors
    setFieldErrors({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
    
    // Validation
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      setFieldErrors({
        currentPassword: !passwordData.currentPassword ? 'This field is required' : '',
        newPassword: !passwordData.newPassword ? 'This field is required' : '',
        confirmPassword: !passwordData.confirmPassword ? 'This field is required' : ''
      });
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setFieldErrors(prev => ({
        ...prev,
        newPassword: 'Passwords do not match',
        confirmPassword: 'Passwords do not match'
      }));
      return;
    }

    if (passwordData.newPassword.length < 8) {
      setFieldErrors(prev => ({
        ...prev,
        newPassword: 'Password must be at least 8 characters long'
      }));
      return;
    }

    // Check password requirements
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(passwordData.newPassword)) {
      setFieldErrors(prev => ({
        ...prev,
        newPassword: 'Password must contain at least one uppercase letter, one lowercase letter, and one number'
      }));
      return;
    }

    setIsChangingPassword(true);
    setPasswordSuccess('');

    try {
      const response = await fetch(getApiUrl('/api/users/password'), {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword
        })
      });

      const data = await response.json();

      if (response.ok) {
        setPasswordSuccess('Password changed successfully!');
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
        setTimeout(() => {
          setShowPasswordModal(false);
          setPasswordSuccess('');
          document.body.classList.remove(styles.modalOpen);
        }, 2000);
      } else {
        // Handle server error by showing field-specific error
        let errorMessage = 'Failed to change password';
        
        // Check for specific error cases
        if (response.status === 401) {
          errorMessage = 'Wrong password';
        } else if (data.message) {
          // Use server message if available, but make it more user-friendly
          if (data.message.toLowerCase().includes('password') && data.message.toLowerCase().includes('incorrect')) {
            errorMessage = 'Wrong password';
          } else if (data.message.toLowerCase().includes('unauthorized')) {
            errorMessage = 'Wrong password';
          } else {
            errorMessage = data.message;
          }
        }
        
        setFieldErrors(prev => ({
          ...prev,
          currentPassword: errorMessage
        }));
      }
    } catch (error) {
      // Handle network error by showing field-specific error
      setFieldErrors(prev => ({
        ...prev,
        currentPassword: 'An error occurred while changing password'
      }));
    } finally {
      setIsChangingPassword(false);
    }
  };

  const closePasswordModal = () => {
    setShowPasswordModal(false);
    setPasswordData({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
    setPasswordSuccess('');
    setShowPasswords({
      current: false,
      new: false,
      confirm: false
    });
    setFieldErrors({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
    document.body.classList.remove(styles.modalOpen);
  };

  return (
    <div className={styles.passwordSection}>
      <div className={styles.sectionHeader}>
        <h2>Password & Security</h2>
      </div>

      <div className={styles.passwordContent}>
        {/* Current Password Display */}
        <div className={styles.infoItem}>
          <div className={styles.infoContent}>
            <label>Password Status</label>
            <div className={styles.statusInfo}>
              <p>For security, we recommend changing your password regularly.</p>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className={styles.actionButtons}>
          <button 
            onClick={() => {
              setShowPasswordModal(true);
              document.body.classList.add(styles.modalOpen);
            }} 
            className={styles.changePasswordButton}
          >
            <FaLock />
            <span>Change Password</span>
          </button>
        </div>
      </div>

      {/* Change Password Modal */}
      {showPasswordModal && createPortal(
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h2>Change Password</h2>
              <button 
                className={styles.modalCloseButton}
                onClick={closePasswordModal}
                type="button"
              >
                <FaTimes />
              </button>
            </div>
            
            <form onSubmit={handleChangePassword} className={styles.passwordForm}>
              {passwordSuccess && (
                <div className={styles.passwordSuccess}>
                  <FaCheck className={styles.successIcon} />
                  {passwordSuccess}
                </div>
              )}

              <div className={styles.passwordField}>
                <label>Current Password</label>
                <div className={styles.passwordInputWrapper}>
                  <input
                    type={showPasswords.current ? 'text' : 'password'}
                    name="currentPassword"
                    value={passwordData.currentPassword}
                    onChange={handlePasswordChange}
                    placeholder="Enter current password"
                    className={fieldErrors.currentPassword ? styles.error : ''}
                  />
                  <button
                    type="button"
                    className={styles.passwordToggle}
                    onClick={() => togglePasswordVisibility('current')}
                    tabIndex={-1}
                  >
                    {showPasswords.current ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
                {fieldErrors.currentPassword && (
                  <div className={styles.fieldErrorMessage}>
                    {fieldErrors.currentPassword}
                  </div>
                )}
              </div>

              <div className={styles.passwordField}>
                <label>New Password</label>
                <div className={styles.passwordInputWrapper}>
                  <input
                    type={showPasswords.new ? 'text' : 'password'}
                    name="newPassword"
                    value={passwordData.newPassword}
                    onChange={handlePasswordChange}
                    placeholder="Enter new password"
                    className={fieldErrors.newPassword ? styles.error : ''}
                  />
                  <button
                    type="button"
                    className={styles.passwordToggle}
                    onClick={() => togglePasswordVisibility('new')}
                    tabIndex={-1}
                  >
                    {showPasswords.new ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
                {fieldErrors.newPassword && (
                  <div className={styles.fieldErrorMessage}>
                    {fieldErrors.newPassword}
                  </div>
                )}
                <PasswordRequirements password={passwordData.newPassword} />
              </div>

              <div className={styles.passwordField}>
                <label>Confirm New Password</label>
                <div className={styles.passwordInputWrapper}>
                  <input
                    type={showPasswords.confirm ? 'text' : 'password'}
                    name="confirmPassword"
                    value={passwordData.confirmPassword}
                    onChange={handlePasswordChange}
                    placeholder="Confirm new password"
                    className={fieldErrors.confirmPassword ? styles.error : ''}
                  />
                  <button
                    type="button"
                    className={styles.passwordToggle}
                    onClick={() => togglePasswordVisibility('confirm')}
                    tabIndex={-1}
                  >
                    {showPasswords.confirm ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
                {fieldErrors.confirmPassword && (
                  <div className={styles.fieldErrorMessage}>
                    {fieldErrors.confirmPassword}
                  </div>
                )}
              </div>

              <div className={styles.passwordModalButtons}>
                <button 
                  type="button" 
                  className={styles.cancelButton}
                  onClick={closePasswordModal}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className={styles.changePasswordButton}
                  disabled={isChangingPassword}
                >
                  {isChangingPassword ? 'Changing...' : 'Change Password'}
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
