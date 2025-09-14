'use client'

import { useState } from 'react';
import { FaBuilding } from 'react-icons/fa';
import styles from '../adminSettings.module.css';
import OrgProfileEditModal from './OrgProfileEditModal';

export default function OrgProfileSection({ 
  orgData, 
  onSave, 
  editData,
  setEditData,
  errors,
  saving
}) {
  const [showEditModal, setShowEditModal] = useState(false);

  const handleEditClick = () => {
    setShowEditModal(true);
  };

  const handleEditClose = () => {
    setShowEditModal(false);
  };

  const handleEditSave = async (emailData) => {
    // Call the onSave function directly - the modal will handle password confirmation internally
    await onSave(emailData);
    setShowEditModal(false);
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

      {/* Organization Profile Edit Modal */}
      <OrgProfileEditModal
        isOpen={showEditModal}
        onClose={handleEditClose}
        onSave={handleEditSave}
        orgData={orgData}
        errors={errors}
        saving={saving}
      />
    </div>
  );
}