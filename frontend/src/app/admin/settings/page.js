'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { FaEnvelope, FaLock } from 'react-icons/fa';
import { useAdminById } from '../../../hooks/useAdminData';
import { selectCurrentAdmin, updateAdminEmail } from '../../../rtk/superadmin/adminSlice';
import SkeletonLoader from '../components/SkeletonLoader';
import EmailEditModal from './components/EmailEditModal';
import PasswordChangeModal from './components/PasswordChangeModal';
import styles from './adminSettings.module.css';

// Utility function for password change time
const getPasswordChangeTime = (effectiveAdminData) => {
  const passwordChangedAt = effectiveAdminData?.password_changed_at || 
                           effectiveAdminData?.passwordChangedAt ||
                           effectiveAdminData?.updated_at ||
                           effectiveAdminData?.updatedAt;
  
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
  
  const { admin: adminFromApi, isLoading: isLoadingAdmin, error: apiError, mutate: refreshAdmin } = useAdminById(currentAdmin?.id);

  const effectiveAdminData = useMemo(() => {
    return adminFromApi ? {
      ...adminFromApi,
      email: adminFromApi.email || currentAdmin?.email || ''
    } : currentAdmin;
  }, [adminFromApi, currentAdmin]);

  const [message, setMessage] = useState({ text: '', type: '' });
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  const handleEmailSuccess = (newEmail) => {
    // Update Redux if email changed
    if (newEmail !== effectiveAdminData?.email) {
      dispatch(updateAdminEmail({ email: newEmail }));
    }
    
    setMessage({ text: 'Email updated successfully!', type: 'success' });
    setTimeout(() => setMessage({ text: '', type: '' }), 3000);
    refreshAdmin();
  };

  const handlePasswordSuccess = () => {
    setMessage({ text: 'Password changed successfully!', type: 'success' });
    setTimeout(() => setMessage({ text: '', type: '' }), 3000);
    refreshAdmin();
  };

  return (
    <div className={styles.mainArea}>
      <div className={styles.header}>
        <h1>Settings</h1>
      </div>

      {message.text && (
        <div className={`${styles.message} ${styles[message.type]}`}>
          {message.text}
        </div>
      )}

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
        {/* Email Settings Panel */}
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
                <div className={styles.displayValue}>{effectiveAdminData?.email || 'No email set'}</div>
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

      {/* Email Edit Modal */}
      <EmailEditModal
        isOpen={showEmailModal}
        currentEmail={effectiveAdminData?.email}
        adminId={currentAdmin?.id}
        onClose={() => setShowEmailModal(false)}
        onSuccess={handleEmailSuccess}
      />

      {/* Password Change Modal */}
      <PasswordChangeModal
        isOpen={showPasswordModal}
        adminId={currentAdmin?.id}
        onClose={() => setShowPasswordModal(false)}
        onSuccess={handlePasswordSuccess}
      />
    </div>
  );
}