'use client'

import { useState } from 'react';
import { FaBuilding } from 'react-icons/fa';
import styles from '../adminSettings.module.css';
import SecureEmailChangeModal from './SecureEmailChangeModal';

export default function OrgProfileSection({ 
  orgData, 
  onSave, 
  editData,
  setEditData,
  errors,
  saving,
  onSecureEmailSuccess
}) {
  const [showSecureEmailModal, setShowSecureEmailModal] = useState(false);

  const handleEditClick = () => {
    setShowSecureEmailModal(true);
  };

  const handleEditClose = () => {
    setShowSecureEmailModal(false);
  };

  const handleEditSave = async (emailData) => {
    // Call the onSave function directly - the modal will handle password confirmation internally
    await onSave(emailData);
  };

  const handleSecureEmailSuccess = (newEmail) => {
    setEditData({ email: newEmail });
    setShowSecureEmailModal(false);
    // Call parent success handler if provided
    if (onSecureEmailSuccess) {
      onSecureEmailSuccess(newEmail);
    }
  };

  return (
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
          onClick={handleEditClick}
        >
          Edit
        </button>
      </div>

      <div className={styles.panelContent}>
        <div className={styles.displayContent}>
          <div className={styles.orgProfileFieldGroup}>
            <label className={styles.orgProfileLabel}>Email Address</label>
            <div className={styles.orgProfileDisplayValue}>
              {orgData?.email ? (
                <div className={styles.emailDisplay}>
                  {orgData.email}
                </div>
              ) : (
                'Not specified'
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Secure Email Change Modal */}
      <SecureEmailChangeModal
        isOpen={showSecureEmailModal}
        onClose={handleEditClose}
        onSuccess={handleSecureEmailSuccess}
        currentEmail={orgData?.email}
      />
    </div>
  );
}