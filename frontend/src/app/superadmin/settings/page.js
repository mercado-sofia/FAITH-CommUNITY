'use client';

import { useState, useEffect } from 'react';
import { FaEnvelope, FaLock } from 'react-icons/fa';
import styles from './settings.module.css';
import EmailChangeModal from './ProfileSection/EmailChangeModal';
import PasswordChangeModal from './ProfileSection/PasswordChangeModal';

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
  const [notification, setNotification] = useState(null);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  // Load current user data
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const token = localStorage.getItem('superAdminToken');
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
        if (!token) {
          showNotification('Authentication required. Please log in again.', 'error');
          return;
        }

        // Get superadmin ID from token or localStorage
        const superAdminData = localStorage.getItem('superAdminData');
        let superadminId = null;
        
        if (superAdminData) {
          const parsedData = JSON.parse(superAdminData);
          superadminId = parsedData.id;
        }
        
        if (!superadminId) {
          showNotification('Unable to get superadmin ID. Please log in again.', 'error');
          return;
        }

        const response = await fetch(`${baseUrl}/api/superadmin/auth/profile/${superadminId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        const data = await response.json();

        if (response.ok) {
          setCurrentUser(data);
        } else {
          showNotification(data.error || 'Failed to load user data', 'error');
        }
      } catch (error) {
        showNotification('Failed to load user data', 'error');
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, []);

  // Show notification
  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  // Handle successful updates
  const handleUpdateSuccess = () => {
    // Reload user data after successful update
    const loadUserData = async () => {
      try {
        const token = localStorage.getItem('superAdminToken');
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
        
        const superAdminData = localStorage.getItem('superAdminData');
        let superadminId = null;
        
        if (superAdminData) {
          const parsedData = JSON.parse(superAdminData);
          superadminId = parsedData.id;
        }

        const response = await fetch(`${baseUrl}/api/superadmin/auth/profile/${superadminId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        const data = await response.json();

        if (response.ok) {
          setCurrentUser(data);
        }
      } catch (error) {
        console.error('Failed to reload user data:', error);
      }
    };

    loadUserData();
  };

  const handleEmailSuccess = () => {
    handleUpdateSuccess();
  };

  const handlePasswordSuccess = () => {
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
      {/* Notification */}
      {notification && (
        <div className={`${styles.message} ${styles[notification.type]}`}>
          {notification.message}
        </div>
      )}

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
              onClick={() => setShowEmailModal(true)}
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

      {/* Email Change Modal */}
      <EmailChangeModal
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
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
    </div>
  );
}