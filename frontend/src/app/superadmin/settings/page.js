'use client';

import { useState, useEffect } from 'react';
import { FaEnvelope, FaLock, FaShieldAlt } from 'react-icons/fa';
import styles from './settings.module.css';
import SecureEmailChangeModal from './ProfileSection/SecureEmailChangeModal';
import PasswordChangeModal from './ProfileSection/PasswordChangeModal';
import TwoFAModal from './ProfileSection/TwoFAModal';
import SuccessModal from '../components/SuccessModal';
import { makeAuthenticatedRequest, clearAuthAndRedirect, showAuthError, checkAuthStatus } from '../../../utils/adminAuth';

// Utility function for password change time
const getPasswordChangeTime = (userData) => {
  const passwordChangedAt = userData?.password_changed_at || 
                            userData?.passwordChangedAt ||
                            userData?.created_at ||
                            userData?.createdAt;
  
  if (!passwordChangedAt) {
    return userData && Object.keys(userData).length > 0 ? 'Recently' : 'Unknown';
  }

  try {
    const now = new Date();
    const changeDate = new Date(passwordChangedAt);
    
    if (isNaN(changeDate.getTime())) {
      return 'Recently';
    }
    
    const diffTime = Math.abs(now - changeDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return '1 day ago';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
    }
    if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      return `${months} month${months > 1 ? 's' : ''} ago`;
    }
    const years = Math.floor(diffDays / 365);
    return `${years} year${years > 1 ? 's' : ''} ago`;
  } catch (error) {
    return 'Recently';
  }
};

