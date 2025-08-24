'use client'

import { useState } from 'react';
import { FaBuilding } from 'react-icons/fa';
import styles from '../adminSettings.module.css';
import PasswordConfirmModal from './PasswordConfirmModal';
import OrgProfileEditModal from './OrgProfileEditModal';

export default function OrgProfileSection({ 
  orgData, 
  onEdit, 
  isEditing, 
  onSave, 
  onCancel,
  editData,
  setEditData,
  errors,
  saving
}) {
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [localEditData, setLocalEditData] = useState(null);

  const handleEditClick = () => {
    setShowEditModal(true);
  };

  const handleEditClose = () => {
    setShowEditModal(false);
  };

  const handleEditSave = async (editData) => {
    // Check if there are actual changes
    const hasChanges = editData.org !== orgData?.org || 
                      editData.orgName !== orgData?.orgName || 
                      editData.email !== orgData?.email;

    if (hasChanges) {
      // Store the edit data for later use
      setLocalEditData(editData);
      // Close the edit modal first
      setShowEditModal(false);
      // Then show password confirmation modal
      setShowPasswordModal(true);
    } else {
      // No changes, just close the edit modal
      setShowEditModal(false);
    }
  };



  const handleSaveWithPassword = async (password = null) => {
    try {
      setIsVerifying(true);
      
      // If password is provided, verify it first
      if (password) {
        const verifyResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/admin/profile/verify-password-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
          },
          body: JSON.stringify({ password })
        });

        if (!verifyResponse.ok) {
          const errorData = await verifyResponse.json().catch(() => ({}));
          if (verifyResponse.status === 401) {
            // Password verification failed - return error instead of throwing
            return { error: 'Incorrect password. Please try again.' };
          } else {
            return { error: errorData.message || 'Password verification failed' };
          }
        }
      }

      // Call the onSave function with the updated data including password
      await onSave({
        ...localEditData,
        password: password || undefined
      });
      
      setShowEditModal(false);
      setShowPasswordModal(false);
      return { success: true };
    } catch (error) {
      console.error('Failed to save organization profile:', error);
      return { error: error.message || 'Failed to save organization profile' };
    } finally {
      setIsVerifying(false);
    }
  };

  const handlePasswordConfirm = async (password) => {
    const result = await handleSaveWithPassword(password);
    
    if (result.error) {
      // Return the error so the modal can display it
      return Promise.reject(new Error(result.error));
    }
    
    // Success - no need to do anything else
    return result;
  };





  return (
    <div className={styles.settingsPanel}>
      <div className={styles.panelHeader}>
        <div className={styles.panelIcon}>
          <FaBuilding />
        </div>
        <div className={styles.panelTitle}>
          <h2>Organization Profile</h2>
          <p>Your organization's basic information, identity, and email address</p>
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
            <label className={styles.orgProfileLabel}>Organization</label>
            <div className={styles.orgProfileDisplayValue}>
              {orgData?.org ? (
                <div className={styles.orgAcronym}>
                  {orgData.org}
                </div>
              ) : (
                'Not specified'
              )}
            </div>
          </div>

          <div className={styles.orgProfileFieldGroup}>
            <label className={styles.orgProfileLabel}>Organization Name</label>
            <div className={styles.orgProfileDisplayValue}>
              {orgData?.orgName || 'Not specified'}
            </div>
          </div>

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

      {/* Password Confirmation Modal */}
      <PasswordConfirmModal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        onConfirm={handlePasswordConfirm}
        isVerifying={isVerifying}
      />
    </div>
  );
}
