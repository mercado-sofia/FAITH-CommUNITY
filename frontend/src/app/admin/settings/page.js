'use client';

import { useState, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { FaLock, FaBuilding } from 'react-icons/fa';
import { useAdminProfile } from '../hooks/useAdminProfile';
import { selectCurrentAdmin, updateAdminEmail } from '@/rtk/superadmin/adminSlice';
import { SkeletonLoader, SuccessModal } from '../components';
import { PasswordChangeModal, SecureEmailChangeModal } from './ProfileSection';
import { makeAuthenticatedRequest, clearAuthAndRedirect, showAuthError } from '@/utils/adminAuth';
import styles from './AdminSettings.module.css';

// Utility function for password change time
const getPasswordChangeTime = (effectiveAdminData) => {
  const passwordChangedAt = effectiveAdminData?.password_changed_at || 
                           effectiveAdminData?.passwordChangedAt ||
                           effectiveAdminData?.created_at ||
                           effectiveAdminData?.createdAt;
  
  if (!passwordChangedAt) {
    return effectiveAdminData && Object.keys(effectiveAdminData).length > 0 ? 'Recently' : 'Unknown';
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

export default function SettingsPage() {
  const dispatch = useDispatch();
  const currentAdmin = useSelector(selectCurrentAdmin);
  
  const { admin: adminFromApi, isLoading: isLoadingAdmin, error: apiError, mutate: refreshAdmin } = useAdminProfile();

  const effectiveAdminData = useMemo(() => {
    return adminFromApi ? {
      ...adminFromApi,
      email: adminFromApi.email || currentAdmin?.email || ''
    } : currentAdmin;
  }, [adminFromApi, currentAdmin]);

  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showSecureEmailModal, setShowSecureEmailModal] = useState(false);
  
  // Email profile state
  const [emailEditData, setEmailEditData] = useState(null);
  const [emailErrors, setEmailErrors] = useState({});
  const [emailSaving, setEmailSaving] = useState(false);

  const handlePasswordSuccess = () => {
    setSuccessMessage('Password changed successfully!');
    setShowSuccessModal(true);
    refreshAdmin();
  };

  const handleSecureEmailSuccess = (newEmail) => {
    setEmailEditData({ email: newEmail });
    setShowSecureEmailModal(false);
    setSuccessMessage('Email has been successfully changed.');
    setShowSuccessModal(true);
    refreshAdmin();
  };

  const handleEmailEditClick = () => {
    setShowSecureEmailModal(true);
  };

  const handleEmailEditClose = () => {
    setShowSecureEmailModal(false);
  };

  const handleEmailSave = async (emailData) => {
    setEmailSaving(true);
    setEmailErrors({});
    
    try {
      // Validate required fields
      const errors = {};
      if (!emailData.email?.trim()) {
        errors.email = 'Email is required';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailData.email)) {
        errors.email = 'Please enter a valid email address';
      }
      
      if (Object.keys(errors).length > 0) {
        setEmailErrors(errors);
        setEmailSaving(false);
        return;
      }

      // Check if email has changed to update Redux
      const emailChanged = emailData.email !== effectiveAdminData?.email;
      
      // Use authenticated request utility
      const response = await makeAuthenticatedRequest(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/admin/profile`,
        {
          method: 'PUT',
          body: JSON.stringify({
            email: emailData.email.trim(),
            password: emailData.password || null
          })
        },
        'admin'
      );

      if (!response) {
        // Authentication utility handled redirect
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to update email address');
      }

      // Update Redux if email changed
      if (emailChanged) {
        dispatch(updateAdminEmail({ email: emailData.email.trim() }));
      }

      setSuccessMessage('Email address updated successfully!');
      setShowSuccessModal(true);
      refreshAdmin();
    } catch (error) {
      console.error('Error updating email address:', error);
      
      // Show user-friendly error message
      if (error.message.includes('session has expired') || error.message.includes('token')) {
        showAuthError('Your session has expired. Please log in again.');
        clearAuthAndRedirect('admin');
        return;
      }
      
      setEmailErrors({ 
        general: error.message || 'Failed to update email address. Please try again.' 
      });
    } finally {
      setEmailSaving(false);
    }
  };

  return (
    <div className={styles.mainArea}>
      <div className={styles.header}>
        <h1>Settings</h1>
      </div>

      {isLoadingAdmin && (
        <SkeletonLoader type="form" count={2} />
      )}

      {apiError && (
        <div className={`${styles.message} ${styles.error}`}>
          <strong>Error loading admin data:</strong> {apiError?.data?.message || apiError?.message || 'Unknown error'}
          <button 
            onClick={() => refreshAdmin()} 
            className={styles.retryButton}
          >
            Retry
          </button>
        </div>
      )}

      <div className={styles.settingsGrid}>
        {/* Email Profile Panel */}
        <div className={styles.settingsPanel}>
          <div className={styles.panelHeader}>
            <div className={styles.panelIcon}>
              <FaBuilding />
            </div>
            <div className={styles.panelTitle}>
              <h2>Email Address</h2>
              <p>Your email address for this account.</p>
            </div>
            <button
              className={styles.editButton}
              onClick={handleEmailEditClick}
            >
              Edit
            </button>
          </div>

          <div className={styles.panelContent}>
            <div className={styles.displayContent}>
              <div className={styles.orgProfileFieldGroup}>
                <label className={styles.orgProfileLabel}>Email Address</label>
                <div className={styles.orgProfileDisplayValue}>
                  {effectiveAdminData?.email ? (
                    <div className={styles.emailDisplay}>
                      {effectiveAdminData.email}
                    </div>
                  ) : (
                    'Not specified'
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Password Settings Panel */}
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
                    Last changed: <strong>{getPasswordChangeTime(effectiveAdminData)}</strong>
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

      {/* Password Change Modal */}
      <PasswordChangeModal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        onSuccess={handlePasswordSuccess}
      />

      {/* Secure Email Change Modal */}
      <SecureEmailChangeModal
        isOpen={showSecureEmailModal}
        onClose={handleEmailEditClose}
        onSuccess={handleSecureEmailSuccess}
        currentEmail={effectiveAdminData?.email}
      />
      
      {/* Success Modal */}
      <SuccessModal
        message={successMessage}
        isVisible={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        type="success"
      />
    </div>
  );
}