export default function SuperAdminSettings() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [successModal, setSuccessModal] = useState({ isVisible: false, message: '' });
  const [showSecureEmailModal, setShowSecureEmailModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showTwoFAModal, setShowTwoFAModal] = useState(false);
  const [twofaEnabled, setTwofaEnabled] = useState(false);

  // Load current user data
  useEffect(() => {
    const loadUserData = async () => {
      try {
        // Check authentication status first
        if (!checkAuthStatus('superadmin')) {
          return;
        }

        const superAdminData = localStorage.getItem('superAdminData');
        let superadminId = null;
        
        if (superAdminData) {
          const parsedData = JSON.parse(superAdminData);
          superadminId = parsedData.id;
        }
        
        if (!superadminId) {
          clearAuthAndRedirect('superadmin');
          return;
        }

        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
        const response = await makeAuthenticatedRequest(
          `${baseUrl}/api/superadmin/auth/profile/${superadminId}`,
          { method: 'GET' },
          'superadmin'
        );

        if (!response) {
          // Authentication utility handled redirect
          return;
        }

        const data = await response.json();

        if (response.ok) {
          setCurrentUser(data);
          setTwofaEnabled(data.twofa_enabled || false);
        } else {
          showSuccessModal(data.error || 'Failed to load user data');
        }
      } catch (error) {
        console.error('Error loading user data:', error);
        showAuthError('Failed to load user data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, []);

  // Success modal handlers
  const showSuccessModal = (message) => {
    setSuccessModal({ isVisible: true, message });
  };

  const closeSuccessModal = () => {
    setSuccessModal({ isVisible: false, message: '' });
  };

  // Handle successful updates
  const handleUpdateSuccess = () => {
    // Reload user data after successful update
    const loadUserData = async () => {
      try {
        const superAdminData = localStorage.getItem('superAdminData');
        let superadminId = null;
        
        if (superAdminData) {
          const parsedData = JSON.parse(superAdminData);
          superadminId = parsedData.id;
        }

        if (!superadminId) {
          clearAuthAndRedirect('superadmin');
          return;
        }

        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
        const response = await makeAuthenticatedRequest(
          `${baseUrl}/api/superadmin/auth/profile/${superadminId}`,
          { method: 'GET' },
          'superadmin'
        );

        if (!response) {
          // Authentication utility handled redirect
          return;
        }

        const data = await response.json();

        if (response.ok) {
          setCurrentUser(data);
          setTwofaEnabled(data.twofa_enabled || false);
        }
      } catch (error) {
        console.error('Failed to reload user data:', error);
        showAuthError('Failed to reload user data. Please refresh the page.');
      }
    };

    loadUserData();
  };

  const handleEmailSuccess = () => {
    showSuccessModal('Email has been successfully changed.');
    handleUpdateSuccess();
  };

  const handlePasswordSuccess = () => {
    handleUpdateSuccess();
  };

  const handleTwoFASuccess = () => {
    handleUpdateSuccess();
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Loading settings...</p>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className={styles.mainArea}>
        <div className={styles.header}>
          <h1>Settings</h1>
        </div>
        <div className={`${styles.message} ${styles.error}`}>
          Failed to load user data. Please refresh the page.
        </div>
      </div>
    );
  }

  return (
    <div className={styles.mainArea}>
      {/* Success Modal */}
      <SuccessModal
        message={successModal.message}
        isVisible={successModal.isVisible}
        onClose={closeSuccessModal}
        type="success"
      />

      {/* Header */}
      <div className={styles.header}>
        <h1>Settings</h1>
      </div>

      {/* Profile Section */}
      <div className={styles.settingsGrid}>
        {/* Email Address Panel */}
        <div className={styles.settingsPanel}>
          <div className={styles.panelHeader}>
            <div className={styles.panelIcon}>
              <FaEnvelope />
            </div>
            <div className={styles.panelTitle}>
              <h2>Email Address</h2>
              <p>Update your email address for notifications and login</p>
            </div>
            <button 
              className={styles.editButton}
              onClick={() => setShowSecureEmailModal(true)}
            >
              Edit
            </button>
          </div>

          <div className={styles.panelContent}>
            <div className={styles.displayContent}>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Current Email</label>
                <div className={styles.displayValue}>
                  {currentUser?.email || currentUser?.username || 'Not specified'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Password & Security Panel */}
        <div className={styles.settingsPanel}>
          <div className={styles.panelHeader}>
            <div className={styles.panelIcon}>
              <FaLock />
            </div>
            <div className={styles.panelTitle}>
              <h2>Password & Security</h2>
              <p>Change your password and manage security settings</p>
            </div>
            <button 
              className={styles.editButton}
              onClick={() => setShowPasswordModal(true)}
            >
              Change
            </button>
          </div>

          <div className={styles.panelContent}>
            <div className={styles.displayContent}>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Password Status</label>
                <div className={styles.passwordInfo}>
                  <p className={styles.infoText}>
                    Last changed: <strong>{getPasswordChangeTime(currentUser)}</strong>
                  </p>
                  <p className={styles.infoText}>
                    For security, we recommend changing your password regularly.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Two-Factor Authentication Panel - Separate Row */}
      <div className={styles.twoFAContainer}>
        <div className={styles.settingsPanel}>
          <div className={styles.panelHeader}>
            <div className={styles.panelIcon}>
              <FaShieldAlt />
            </div>
            <div className={styles.panelTitle}>
              <h2>Two-Factor Authentication</h2>
              <p>Add an extra layer of security to your account</p>
            </div>
            <button 
              className={styles.editButton}
              onClick={() => setShowTwoFAModal(true)}
            >
              {twofaEnabled ? 'Manage' : 'Setup'}
            </button>
          </div>

          <div className={styles.panelContent}>
            <div className={styles.displayContent}>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>2FA Status</label>
                <div className={styles.passwordInfo}>
                  <p className={styles.infoText}>
                    Status: <strong>{twofaEnabled ? 'Enabled' : 'Disabled'}</strong>
                  </p>
                  <p className={styles.infoText}>
                    {twofaEnabled 
                      ? 'Your account is protected with two-factor authentication.'
                      : 'Add an authenticator app for enhanced security.'
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Secure Email Change Modal */}
      <SecureEmailChangeModal
        isOpen={showSecureEmailModal}
        onClose={() => setShowSecureEmailModal(false)}
        onSuccess={handleEmailSuccess}
        currentUser={currentUser}
      />

      {/* Password Change Modal */}
      <PasswordChangeModal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        onSuccess={handlePasswordSuccess}
        currentUser={currentUser}
      />

      {/* Two-Factor Authentication Modal */}
      <TwoFAModal
        isOpen={showTwoFAModal}
        onClose={() => setShowTwoFAModal(false)}
        onSuccess={handleTwoFASuccess}
        currentUser={currentUser}
      />
    </div>
  );
}