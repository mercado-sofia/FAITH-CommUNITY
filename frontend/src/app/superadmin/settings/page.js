'use client';

import { useState, useEffect } from 'react';
import { FaEye, FaEyeSlash, FaCheck, FaTimes, FaEdit, FaKey, FaEnvelope } from 'react-icons/fa';
import styles from './settings.module.css';

export default function SuperAdminSettings() {
  // State management
  const [emailEditMode, setEmailEditMode] = useState(false);
  const [passwordEditMode, setPasswordEditMode] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState(null);
  const [passwordChangedAt, setPasswordChangedAt] = useState(null);

  // Form states
  const [emailForm, setEmailForm] = useState({
    newEmail: ''
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [passwordVisibility, setPasswordVisibility] = useState({
    current: false,
    new: false,
    confirm: false
  });

  // Password validation state
  const [passwordValidation, setPasswordValidation] = useState({
    minLength: false,
    lowercase: false,
    uppercase: false,
    number: false
  });

  // Load current user data
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token || token === 'superadmin') {
          showNotification('Authentication token is invalid. Please log out and log back in.', 'error');
          return;
        }

        const response = await fetch(`http://localhost:8080/api/superadmin/auth/profile`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        const data = await response.json();

        if (response.ok) {
          setCurrentUser(data);
          setEmailForm({ newEmail: data.email || data.username || '' });
          setPasswordChangedAt(data.passwordChangedAt);
        } else {
          showNotification(data.error || 'Failed to load user data', 'error');
        }
      } catch (error) {
        showNotification('Failed to load user data', 'error');
      }
    };

    loadUserData();
  }, []);

  // Password validation effect
  useEffect(() => {
    const password = passwordForm.newPassword;
    setPasswordValidation({
      minLength: password.length >= 8,
      lowercase: /[a-z]/.test(password),
      uppercase: /[A-Z]/.test(password),
      number: /[0-9]/.test(password)
    });
  }, [passwordForm.newPassword]);

  // Show notification
  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  // Handle email form changes
  const handleEmailChange = (e) => {
    setEmailForm({ ...emailForm, [e.target.name]: e.target.value });
  };

  // Handle password form changes
  const handlePasswordChange = (e) => {
    setPasswordForm({ ...passwordForm, [e.target.name]: e.target.value });
  };

  // Toggle password visibility
  const togglePasswordVisibility = (field) => {
    setPasswordVisibility(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  // Handle email update
  const handleEmailUpdate = async () => {
    if (!emailForm.newEmail.trim()) {
      showNotification('Email address is required', 'error');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailForm.newEmail)) {
      showNotification('Please enter a valid email address', 'error');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      console.log('Token from localStorage:', token);
      
      if (!token || token === 'superadmin') {
        showNotification('Authentication token is invalid. Please log out and log back in.', 'error');
        return;
      }

      const response = await fetch(`http://localhost:8080/api/superadmin/auth/email/${currentUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          newEmail: emailForm.newEmail
        })
      });

      const data = await response.json();

      if (response.ok) {
        // Update local storage
        const updatedUser = { ...currentUser, email: emailForm.newEmail, username: emailForm.newEmail };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        setCurrentUser(updatedUser);
        
        setEmailEditMode(false);
        showNotification('Email address updated successfully');
      } else {
        showNotification(data.error || 'Failed to update email address', 'error');
      }
    } catch (error) {
      showNotification('Failed to update email address', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Handle password update
  const handlePasswordUpdate = async () => {
    const { currentPassword, newPassword, confirmPassword } = passwordForm;

    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      showNotification('All password fields are required', 'error');
      return;
    }

    if (newPassword !== confirmPassword) {
      showNotification('New passwords do not match', 'error');
      return;
    }

    const allValidationsPassed = Object.values(passwordValidation).every(Boolean);
    if (!allValidationsPassed) {
      showNotification('Please meet all password requirements', 'error');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      console.log('Token from localStorage:', token);
      
      if (!token || token === 'superadmin') {
        showNotification('Authentication token is invalid. Please log out and log back in.', 'error');
        return;
      }

      const response = await fetch(`http://localhost:8080/api/superadmin/auth/password/${currentUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword,
          newPassword
        })
      });

      const data = await response.json();

      if (response.ok) {
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setPasswordEditMode(false);
        setPasswordChangedAt(data.passwordChangedAt || new Date().toISOString());
        showNotification('Password updated successfully');
      } else {
        showNotification(data.error || 'Failed to update password', 'error');
      }
    } catch (error) {
      showNotification('Failed to update password', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Cancel edit modes
  const cancelEmailEdit = () => {
    setEmailForm({ newEmail: currentUser?.email || currentUser?.username || '' });
    setEmailEditMode(false);
  };

  const cancelPasswordEdit = () => {
    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setPasswordEditMode(false);
  };

  if (!currentUser) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Loading settings...</p>
      </div>
    );
  }

  return (
    <div className={styles.settingsContainer}>
      {/* Notification */}
      {notification && (
        <div className={`${styles.notification} ${styles[notification.type]}`}>
          {notification.message}
        </div>
      )}

      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.title}>Settings</h1>
      </div>

      {/* Settings Cards */}
      <div className={styles.cardsContainer}>
        {/* Email Address Card */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.cardHeaderLeft}>
              <div className={styles.cardTitleWithIcon}>
                <FaEnvelope className={styles.cardIcon} />
                <h2 className={styles.cardTitle}>Email Address</h2>
              </div>
              <p className={styles.cardSubtitle}>Update your email address for notifications and login</p>
            </div>
            {!emailEditMode && (
              <button 
                className={styles.editButton}
                onClick={() => setEmailEditMode(true)}
              >
                <FaEdit /> Edit
              </button>
            )}
          </div>

          <div className={styles.cardContent}>
            {!emailEditMode ? (
              // View Mode
              <div className={styles.viewMode}>
                <div className={styles.inputGroup}>
                  <label className={styles.label}>Current Email</label>
                  <input
                    type="email"
                    value={currentUser.email || currentUser.username || ''}
                    disabled
                    className={styles.disabledInput}
                  />
                </div>
              </div>
            ) : (
              // Edit Mode
              <div className={styles.editMode}>
                <div className={styles.inputGroup}>
                  <label className={styles.label}>Email Address</label>
                  <input
                    type="email"
                    name="newEmail"
                    value={emailForm.newEmail}
                    onChange={handleEmailChange}
                    className={styles.input}
                    placeholder="Enter new email address"
                  />
                </div>
                <div className={styles.buttonGroup}>
                  <button 
                    className={styles.cancelButton}
                    onClick={cancelEmailEdit}
                    disabled={loading}
                  >
                    Cancel
                  </button>
                  <button 
                    className={styles.saveButton}
                    onClick={handleEmailUpdate}
                    disabled={loading}
                  >
                    {loading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Password & Security Card */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.cardHeaderLeft}>
              <div className={styles.cardTitleWithIcon}>
                <FaKey className={styles.cardIcon} />
                <h2 className={styles.cardTitle}>Password & Security</h2>
              </div>
              <p className={styles.cardSubtitle}>Change your password and manage security settings</p>
            </div>
            {!passwordEditMode && (
              <button 
                className={styles.editButton}
                onClick={() => setPasswordEditMode(true)}
              >
                <FaKey /> Change
              </button>
            )}
          </div>

          <div className={styles.cardContent}>
            {!passwordEditMode ? (
              // View Mode
              <div className={styles.viewMode}>
                <div className={styles.passwordStatus}>
                  <h3 className={styles.statusTitle}>Password Status</h3>
                  <div className={styles.statusItem}>
                    <span className={styles.statusLabel}>Last changed:</span>
                    <span className={styles.statusValue}>{passwordChangedAt ? new Date(passwordChangedAt).toLocaleDateString() : 'Recently'}</span>
                  </div>
                  <p className={styles.securityNote}>
                    For security, we recommend changing your password regularly.
                  </p>
                </div>
              </div>
            ) : (
              // Edit Mode
              <div className={styles.editMode}>
                <div className={styles.passwordForm}>
                  {/* Current Password */}
                  <div className={styles.inputGroup}>
                    <label className={styles.label}>Current Password</label>
                    <div className={styles.passwordInputWrapper}>
                      <input
                        type={passwordVisibility.current ? 'text' : 'password'}
                        name="currentPassword"
                        value={passwordForm.currentPassword}
                        onChange={handlePasswordChange}
                        className={styles.input}
                        placeholder="Enter your current password"
                      />
                      <button
                        type="button"
                        className={styles.passwordToggle}
                        onClick={() => togglePasswordVisibility('current')}
                      >
                        {passwordVisibility.current ? <FaEyeSlash /> : <FaEye />}
                      </button>
                    </div>
                  </div>

                  {/* New Password */}
                  <div className={styles.inputGroup}>
                    <label className={styles.label}>New Password</label>
                    <div className={styles.passwordInputWrapper}>
                      <input
                        type={passwordVisibility.new ? 'text' : 'password'}
                        name="newPassword"
                        value={passwordForm.newPassword}
                        onChange={handlePasswordChange}
                        className={styles.input}
                        placeholder="Enter your new password"
                      />
                      <button
                        type="button"
                        className={styles.passwordToggle}
                        onClick={() => togglePasswordVisibility('new')}
                      >
                        {passwordVisibility.new ? <FaEyeSlash /> : <FaEye />}
                      </button>
                    </div>
                  </div>

                  {/* Password Requirements */}
                  {passwordForm.newPassword && (
                    <div className={styles.passwordRequirements}>
                      <h4 className={styles.requirementsTitle}>Password Requirements:</h4>
                      <div className={styles.requirementsList}>
                        <div className={`${styles.requirement} ${passwordValidation.minLength ? styles.met : ''}`}>
                          {passwordValidation.minLength ? <FaCheck /> : <FaTimes />}
                          <span>Minimum of 8 characters</span>
                        </div>
                        <div className={`${styles.requirement} ${passwordValidation.lowercase ? styles.met : ''}`}>
                          {passwordValidation.lowercase ? <FaCheck /> : <FaTimes />}
                          <span>At least one lowercase letter (a-z)</span>
                        </div>
                        <div className={`${styles.requirement} ${passwordValidation.uppercase ? styles.met : ''}`}>
                          {passwordValidation.uppercase ? <FaCheck /> : <FaTimes />}
                          <span>At least one uppercase letter (A-Z)</span>
                        </div>
                        <div className={`${styles.requirement} ${passwordValidation.number ? styles.met : ''}`}>
                          {passwordValidation.number ? <FaCheck /> : <FaTimes />}
                          <span>At least one number (0-9)</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Confirm Password */}
                  <div className={styles.inputGroup}>
                    <label className={styles.label}>Confirm New Password</label>
                    <div className={styles.passwordInputWrapper}>
                      <input
                        type={passwordVisibility.confirm ? 'text' : 'password'}
                        name="confirmPassword"
                        value={passwordForm.confirmPassword}
                        onChange={handlePasswordChange}
                        className={styles.input}
                        placeholder="Confirm your new password"
                      />
                      <button
                        type="button"
                        className={styles.passwordToggle}
                        onClick={() => togglePasswordVisibility('confirm')}
                      >
                        {passwordVisibility.confirm ? <FaEyeSlash /> : <FaEye />}
                      </button>
                    </div>
                  </div>

                  <div className={styles.buttonGroup}>
                    <button 
                      className={styles.cancelButton}
                      onClick={cancelPasswordEdit}
                      disabled={loading}
                    >
                      Cancel
                    </button>
                    <button 
                      className={styles.saveButton}
                      onClick={handlePasswordUpdate}
                      disabled={loading}
                    >
                      {loading ? 'Updating...' : 'Update Password'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}