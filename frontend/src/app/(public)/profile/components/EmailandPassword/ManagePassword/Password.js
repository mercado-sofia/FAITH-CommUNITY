'use client';

import { useState } from 'react';
import { FaLock, FaEye, FaEyeSlash, FaTimes, FaCheck } from 'react-icons/fa';
import { createPortal } from 'react-dom';
import styles from './Password.module.css';

export default function Password({ userData, setUserData }) {
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  
  // Password change states
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
    setPasswordError('');
    setPasswordSuccess('');
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      setPasswordError('All fields are required');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long');
      return;
    }

    setIsChangingPassword(true);
    setPasswordError('');
    setPasswordSuccess('');

    try {
      const token = localStorage.getItem('userToken');
      const response = await fetch('http://localhost:8080/api/users/password', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
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
        setPasswordError(data.message || 'Failed to change password');
      }
    } catch (error) {
      setPasswordError('An error occurred while changing password');
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
    setPasswordError('');
    setPasswordSuccess('');
    setShowPasswords({
      current: false,
      new: false,
      confirm: false
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
              {passwordError && (
                <div className={styles.passwordError}>
                  <FaTimes className={styles.errorIcon} />
                  {passwordError}
                </div>
              )}
              
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
                    required
                  />
                  <button
                    type="button"
                    className={styles.passwordToggle}
                    onClick={() => togglePasswordVisibility('current')}
                  >
                    {showPasswords.current ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
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
                    required
                  />
                  <button
                    type="button"
                    className={styles.passwordToggle}
                    onClick={() => togglePasswordVisibility('new')}
                  >
                    {showPasswords.new ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
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
                    required
                  />
                  <button
                    type="button"
                    className={styles.passwordToggle}
                    onClick={() => togglePasswordVisibility('confirm')}
                  >
                    {showPasswords.confirm ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
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
